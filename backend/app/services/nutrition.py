from datetime import date, timedelta
from typing import Protocol

from backend.app.models.nutrition import (
    FoodFavoriteState,
    FoodItem,
    IngredientInput,
    MacroTargets,
    MealInput,
    MealTotals,
)
from backend.app.repositories.sqlite import SQLiteRepository


class FavoriteFoodRepository(Protocol):
    def list_foods(self) -> list[FoodItem]: ...

    def list_saved_favorites(
        self,
        user_id: str,
        entity_type: str | None = None,
    ) -> list[dict[str, object]]: ...

    def save_favorite(
        self,
        *,
        user_id: str,
        entity_type: str,
        entity_id: str,
        favorite_id: str | None = None,
    ) -> dict[str, object]: ...

    def remove_favorite(self, *, user_id: str, entity_type: str, entity_id: str) -> None: ...


def round1(value: float) -> float:
    return round(value, 1)


def scale_macros(macros: MacroTargets, multiplier: float) -> MacroTargets:
    return MacroTargets(
        protein=round1(macros.protein * multiplier),
        carbs=round1(macros.carbs * multiplier),
        fat=round1(macros.fat * multiplier),
    )


def ingredient_totals(ingredient: IngredientInput) -> tuple[float, MacroTargets]:
    multiplier = ingredient.grams / 100
    calories = round1(ingredient.calories_per_100g * multiplier)
    macros = scale_macros(ingredient.macros_per_100g, multiplier)
    return calories, macros


def meal_totals(meal: MealInput) -> MealTotals:
    calories = 0.0
    protein = 0.0
    carbs = 0.0
    fat = 0.0

    for ingredient in meal.ingredients:
        ingredient_calories, ingredient_macros = ingredient_totals(ingredient)
        calories += ingredient_calories
        protein += ingredient_macros.protein
        carbs += ingredient_macros.carbs
        fat += ingredient_macros.fat

    total_macros = MacroTargets(
        protein=round1(protein),
        carbs=round1(carbs),
        fat=round1(fat),
    )

    return MealTotals(
        calories=round1(calories),
        macros=total_macros,
        per_serving_calories=round1(calories / meal.serving_count),
        per_serving_macros=MacroTargets(
            protein=round1(total_macros.protein / meal.serving_count),
            carbs=round1(total_macros.carbs / meal.serving_count),
            fat=round1(total_macros.fat / meal.serving_count),
        ),
    )


def get_weekly_metrics(
    repository: SQLiteRepository,
    user_id: str | None = None,
    week_start: date | None = None,
    week_end: date | None = None,
):
    if user_id is not None:
        if week_start is not None and week_end is not None:
            return repository.get_weekly_metrics_for_user(
                user_id=user_id,
                week_start=week_start,
                week_end=week_end,
            )

        resolved_end = _latest_activity_date(repository, user_id)
        if resolved_end is None:
            return repository.get_weekly_metrics_for_user(user_id=user_id)
        return repository.get_weekly_metrics_for_user(
            user_id=user_id,
            week_start=resolved_end - timedelta(days=6),
            week_end=resolved_end,
        )
    return repository.get_weekly_metrics()


def _latest_activity_date(repository: SQLiteRepository, user_id: str) -> date | None:
    row = repository._connection.execute(
        """
        SELECT MAX(activity_date) AS activity_date
        FROM (
            SELECT MAX(recorded_at) AS activity_date
            FROM weight_entries
            WHERE user_id = ?
            UNION ALL
            SELECT MAX(log_date) AS activity_date
            FROM food_logs
            WHERE user_id = ?
        )
        """,
        (user_id, user_id),
    ).fetchone()
    if row is None or row["activity_date"] is None:
        return None
    return date.fromisoformat(row["activity_date"])


def list_favorite_foods(
    repository: FavoriteFoodRepository,
    user_id: str,
) -> list[FoodItem]:
    favorite_ids = [
        payload["entity_id"]
        for payload in repository.list_saved_favorites(user_id, entity_type="food")
    ]
    foods_by_id = {food.id: food for food in repository.list_foods()}
    favorites = [
        foods_by_id[food_id].model_copy(update={"favorite": True})
        for food_id in favorite_ids
        if food_id in foods_by_id
    ]
    return favorites


def favorite_food(
    repository: FavoriteFoodRepository,
    user_id: str,
    food_id: str,
) -> FoodFavoriteState:
    repository.save_favorite(user_id=user_id, entity_type="food", entity_id=food_id)
    return FoodFavoriteState(food_id=food_id, favorite=True)


def unfavorite_food(
    repository: FavoriteFoodRepository,
    user_id: str,
    food_id: str,
) -> FoodFavoriteState:
    repository.remove_favorite(user_id=user_id, entity_type="food", entity_id=food_id)
    return FoodFavoriteState(food_id=food_id, favorite=False)
