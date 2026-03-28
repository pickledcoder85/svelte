from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import uuid4

from backend.app.db.database import connect, execute, fetch_all, fetch_one, json_text


@dataclass(frozen=True)
class MealIngredientInput:
    name: str
    grams: float
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    food_item_id: str | None = None


@dataclass(frozen=True)
class RecipeStepInput:
    step_index: int
    step_text: str


class NutritionRepository:
    def __init__(self, database_url: str | None = None, connection=None) -> None:
        self.database_url = database_url
        self.connection = connection

    @contextmanager
    def _open(self):
        if self.connection is not None:
            yield self.connection
            return

        connection = connect(self.database_url)
        try:
            yield connection
        finally:
            connection.close()

    def create_user(self, email: str, user_id: str | None = None) -> str:
        identifier = user_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO users (id, email)
                VALUES (?, ?)
                """,
                (identifier, email),
            )
            connection.commit()
        return identifier

    def save_food_item(
        self,
        *,
        name: str,
        source_kind: str,
        calories_per_100g: float,
        protein_per_100g: float,
        carbs_per_100g: float,
        fat_per_100g: float,
        serving_size_g: float = 100,
        serving_unit: str = "g",
        brand: str | None = None,
        external_id: str | None = None,
        confidence: float = 1.0,
        food_item_id: str | None = None,
        source_name: str | None = None,
        source_reference: str | None = None,
        raw_payload: dict[str, Any] | None = None,
    ) -> str:
        identifier = food_item_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO food_items (
                    id, source_kind, external_id, name, brand,
                    calories_per_100g, serving_size_g, serving_unit,
                    protein_per_100g, carbs_per_100g, fat_per_100g, confidence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    source_kind,
                    external_id,
                    name,
                    brand,
                    calories_per_100g,
                    serving_size_g,
                    serving_unit,
                    protein_per_100g,
                    carbs_per_100g,
                    fat_per_100g,
                    confidence,
                ),
            )

            if source_name is not None:
                execute(
                    connection,
                    """
                    INSERT INTO food_item_sources (
                        id, food_item_id, source_name, source_reference, raw_payload_json, confidence
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        identifier,
                        source_name,
                        source_reference,
                        json_text(raw_payload) if raw_payload is not None else None,
                        confidence,
                    ),
                )

            connection.commit()
        return identifier

    def list_food_items(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._open() as connection:
            return fetch_all(
                connection,
                """
                SELECT id, source_kind, external_id, name, brand, calories_per_100g,
                       serving_size_g, serving_unit, protein_per_100g, carbs_per_100g,
                       fat_per_100g, confidence, created_at, updated_at
                FROM food_items
                ORDER BY name ASC
                LIMIT ?
                """,
                (limit,),
            )

    def create_food_log(
        self, *, user_id: str, log_date: date, notes: str | None = None, food_log_id: str | None = None
    ) -> str:
        identifier = food_log_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO food_logs (id, user_id, log_date, notes)
                VALUES (?, ?, ?, ?)
                """,
                (identifier, user_id, log_date.isoformat(), notes),
            )
            connection.commit()
        return identifier

    def add_food_log_entry(
        self,
        *,
        food_log_id: str,
        entry_type: str,
        calories: float,
        protein: float,
        carbs: float,
        fat: float,
        grams: float = 0,
        servings: float = 1,
        food_item_id: str | None = None,
        meal_template_id: str | None = None,
        entry_id: str | None = None,
    ) -> str:
        identifier = entry_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO food_log_entries (
                    id, food_log_id, entry_type, food_item_id, meal_template_id,
                    grams, servings, calories, protein, carbs, fat
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    food_log_id,
                    entry_type,
                    food_item_id,
                    meal_template_id,
                    grams,
                    servings,
                    calories,
                    protein,
                    carbs,
                    fat,
                ),
            )
            connection.commit()
        return identifier

    def record_weight_entry(
        self,
        *,
        user_id: str,
        recorded_at: date,
        weight_lbs: float,
        notes: str | None = None,
        weight_entry_id: str | None = None,
    ) -> str:
        identifier = weight_entry_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO weight_entries (id, user_id, recorded_at, weight_lbs, notes)
                VALUES (?, ?, ?, ?, ?)
                """,
                (identifier, user_id, recorded_at.isoformat(), weight_lbs, notes),
            )
            connection.commit()
        return identifier

    def create_user_goal(
        self,
        *,
        user_id: str,
        effective_at: date,
        calorie_goal: int,
        protein_goal: float,
        carbs_goal: float,
        fat_goal: float,
        target_weight_lbs: float | None = None,
        goal_id: str | None = None,
    ) -> str:
        identifier = goal_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO user_goals (
                    id, user_id, effective_at, calorie_goal, protein_goal,
                    carbs_goal, fat_goal, target_weight_lbs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    user_id,
                    effective_at.isoformat(),
                    calorie_goal,
                    protein_goal,
                    carbs_goal,
                    fat_goal,
                    target_weight_lbs,
                ),
            )
            connection.commit()
        return identifier

    def create_meal_template(
        self,
        *,
        user_id: str,
        name: str,
        serving_count: float,
        ingredients: list[MealIngredientInput],
        favorite: bool = False,
        meal_template_id: str | None = None,
    ) -> str:
        identifier = meal_template_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO meal_templates (id, user_id, name, serving_count, favorite)
                VALUES (?, ?, ?, ?, ?)
                """,
                (identifier, user_id, name, serving_count, int(favorite)),
            )

            for ingredient in ingredients:
                execute(
                    connection,
                    """
                    INSERT INTO meal_template_ingredients (
                        id, meal_template_id, food_item_id, ingredient_name, grams,
                        calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        identifier,
                        ingredient.food_item_id,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.calories_per_100g,
                        ingredient.protein_per_100g,
                        ingredient.carbs_per_100g,
                        ingredient.fat_per_100g,
                    ),
                )

            connection.commit()
        return identifier

    def create_recipe(
        self,
        *,
        user_id: str,
        title: str,
        default_yield: float,
        steps: list[RecipeStepInput],
        ingredients: list[MealIngredientInput],
        favorite: bool = False,
        recipe_id: str | None = None,
    ) -> str:
        identifier = recipe_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO recipes (id, user_id, title, default_yield, favorite)
                VALUES (?, ?, ?, ?, ?)
                """,
                (identifier, user_id, title, default_yield, int(favorite)),
            )

            for step in steps:
                execute(
                    connection,
                    """
                    INSERT INTO recipe_steps (id, recipe_id, step_index, step_text)
                    VALUES (?, ?, ?, ?)
                    """,
                    (str(uuid4()), identifier, step.step_index, step.step_text),
                )

            for ingredient in ingredients:
                execute(
                    connection,
                    """
                    INSERT INTO recipe_ingredients (
                        id, recipe_id, food_item_id, ingredient_name, grams,
                        calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        identifier,
                        ingredient.food_item_id,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.calories_per_100g,
                        ingredient.protein_per_100g,
                        ingredient.carbs_per_100g,
                        ingredient.fat_per_100g,
                    ),
                )

            connection.commit()
        return identifier

    def create_ingestion_job(
        self,
        *,
        user_id: str,
        source_kind: str,
        source_name: str,
        status: str = "pending",
        ingestion_job_id: str | None = None,
    ) -> str:
        identifier = ingestion_job_id or str(uuid4())
        with self._open() as connection:
            execute(
                connection,
                """
                INSERT INTO ingestion_jobs (id, user_id, source_kind, source_name, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (identifier, user_id, source_kind, source_name, status),
            )
            connection.commit()
        return identifier

    def get_weekly_metrics(
        self,
        *,
        user_id: str,
        week_start: date,
        week_end: date,
    ) -> dict[str, Any]:
        with self._open() as connection:
            goal_row = fetch_one(
                connection,
                """
                SELECT calorie_goal, protein_goal, carbs_goal, fat_goal
                FROM user_goals
                WHERE user_id = ? AND effective_at <= ?
                ORDER BY effective_at DESC, created_at DESC
                LIMIT 1
                """,
                (user_id, week_end.isoformat()),
            ) or {
                "calorie_goal": 0,
                "protein_goal": 0.0,
                "carbs_goal": 0.0,
                "fat_goal": 0.0,
            }

            calorie_row = fetch_one(
                connection,
                """
                SELECT
                    COALESCE(SUM(le.calories), 0) AS calories_consumed,
                    COALESCE(SUM(le.protein), 0) AS protein_consumed,
                    COALESCE(SUM(le.carbs), 0) AS carbs_consumed,
                    COALESCE(SUM(le.fat), 0) AS fat_consumed
                FROM food_logs fl
                JOIN food_log_entries le ON le.food_log_id = fl.id
                WHERE fl.user_id = ? AND fl.log_date BETWEEN ? AND ?
                """,
                (user_id, week_start.isoformat(), week_end.isoformat()),
            ) or {
                "calories_consumed": 0,
                "protein_consumed": 0,
                "carbs_consumed": 0,
                "fat_consumed": 0,
            }

            weight_rows = fetch_all(
                connection,
                """
                SELECT weight_lbs, recorded_at
                FROM weight_entries
                WHERE user_id = ? AND recorded_at BETWEEN ? AND ?
                ORDER BY recorded_at ASC
                """,
                (user_id, week_start.isoformat(), week_end.isoformat()),
            )

        weekly_weight_change = 0.0
        if len(weight_rows) >= 2:
            weekly_weight_change = round(weight_rows[-1]["weight_lbs"] - weight_rows[0]["weight_lbs"], 1)

        calorie_goal = int(goal_row["calorie_goal"])
        calories_consumed = int(round(calorie_row["calories_consumed"]))
        adherence_score = 0
        if calorie_goal > 0:
            adherence_score = int(
                max(
                    0,
                    100
                    - round(
                        abs(calories_consumed - calorie_goal) / calorie_goal * 100,
                    ),
                )
            )

        return {
            "calorie_goal": calorie_goal,
            "calories_consumed": calories_consumed,
            "macro_targets": {
                "protein": float(goal_row["protein_goal"]),
                "carbs": float(goal_row["carbs_goal"]),
                "fat": float(goal_row["fat_goal"]),
            },
            "macro_consumed": {
                "protein": round(float(calorie_row["protein_consumed"]), 1),
                "carbs": round(float(calorie_row["carbs_consumed"]), 1),
                "fat": round(float(calorie_row["fat_consumed"]), 1),
            },
            "weekly_weight_change": weekly_weight_change,
            "adherence_score": adherence_score,
        }
