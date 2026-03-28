from uuid import uuid4

from backend.app.models.recipes import RecipeDefinition, RecipeImportRequest
from backend.app.repositories.sqlite import SQLiteRepository


def import_recipe(
    repository: SQLiteRepository, payload: RecipeImportRequest
) -> RecipeDefinition:
    recipe = RecipeDefinition(
        id=str(uuid4()),
        title=payload.title,
        steps=payload.steps,
        assets=payload.assets,
        ingredients=[],
        default_yield=2,
        favorite=True,
    )
    return repository.save_recipe(recipe)


def list_recipes(repository: SQLiteRepository) -> list[RecipeDefinition]:
    return repository.list_recipes()


def get_recipe(repository: SQLiteRepository, recipe_id: str) -> RecipeDefinition | None:
    return repository.get_recipe(recipe_id)


def scale_recipe(recipe: RecipeDefinition, factor: float) -> RecipeDefinition:
    return RecipeDefinition(
        id=recipe.id,
        title=recipe.title,
        steps=list(recipe.steps),
        assets=list(recipe.assets),
        ingredients=[
            ingredient.model_copy(update={"grams": round(ingredient.grams * factor, 1)})
            for ingredient in recipe.ingredients
        ],
        default_yield=round(recipe.default_yield * factor, 1),
        favorite=recipe.favorite,
    )
