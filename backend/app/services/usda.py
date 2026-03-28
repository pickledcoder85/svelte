from backend.app.config import get_settings
from backend.app.integrations.usda import UsdaSearchError, search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository


async def search_standardized_foods(
    query: str,
    repository: SQLiteRepository,
    user_id: str | None = None,
) -> list[FoodItem]:
    favorite_ids: set[str] = set()
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
        return sorted(local_foods, key=lambda food: (not food.favorite, food.name.lower(), food.id))

    settings = get_settings()
    if not settings.usda_api_key:
        return local_foods

    try:
        usda_foods = await search_usda_foods(query, settings.usda_api_key)
    except UsdaSearchError:
        return local_foods

    if user_id is not None:
        usda_foods = [
            food.model_copy(update={"favorite": food.id in favorite_ids})
            for food in usda_foods
        ]
        return sorted(usda_foods, key=lambda food: (not food.favorite, food.name.lower(), food.id))
    return usda_foods
