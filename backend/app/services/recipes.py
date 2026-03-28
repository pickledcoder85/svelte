from uuid import uuid4

from backend.app.models.nutrition import MealInput, MealTotals
from backend.app.models.meals import MealTemplate
from backend.app.models.recipes import RecipeDefinition, RecipeImportRequest
from backend.app.repositories.memory import InMemoryBackendRepository

from backend.app.services.nutrition import meal_totals


def import_recipe(
    repository: InMemoryBackendRepository, payload: RecipeImportRequest
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


def list_recipes(repository: InMemoryBackendRepository) -> list[RecipeDefinition]:
    return repository.list_recipes()


def get_recipe(repository: InMemoryBackendRepository, recipe_id: str) -> RecipeDefinition | None:
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


def save_meal_template(repository: InMemoryBackendRepository, meal: MealInput):
    totals: MealTotals = meal_totals(meal)

    template = MealTemplate(
        id=meal.id,
        name=meal.name,
        serving_count=meal.serving_count,
        ingredients=meal.ingredients,
        favorite=False,
        calories=totals.calories,
        macros=totals.macros,
        per_serving_calories=totals.per_serving_calories,
        per_serving_macros=totals.per_serving_macros,
    )
    return repository.save_meal_template(template)
