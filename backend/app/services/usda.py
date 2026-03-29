from backend.app.config import get_settings
from backend.app.integrations.usda import UsdaSearchError, search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository


async def search_standardized_foods(
    query: str,
    repository: SQLiteRepository,
    user_id: str | None = None,
) -> list[FoodItem]:
    if user_id is not None:
        favorite_ids = {
            payload["entity_id"]
            for payload in repository.list_saved_favorites(user_id, entity_type="food")
        }
        local_foods = [
            food.model_copy(update={"favorite": food.id in favorite_ids})
            for food in repository.search_foods(query)
        ]
        if local_foods:
            return _sort_foods(local_foods)

        settings = get_settings()
        if not settings.usda_api_key:
            return []

        try:
            usda_foods = await search_usda_foods(query, settings.usda_api_key)
        except UsdaSearchError:
            return []

        persisted_foods = [repository.save_food_item(food) for food in usda_foods]
        return _sort_foods(
            [food.model_copy(update={"favorite": food.id in favorite_ids}) for food in persisted_foods]
        )

    local_foods = repository.search_foods(query)
    if local_foods:
        return _sort_foods(local_foods)

    settings = get_settings()
    if not settings.usda_api_key:
        return []

    try:
        usda_foods = await search_usda_foods(query, settings.usda_api_key)
    except UsdaSearchError:
        return []

    persisted_foods = [repository.save_food_item(food) for food in usda_foods]
    return _sort_foods(persisted_foods)


def _matches_food_query(food: FoodItem, query: str) -> bool:
    normalized = query.strip().lower()
    if not normalized:
        return True
    return normalized in food.name.lower() or (food.brand is not None and normalized in food.brand.lower())


def _sort_foods(foods: list[FoodItem]) -> list[FoodItem]:
    return sorted(foods, key=lambda food: (not food.favorite, food.name.lower(), food.id))
