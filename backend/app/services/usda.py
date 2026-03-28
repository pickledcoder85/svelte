from typing import Any

import httpx

from backend.app.config import get_settings
from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.repositories.sqlite import SQLiteRepository


USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


def _nutrient_value(nutrients: list[dict[str, Any]] | None, nutrient_name: str) -> float:
    if not nutrients:
        return 0.0

    for nutrient in nutrients:
        if nutrient.get("nutrientName") == nutrient_name:
            return float(nutrient.get("value", 0))

    return 0.0


async def search_foods(query: str) -> list[FoodItem]:
    settings = get_settings()

    if not settings.usda_api_key:
        repository = SQLiteRepository(settings.database_path)
        try:
            return repository.search_foods(query)
        finally:
            repository.close()

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            USDA_SEARCH_URL,
            params={
                "query": query,
                "pageSize": 10,
                "api_key": settings.usda_api_key,
            },
        )
        response.raise_for_status()

    foods = response.json().get("foods", [])

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


async def search_foods_with_fallback(query: str, repository: SQLiteRepository) -> list[FoodItem]:
    settings = get_settings()
    if not settings.usda_api_key:
        return repository.search_foods(query)
    try:
        return await search_foods(query)
    except Exception:
        return repository.search_foods(query)
