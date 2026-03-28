from typing import Protocol
from uuid import uuid4

from backend.app.models.recipes import RecipeDefinition, RecipeImportRequest
from backend.app.repositories.sqlite import SQLiteRepository


class RecipeReadRepository(Protocol):
    def save_recipe(self, recipe: RecipeDefinition) -> RecipeDefinition: ...

    def list_recipes(self) -> list[RecipeDefinition]: ...

    def get_recipe(self, recipe_id: str) -> RecipeDefinition | None: ...

    def get_saved_favorite(
        self,
        user_id: str,
        entity_type: str,
        entity_id: str,
    ) -> dict[str, object] | None: ...


def _hydrate_recipe_favorite(
    repository: RecipeReadRepository,
    recipe: RecipeDefinition,
    user_id: str | None,
) -> RecipeDefinition:
    if user_id is None:
        return recipe.model_copy(update={"favorite": False})
    is_favorite = repository.get_saved_favorite(user_id, "recipe", recipe.id) is not None
    return recipe.model_copy(update={"favorite": is_favorite})


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
        favorite=False,
    )
    return repository.save_recipe(recipe)


def list_recipes(
    repository: RecipeReadRepository,
    user_id: str | None = None,
) -> list[RecipeDefinition]:
    return [_hydrate_recipe_favorite(repository, recipe, user_id) for recipe in repository.list_recipes()]


def get_recipe(
    repository: RecipeReadRepository,
    recipe_id: str,
    user_id: str | None = None,
) -> RecipeDefinition | None:
    recipe = repository.get_recipe(recipe_id)
    if recipe is None:
        return None
    return _hydrate_recipe_favorite(repository, recipe, user_id)


def scale_recipe(recipe: RecipeDefinition, factor: float) -> RecipeDefinition:
    return recipe.model_copy(
        update={
            "steps": list(recipe.steps),
            "assets": list(recipe.assets),
            "ingredients": [
                ingredient.model_copy(update={"grams": round(ingredient.grams * factor, 1)})
                for ingredient in recipe.ingredients
            ],
            "default_yield": round(recipe.default_yield * factor, 1),
            "favorite": recipe.favorite,
        }
    )
