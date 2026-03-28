from backend.app.models.meals import FavoriteMealTemplateRequest, MealTemplate
from backend.app.models.recipes import FavoriteRecipeRequest, RecipeDefinition
from backend.app.repositories.sqlite import SQLiteRepository


def set_meal_template_favorite(
    repository: SQLiteRepository,
    meal_template_id: str,
    payload: FavoriteMealTemplateRequest,
) -> MealTemplate | None:
    meal_template = repository.get_meal_template(meal_template_id)
    if meal_template is None:
        return None
    meal_template.favorite = payload.favorite
    return repository.save_meal_template(meal_template)


def set_recipe_favorite(
    repository: SQLiteRepository,
    recipe_id: str,
    payload: FavoriteRecipeRequest,
) -> RecipeDefinition | None:
    recipe = repository.get_recipe(recipe_id)
    if recipe is None:
        return None
    recipe.favorite = payload.favorite
    return repository.save_recipe(recipe)


def list_favorite_meal_templates(repository: SQLiteRepository) -> list[MealTemplate]:
    return [meal_template for meal_template in repository.list_meal_templates() if meal_template.favorite]


def list_favorite_recipes(repository: SQLiteRepository) -> list[RecipeDefinition]:
    return [recipe for recipe in repository.list_recipes() if recipe.favorite]
