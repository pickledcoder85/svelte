from __future__ import annotations

from typing import Any

import httpx

from backend.app.models.nutrition import FoodItem, MacroTargets


USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


class UsdaSearchError(RuntimeError):
    pass


def _nutrient_value(nutrients: list[dict[str, Any]] | None, nutrient_name: str) -> float:
    if not nutrients:
        return 0.0

    for nutrient in nutrients:
        if nutrient.get("nutrientName") == nutrient_name:
            return float(nutrient.get("value", 0))

    return 0.0


def parse_usda_search_response(payload: dict[str, Any]) -> list[FoodItem]:
    foods = payload.get("foods", [])
    return [
        FoodItem(
            id=f"usda-{food['fdcId']}",
            name=food["description"],
            brand=food.get("brandOwner"),
            calories=_nutrient_value(food.get("foodNutrients"), "Energy"),
            serving_size=float(food.get("servingSize") or 100),
            serving_unit=food.get("servingSizeUnit") or "g",
            macros=MacroTargets(
                protein=_nutrient_value(food.get("foodNutrients"), "Protein"),
                carbs=_nutrient_value(
                    food.get("foodNutrients"), "Carbohydrate, by difference"
                ),
                fat=_nutrient_value(food.get("foodNutrients"), "Total lipid (fat)"),
            ),
            source="USDA",
        )
        for food in foods
    ]


async def search_usda_foods(
    query: str,
    api_key: str,
    client: httpx.AsyncClient | None = None,
) -> list[FoodItem]:
    owns_client = client is None
    try:
        async with (
            httpx.AsyncClient(timeout=15.0) if owns_client else _client_context(client)
        ) as http_client:
            response = await http_client.get(
                USDA_SEARCH_URL,
                params={"query": query, "pageSize": 10, "api_key": api_key},
            )
    except httpx.RequestError as exc:  # pragma: no cover - network error path
        raise UsdaSearchError("USDA search request failed.") from exc

    if not response.is_success:
        raise UsdaSearchError(f"USDA search failed with status {response.status_code}")

    payload = response.json()
    if not isinstance(payload, dict):
        raise UsdaSearchError("USDA search returned an invalid payload.")
    return parse_usda_search_response(payload)


class _client_context:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def __aenter__(self) -> httpx.AsyncClient:
        return self._client

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


def _per_serving(value_per_100: float, serving_size: float | None, unit: str | None) -> float:
    if serving_size and (unit or "").lower() in ("g", "grm", "ml", "mlt"):
        return round(value_per_100 * serving_size / 100, 1)
    return round(value_per_100, 1)


def branded_food_to_label(food: dict[str, Any], barcode: str) -> dict[str, Any] | None:
    """A USDA Branded food in the label-scan shape. Search results give nutrients per 100 g/ml,
    so they are converted to the product's serving size."""
    name = (food.get("description") or "").strip()
    if not name:
        return None
    nutrients = food.get("foodNutrients")
    serving_size = food.get("servingSize")
    unit = food.get("servingSizeUnit")
    calories = _per_serving(_nutrient_value(nutrients, "Energy"), serving_size, unit)
    serving_text = f"{serving_size:g} {unit}" if serving_size and unit else "100 g"
    household = (food.get("householdServingFullText") or "").strip()
    return {
        "label_text": f"{name} ({household or serving_text}) from USDA FoodData Central",
        "product_name": name.title() if name.isupper() else name,
        "brand_name": food.get("brandName") or food.get("brandOwner"),
        "serving_size": f"{household} ({serving_text})" if household else serving_text,
        "calories": calories,
        "macros": {
            "protein": _per_serving(_nutrient_value(nutrients, "Protein"), serving_size, unit),
            "carbs": _per_serving(_nutrient_value(nutrients, "Carbohydrate, by difference"), serving_size, unit),
            "fat": _per_serving(_nutrient_value(nutrients, "Total lipid (fat)"), serving_size, unit),
        },
        "multiple_variants_detected": False,
        "variants": [],
        "confidence": 0.85,
        "barcode": barcode,
        "data_source": "usda",
        "attribution": "Data from USDA FoodData Central",
    }


async def find_branded_food_by_barcode(
    codes: list[str], api_key: str, client: httpx.AsyncClient
) -> dict[str, Any] | None:
    """The first USDA Branded food whose gtinUpc matches one of the given code forms."""
    wanted = {code.lstrip("0") for code in codes}
    for code in codes:
        try:
            response = await client.get(
                USDA_SEARCH_URL,
                params={"query": code, "dataType": "Branded", "pageSize": 5, "api_key": api_key},
                timeout=15.0,
            )
        except httpx.RequestError as exc:
            raise UsdaSearchError("USDA search request failed.") from exc
        if not response.is_success:
            raise UsdaSearchError(f"USDA search failed with status {response.status_code}")
        for food in response.json().get("foods", []):
            if str(food.get("gtinUpc", "")).lstrip("0") in wanted:
                return food
    return None
