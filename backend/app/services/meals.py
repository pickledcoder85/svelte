from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import MealInput, MealTotals
from backend.app.repositories.sqlite import SQLiteRepository

from backend.app.services.nutrition import meal_totals


def save_meal_template(repository: SQLiteRepository, meal: MealInput) -> MealTemplate:
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


def list_meal_templates(repository: SQLiteRepository) -> list[MealTemplate]:
    return repository.list_meal_templates()


def get_meal_template(repository: SQLiteRepository, meal_template_id: str) -> MealTemplate | None:
    return repository.get_meal_template(meal_template_id)
