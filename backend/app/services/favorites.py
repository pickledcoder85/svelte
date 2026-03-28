from __future__ import annotations

from typing import Protocol

from backend.app.models.favorites import SavedFavorite
from backend.app.models.meals import MealTemplate
from backend.app.models.recipes import RecipeDefinition


class SavedFavoritesStore(Protocol):
    def save_favorite(
        self,
        *,
        user_id: str,
        entity_type: str,
        entity_id: str,
        favorite_id: str | None = None,
    ) -> dict[str, object]: ...

    def get_saved_favorite(
        self,
        user_id: str,
        entity_type: str,
        entity_id: str,
    ) -> dict[str, object] | None: ...

    def list_saved_favorites(
        self,
        user_id: str,
        entity_type: str | None = None,
    ) -> list[dict[str, object]]: ...

    def remove_favorite(self, *, user_id: str, entity_type: str, entity_id: str) -> None: ...


class FavoriteMealTemplateStore(Protocol):
    def get_meal_template(self, meal_template_id: str) -> MealTemplate | None: ...

    def save_meal_template(self, meal_template: MealTemplate) -> MealTemplate: ...


class FavoriteRecipeStore(Protocol):
    def get_recipe(self, recipe_id: str) -> RecipeDefinition | None: ...

    def save_recipe(self, recipe: RecipeDefinition) -> RecipeDefinition: ...


class FavoriteRepository(SavedFavoritesStore, FavoriteMealTemplateStore, FavoriteRecipeStore, Protocol):
    pass


def _saved_favorite(payload: dict[str, object]) -> SavedFavorite:
    return SavedFavorite.model_validate(payload)


def _hydrate_meal_template(
    repository: FavoriteRepository,
    user_id: str,
    meal_template_id: str,
) -> MealTemplate | None:
    meal_template = repository.get_meal_template(meal_template_id)
    if meal_template is None:
        return None
    meal_template.favorite = repository.get_saved_favorite(user_id, "meal_template", meal_template_id) is not None
    return meal_template


def _hydrate_recipe(
    repository: FavoriteRepository,
    user_id: str,
    recipe_id: str,
) -> RecipeDefinition | None:
    recipe = repository.get_recipe(recipe_id)
    if recipe is None:
        return None
    recipe.favorite = repository.get_saved_favorite(user_id, "recipe", recipe_id) is not None
    return recipe


def list_favorite_meal_templates(
    repository: FavoriteRepository,
    user_id: str,
) -> list[MealTemplate]:
    favorites = [
        _saved_favorite(payload)
        for payload in repository.list_saved_favorites(user_id, entity_type="meal_template")
    ]
    templates: list[MealTemplate] = []
    for favorite in favorites:
        meal_template = _hydrate_meal_template(repository, user_id, favorite.entity_id)
        if meal_template is not None:
            templates.append(meal_template)
    return templates


def favorite_meal_template(
    repository: FavoriteRepository,
    user_id: str,
    meal_template_id: str,
) -> MealTemplate | None:
    if repository.get_meal_template(meal_template_id) is None:
        return None
    repository.save_favorite(
        user_id=user_id,
        entity_type="meal_template",
        entity_id=meal_template_id,
    )
    return _hydrate_meal_template(repository, user_id, meal_template_id)


def unfavorite_meal_template(
    repository: FavoriteRepository,
    user_id: str,
    meal_template_id: str,
) -> MealTemplate | None:
    if repository.get_meal_template(meal_template_id) is None:
        return None
    repository.remove_favorite(
        user_id=user_id,
        entity_type="meal_template",
        entity_id=meal_template_id,
    )
    return _hydrate_meal_template(repository, user_id, meal_template_id)


def list_favorite_recipes(
    repository: FavoriteRepository,
    user_id: str,
) -> list[RecipeDefinition]:
    favorites = [
        _saved_favorite(payload)
        for payload in repository.list_saved_favorites(user_id, entity_type="recipe")
    ]
    recipes: list[RecipeDefinition] = []
    for favorite in favorites:
        recipe = _hydrate_recipe(repository, user_id, favorite.entity_id)
        if recipe is not None:
            recipes.append(recipe)
    return recipes


def favorite_recipe(
    repository: FavoriteRepository,
    user_id: str,
    recipe_id: str,
) -> RecipeDefinition | None:
    if repository.get_recipe(recipe_id) is None:
        return None
    repository.save_favorite(
        user_id=user_id,
        entity_type="recipe",
        entity_id=recipe_id,
    )
    return _hydrate_recipe(repository, user_id, recipe_id)


def unfavorite_recipe(
    repository: FavoriteRepository,
    user_id: str,
    recipe_id: str,
) -> RecipeDefinition | None:
    if repository.get_recipe(recipe_id) is None:
        return None
    repository.remove_favorite(
        user_id=user_id,
        entity_type="recipe",
        entity_id=recipe_id,
    )
    return _hydrate_recipe(repository, user_id, recipe_id)
