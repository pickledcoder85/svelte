from __future__ import annotations

from typing import Any

import httpx

from backend.app.models.nutrition import FoodItem, FoodPortion, MacroTargets
from backend.app.services.servings import parse_serving_text


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


_WEIGHT_UNITS = {"g": "g", "grm": "g", "ml": "ml", "mlt": "ml"}


def _search_food_to_item(food: dict[str, Any]) -> FoodItem:
    """One USDA search result. Search nutrients are per 100 g (or ml): branded foods with a
    gram serving are converted to that serving; everything else stays per 100 g. Values keep 3
    decimals so tiny servings (0.5 g of a spice) don't lose precision when scaled up."""
    nutrients = food.get("foodNutrients")
    per_100 = {
        "calories": _nutrient_value(nutrients, "Energy"),
        "protein": _nutrient_value(nutrients, "Protein"),
        "carbs": _nutrient_value(nutrients, "Carbohydrate, by difference"),
        "fat": _nutrient_value(nutrients, "Total lipid (fat)"),
    }
    size = food.get("servingSize")
    basis = _WEIGHT_UNITS.get(str(food.get("servingSizeUnit") or "").lower())
    household = (food.get("householdServingFullText") or "").strip()
    if size and basis:
        grams = float(size)
        factor = grams / 100
        amount_text = f"{grams:g} {basis}"
        serving_text = f"{household} ({amount_text})" if household else amount_text
        parsed = parse_serving_text(household) if household else None
        serving_size, serving_unit = (parsed.amount, parsed.unit) if parsed else (grams, basis)
    else:
        grams, factor, basis = 100.0, 1.0, "g"
        serving_text = "100 g"
        serving_size, serving_unit = 100.0, "g"

    portions = [
        FoodPortion(label=str(measure.get("disseminationText")).strip(), grams=float(measure["gramWeight"]))
        for measure in food.get("foodMeasures") or []
        if measure.get("gramWeight")
        and float(measure["gramWeight"]) > 0
        and str(measure.get("disseminationText") or "").strip()
        and "not specified" not in str(measure.get("disseminationText")).lower()
    ]
    return FoodItem(
        id=f"usda-{food['fdcId']}",
        name=food["description"],
        brand=food.get("brandOwner") or food.get("brandName"),
        calories=round(per_100["calories"] * factor, 3),
        serving_size=serving_size,
        serving_unit=serving_unit,
        macros=MacroTargets(
            protein=round(per_100["protein"] * factor, 3),
            carbs=round(per_100["carbs"] * factor, 3),
            fat=round(per_100["fat"] * factor, 3),
        ),
        source="USDA",
        serving_text=serving_text,
        serving_grams=grams,
        serving_basis=basis,
        portions=portions[:6],
    )


def parse_usda_search_response(payload: dict[str, Any]) -> list[FoodItem]:
    return [_search_food_to_item(food) for food in payload.get("foods", [])]


# Generic foods (per 100 g) rather than branded products: for foods seen on a plate.
GENERIC_DATA_TYPES = "Foundation,SR Legacy,Survey (FNDDS)"


async def search_usda_foods(
    query: str,
    api_key: str,
    client: httpx.AsyncClient | None = None,
    data_types: str | None = None,
) -> list[FoodItem]:
    owns_client = client is None
    try:
        async with (
            httpx.AsyncClient(timeout=15.0) if owns_client else _client_context(client)
        ) as http_client:
            response = await http_client.get(
                USDA_SEARCH_URL,
                params={
                    "query": query,
                    "pageSize": 10,
                    "api_key": api_key,
                    **({"dataType": data_types} if data_types else {}),
                },
            )
    except httpx.RequestError as exc:  # pragma: no cover - network error path
        raise UsdaSearchError("USDA search request failed.") from exc

    if not response.is_success:
        raise UsdaSearchError(f"USDA search failed with status {response.status_code}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise UsdaSearchError("USDA search returned an invalid payload.") from exc
    if not isinstance(payload, dict):
        raise UsdaSearchError("USDA search returned an invalid payload.")
    try:
        return parse_usda_search_response(payload)
    except (KeyError, TypeError, ValueError) as exc:
        raise UsdaSearchError("USDA search returned an unexpected food.") from exc


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
        "serving_grams": float(serving_size) if serving_size and _WEIGHT_UNITS.get(str(unit or "").lower()) else None,
        "serving_basis": _WEIGHT_UNITS.get(str(unit or "").lower()),
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
