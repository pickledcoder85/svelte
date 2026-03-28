from backend.app.config import get_settings
from backend.app.integrations.usda import UsdaSearchError, search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository


async def search_standardized_foods(
    query: str, repository: SQLiteRepository
) -> list[FoodItem]:
    settings = get_settings()
    if not settings.usda_api_key:
        return repository.search_foods(query)

    try:
        return await search_usda_foods(query, settings.usda_api_key)
    except UsdaSearchError:
        return repository.search_foods(query)
