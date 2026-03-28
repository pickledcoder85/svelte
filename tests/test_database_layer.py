import sqlite3
import tempfile
import unittest
from datetime import date
from pathlib import Path

from backend.app.db.database import apply_migrations, connect
from backend.app.repositories.nutrition import MealIngredientInput, NutritionRepository, RecipeStepInput
from backend.app.repositories.sqlite import SQLiteRepository


class DatabaseLayerTests(unittest.TestCase):
    def test_apply_migrations_creates_core_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "nutrition.db"
            apply_migrations(f"sqlite:///{db_path}")

            with connect(f"sqlite:///{db_path}") as connection:
                rows = connection.execute(
                    """
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table'
                    """
                ).fetchall()

        table_names = {row["name"] for row in rows}
        self.assertTrue(
            {"users", "food_items", "food_logs", "meal_templates", "recipes", "ingestion_jobs"}.issubset(
                table_names
            )
        )

    def test_repository_persists_food_items_and_metrics(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "metrics.db"
            apply_migrations(f"sqlite:///{db_path}")

            connection = sqlite3.connect(db_path)
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA foreign_keys = ON")

            repo = NutritionRepository(connection=connection)
            repo.create_user("test@example.com", user_id="user-1")
            repo.create_user_goal(
                user_id="user-1",
                effective_at=date(2026, 3, 23),
                calorie_goal=14000,
                protein_goal=900,
                carbs_goal=1200,
                fat_goal=400,
            )

            food_item_id = repo.save_food_item(
                name="Rolled oats",
                source_kind="USDA",
                calories_per_100g=389,
                protein_per_100g=16.9,
                carbs_per_100g=66.3,
                fat_per_100g=6.9,
            )

            log_id = repo.create_food_log(user_id="user-1", log_date=date(2026, 3, 24))
            repo.add_food_log_entry(
                food_log_id=log_id,
                entry_type="food",
                food_item_id=food_item_id,
                calories=311.2,
                protein=13.5,
                carbs=53.0,
                fat=5.5,
                grams=80,
            )

            repo.record_weight_entry(user_id="user-1", recorded_at=date(2026, 3, 24), weight_lbs=180)
            repo.record_weight_entry(user_id="user-1", recorded_at=date(2026, 3, 27), weight_lbs=178.8)

            metrics = repo.get_weekly_metrics(
                user_id="user-1",
                week_start=date(2026, 3, 23),
                week_end=date(2026, 3, 29),
            )

        self.assertEqual(metrics["calorie_goal"], 14000)
        self.assertEqual(metrics["calories_consumed"], 311)
        self.assertEqual(metrics["macro_consumed"], {"protein": 13.5, "carbs": 53.0, "fat": 5.5})
        self.assertEqual(metrics["weekly_weight_change"], -1.2)

    def test_repository_can_create_meal_and_recipe(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "nutrition.db"
            apply_migrations(f"sqlite:///{db_path}")

            repo = NutritionRepository(database_url=f"sqlite:///{db_path}")
            user_id = repo.create_user("recipe@example.com")
            meal_id = repo.create_meal_template(
                user_id=user_id,
                name="Protein Bowl",
                serving_count=2,
                ingredients=[
                    MealIngredientInput(
                        name="Rolled oats",
                        grams=80,
                        calories_per_100g=389,
                        protein_per_100g=16.9,
                        carbs_per_100g=66.3,
                        fat_per_100g=6.9,
                    )
                ],
            )
            recipe_id = repo.create_recipe(
                user_id=user_id,
                title="Overnight Oats Base",
                default_yield=2,
                favorite=True,
                steps=[RecipeStepInput(step_index=0, step_text="Mix ingredients.")],
                ingredients=[
                    MealIngredientInput(
                        name="Rolled oats",
                        grams=80,
                        calories_per_100g=389,
                        protein_per_100g=16.9,
                        carbs_per_100g=66.3,
                        fat_per_100g=6.9,
                    )
                ],
            )

        self.assertTrue(meal_id)
        self.assertTrue(recipe_id)

    def test_sqlite_repository_derives_weekly_metrics_from_persisted_logs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "sqlite-weekly.db"
            repo = SQLiteRepository(str(db_path))

            user_id = "user-context"
            repo.save_user_goal(
                user_id=user_id,
                effective_at=date(2026, 3, 23),
                calorie_goal=14000,
                protein_goal=900,
                carbs_goal=1200,
                fat_goal=400,
            )

            log_id = repo.create_food_log(user_id=user_id, log_date=date(2026, 3, 24))
            repo.add_food_log_entry(
                food_log_id=log_id,
                calories=311.2,
                protein=13.5,
                carbs=53.0,
                fat=5.5,
                grams=80,
                food_item_id="food-oats",
            )
            repo.record_weight_entry(user_id=user_id, recorded_at=date(2026, 3, 24), weight_lbs=180)
            repo.record_weight_entry(user_id=user_id, recorded_at=date(2026, 3, 27), weight_lbs=178.8)

            metrics = repo.get_weekly_metrics_for_user(
                user_id=user_id,
                week_start=date(2026, 3, 23),
                week_end=date(2026, 3, 29),
            )

        self.assertEqual(metrics.calorie_goal, 14000)
        self.assertEqual(metrics.calories_consumed, 311)
        self.assertEqual(metrics.macro_consumed.model_dump(), {"protein": 13.5, "carbs": 53.0, "fat": 5.5})
        self.assertEqual(metrics.weekly_weight_change, -1.2)


if __name__ == "__main__":
    unittest.main()
