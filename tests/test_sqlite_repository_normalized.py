import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path

from backend.app.db.database import apply_migrations, connect
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import IngredientInput, MacroTargets
from backend.app.models.recipes import RecipeDefinition
from backend.app.repositories.sqlite import SQLiteRepository


class SQLiteRepositoryNormalizedPersistenceTests(unittest.TestCase):
    def test_apply_migrations_creates_normalized_tables_and_indexes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "nutrition.db"
            apply_migrations(f"sqlite:///{db_path}")

            with connect(f"sqlite:///{db_path}") as connection:
                table_rows = connection.execute(
                    """
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table'
                    """
                ).fetchall()
                index_rows = connection.execute(
                    """
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'index'
                    """
                ).fetchall()

        table_names = {row["name"] for row in table_rows}
        index_names = {row["name"] for row in index_rows}
        self.assertTrue(
            {
                "users",
                "user_profiles",
                "user_goals",
                "food_logs",
                "food_log_entries",
                "ingestion_jobs",
                "saved_favorites",
            }.issubset(table_names)
        )
        self.assertTrue(
            {
                "idx_user_goals_user_effective",
                "idx_food_logs_user_date",
                "idx_food_log_entries_log",
                "idx_ingestion_jobs_user_status",
                "idx_ingestion_outputs_job",
                "idx_ingestion_outputs_reviewed_at",
                "idx_ingestion_outputs_pending_review",
                "idx_saved_favorites_user_type_created",
                "idx_saved_favorites_entity",
            }.issubset(index_names)
        )

    def test_sqlite_repository_persists_user_identity_goals_and_food_logs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))

            identity = repo.save_user_identity(
                user_id="user-1",
                email="user@example.com",
                display_name="Test User",
                timezone="America/New_York",
                units="imperial",
            )
            goal = repo.save_user_goal(
                user_id="user-1",
                effective_at=date(2026, 3, 23),
                calorie_goal=14000,
                protein_goal=900,
                carbs_goal=1200,
                fat_goal=400,
                target_weight_lbs=178.5,
            )
            food_log_id = repo.create_food_log(
                user_id="user-1",
                log_date=date(2026, 3, 24),
                notes="Breakfast",
            )
            entry_id = repo.add_food_log_entry(
                food_log_id=food_log_id,
                entry_type="food",
                food_item_id="food-oats",
                calories=311.2,
                protein=13.5,
                carbs=53.0,
                fat=5.5,
                grams=80,
            )

            log = repo.get_food_log(food_log_id)
            log_entries = repo.list_food_log_entries(food_log_id)
            logs = repo.list_food_logs("user-1")

        self.assertEqual(identity["email"], "user@example.com")
        self.assertEqual(identity["display_name"], "Test User")
        self.assertEqual(goal["calorie_goal"], 14000)
        self.assertEqual(goal["target_weight_lbs"], 178.5)
        self.assertEqual(log["notes"], "Breakfast")
        self.assertEqual(log["entries"][0]["id"], entry_id)
        self.assertEqual(log_entries[0]["food_item_id"], "food-oats")
        self.assertEqual(len(logs), 1)

    def test_sqlite_repository_tracks_ingestion_jobs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))
            repo.save_user_identity(user_id="user-1", email="user@example.com")

            job_id = repo.create_ingestion_job(
                user_id="user-1",
                source_kind="camera",
                source_name="nutrition-label.jpg",
                status="processing",
            )
            repo.update_ingestion_job(
                job_id,
                status="completed",
                completed_at=datetime(2026, 3, 27, 15, 30),
                error_message=None,
            )

            job = repo.get_ingestion_job(job_id)
            jobs = repo.list_ingestion_jobs("user-1")

        self.assertEqual(job["status"], "completed")
        self.assertTrue(job["completed_at"].startswith("2026-03-27T15:30"))
        self.assertEqual(jobs[0]["id"], job_id)

    def test_sqlite_repository_tracks_ingestion_outputs_and_review_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))
            repo.save_user_identity(user_id="user-1", email="user@example.com")
            job_id = repo.create_ingestion_job(
                user_id="user-1",
                source_kind="camera",
                source_name="label-photo.jpg",
            )

            pending_output = repo.save_ingestion_output(
                ingestion_job_id=job_id,
                extracted_text="Nutrition Facts",
                structured_json={"product_name": "Rolled oats"},
                confidence=0.91,
                output_id="output-1",
            )
            second_output = repo.save_ingestion_output(
                ingestion_job_id=job_id,
                extracted_text="Serving size 1 cup",
                structured_json={"serving_size": "1 cup"},
                confidence=0.74,
                output_id="output-2",
            )

            pending_outputs = repo.list_pending_ingestion_outputs(job_id)
            reviewed_output = repo.accept_ingestion_output(
                "output-1",
                accepted_at=datetime(2026, 3, 27, 15, 45),
            )
            rejected_output = repo.reject_ingestion_output(
                "output-2",
                rejected_at=datetime(2026, 3, 27, 15, 50),
            )
            all_outputs = repo.list_ingestion_outputs(job_id)

        self.assertEqual(pending_output["review_state"], "pending")
        self.assertEqual(second_output["review_state"], "pending")
        self.assertEqual(len(pending_outputs), 2)
        self.assertEqual(reviewed_output["review_state"], "accepted")
        self.assertEqual(reviewed_output["accepted_at"], "2026-03-27T15:45:00")
        self.assertEqual(rejected_output["review_state"], "rejected")
        self.assertEqual(rejected_output["rejected_at"], "2026-03-27T15:50:00")
        self.assertEqual([output["id"] for output in all_outputs], ["output-2", "output-1"])

    def test_sqlite_repository_persists_saved_favorites_for_recipes_and_meals(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))
            repo.save_user_identity(user_id="user-1", email="user@example.com")
            repo.save_user_identity(user_id="user-2", email="alt@example.com")

            meal_template = MealTemplate(
                id="meal-breakfast-bowl",
                name="Breakfast Bowl",
                serving_count=2,
                ingredients=[
                    IngredientInput(
                        id="ingredient-1",
                        food_id="food-oats",
                        name="Rolled oats",
                        grams=80,
                        calories_per_100g=389,
                        macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                    )
                ],
                favorite=False,
                calories=311.2,
                macros=MacroTargets(protein=13.5, carbs=53.0, fat=5.5),
                per_serving_calories=155.6,
                per_serving_macros=MacroTargets(protein=6.8, carbs=26.5, fat=2.8),
            )
            recipe = RecipeDefinition(
                id="recipe-overnight-oats",
                title="Overnight Oats",
                steps=["Mix ingredients.", "Chill overnight."],
                ingredients=[
                    IngredientInput(
                        id="ingredient-2",
                        food_id="food-oats",
                        name="Rolled oats",
                        grams=80,
                        calories_per_100g=389,
                        macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                    )
                ],
                default_yield=2,
                favorite=False,
            )

            repo.save_meal_template(meal_template)
            repo.save_recipe(recipe)

            meal_favorite = repo.save_favorite(
                user_id="user-1",
                entity_type="meal_template",
                entity_id=meal_template.id,
            )
            recipe_favorite_user1 = repo.save_favorite(
                user_id="user-1",
                entity_type="recipe",
                entity_id=recipe.id,
            )
            recipe_favorite_user2 = repo.save_favorite(
                user_id="user-2",
                entity_type="recipe",
                entity_id=recipe.id,
            )
            duplicate_recipe_favorite = repo.save_favorite(
                user_id="user-1",
                entity_type="recipe",
                entity_id=recipe.id,
            )

            user1_favorites = repo.list_saved_favorites("user-1")
            recipe_favorites = repo.list_saved_favorites("user-1", "recipe")
            meal_favorites = repo.list_saved_favorites("user-1", "meal_template")

            repo.remove_favorite(user_id="user-1", entity_type="recipe", entity_id=recipe.id)

        self.assertEqual(meal_favorite["entity_type"], "meal_template")
        self.assertEqual(recipe_favorite_user1["entity_id"], recipe.id)
        self.assertEqual(recipe_favorite_user2["user_id"], "user-2")
        self.assertEqual(duplicate_recipe_favorite["id"], recipe_favorite_user1["id"])
        self.assertEqual(len(user1_favorites), 2)
        self.assertEqual(len(recipe_favorites), 1)
        self.assertEqual(len(meal_favorites), 1)
        self.assertTrue(repo.is_saved_favorite("user-1", "meal_template", meal_template.id))
        self.assertFalse(repo.is_saved_favorite("user-1", "recipe", recipe.id))
        self.assertTrue(repo.is_saved_favorite("user-2", "recipe", recipe.id))


if __name__ == "__main__":
    unittest.main()
