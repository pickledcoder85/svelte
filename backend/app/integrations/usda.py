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
