import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path

from backend.app.db.database import apply_migrations, connect
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import IngredientInput, MacroTargets
from backend.app.models.recipes import RecipeAsset, RecipeDefinition
from backend.app.repositories.sqlite import DEFAULT_FAVORITE_FOOD_IDS, SQLiteRepository


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
                saved_favorites_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'saved_favorites'
                    """
                ).fetchone()
                default_food_favorites_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'default_favorite_foods'
                    """
                ).fetchone()
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
                "exercise_entries",
                "meal_plan_days",
                "meal_plan_slots",
                "meal_prep_tasks",
                "ingestion_jobs",
                "saved_favorites",
                "default_favorite_foods",
                "user_default_favorite_food_seed_runs",
            }.issubset(table_names)
        )
        self.assertIsNotNone(saved_favorites_row)
        self.assertIn("food", saved_favorites_row["sql"])
        self.assertIsNotNone(default_food_favorites_row)
        self.assertIn("display_order", default_food_favorites_row["sql"])
        self.assertTrue(
            {
                "idx_user_goals_user_effective",
                "idx_food_logs_user_date",
                "idx_exercise_entries_user_logged_on",
                "idx_food_log_entries_log",
                "idx_meal_plan_days_user_date",
                "idx_meal_plan_slots_day_position",
                "idx_meal_prep_tasks_user_status",
                "idx_ingestion_jobs_user_status",
                "idx_ingestion_outputs_job",
                "idx_ingestion_outputs_reviewed_at",
                "idx_ingestion_outputs_pending_review",
                "idx_saved_favorites_user_type_created",
                "idx_saved_favorites_entity",
                "idx_default_favorite_foods_order",
            }.issubset(index_names)
        )

        default_food_count = connection.execute(
            "SELECT COUNT(*) AS count FROM default_favorite_foods"
        ).fetchone()["count"]
        self.assertEqual(default_food_count, len(DEFAULT_FAVORITE_FOOD_IDS))

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

    def test_sqlite_repository_seeds_default_favorite_foods_for_new_users(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))

            repo.save_user_identity(
                user_id="user-1",
                email="user@example.com",
                display_name="Test User",
                timezone="America/New_York",
                units="imperial",
            )
            seeded_favorites = repo.list_saved_favorites("user-1", "food")

            repo.save_user_identity(
                user_id="user-1",
                email="user@example.com",
                display_name="Updated User",
                timezone="America/New_York",
                units="imperial",
            )
            repeated_favorites = repo.list_saved_favorites("user-1", "food")

        self.assertEqual(
            [favorite["entity_id"] for favorite in seeded_favorites],
            DEFAULT_FAVORITE_FOOD_IDS,
        )
        self.assertEqual(
            [favorite["entity_id"] for favorite in repeated_favorites],
            DEFAULT_FAVORITE_FOOD_IDS,
        )
        self.assertEqual(len(seeded_favorites), len(DEFAULT_FAVORITE_FOOD_IDS))
        self.assertEqual(len(repeated_favorites), len(DEFAULT_FAVORITE_FOOD_IDS))

    def test_sqlite_repository_persists_weight_history(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))
            repo.save_user_identity(user_id="user-1", email="user@example.com")

            first_id = repo.record_weight_entry(
                user_id="user-1",
                recorded_at=date(2026, 3, 24),
                weight_lbs=180,
            )
            second_id = repo.record_weight_entry(
                user_id="user-1",
                recorded_at=date(2026, 3, 27),
                weight_lbs=178.8,
            )

            first_entry = repo.get_weight_entry(first_id)
            entries = repo.list_weight_entries(
                "user-1",
                recorded_start=date(2026, 3, 23),
                recorded_end=date(2026, 3, 29),
            )

        self.assertIsNotNone(first_entry)
        self.assertEqual(first_entry["weight_lbs"], 180)
        self.assertEqual(first_entry["recorded_at"], "2026-03-24")
        self.assertEqual([entry["id"] for entry in entries], [first_id, second_id])
        self.assertEqual(entries[-1]["weight_lbs"], 178.8)

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

    def test_sqlite_repository_persists_saved_favorites_for_recipes_meals_and_foods(self) -> None:
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
            recipe_favorite = repo.save_favorite(
                user_id="user-1",
                entity_type="recipe",
                entity_id=recipe.id,
            )

            food_favorite = repo.save_favorite(
                user_id="user-1",
                entity_type="food",
                entity_id="food-oats",
            )
            duplicate_food_favorite = repo.save_favorite(
                user_id="user-1",
                entity_type="food",
                entity_id="food-oats",
            )
            other_user_food_favorite = repo.save_favorite(
                user_id="user-2",
                entity_type="food",
                entity_id="food-oats",
            )

            user1_favorites = repo.list_saved_favorites("user-1")
            food_favorites = repo.list_saved_favorites("user-1", "food")
            meal_favorites = repo.list_saved_favorites("user-1", "meal_template")
            recipe_favorites = repo.list_saved_favorites("user-1", "recipe")

            repo.remove_favorite(user_id="user-1", entity_type="food", entity_id="food-oats")

        self.assertEqual(meal_favorite["entity_type"], "meal_template")
        self.assertEqual(recipe_favorite["entity_type"], "recipe")
        self.assertEqual(food_favorite["entity_type"], "food")
        self.assertEqual(food_favorite["entity_id"], "food-oats")
        self.assertEqual(duplicate_food_favorite["id"], food_favorite["id"])
        self.assertEqual(other_user_food_favorite["user_id"], "user-2")
        self.assertEqual(len(user1_favorites), len(DEFAULT_FAVORITE_FOOD_IDS) + 2)
        self.assertEqual(len(food_favorites), len(DEFAULT_FAVORITE_FOOD_IDS))
        self.assertEqual(len(meal_favorites), 1)
        self.assertEqual(len(recipe_favorites), 1)
        self.assertTrue(repo.is_saved_favorite("user-1", "meal_template", meal_template.id))
        self.assertTrue(repo.is_saved_favorite("user-1", "recipe", recipe.id))
        self.assertFalse(repo.is_saved_favorite("user-1", "food", "food-oats"))
        self.assertTrue(repo.is_saved_favorite("user-2", "food", "food-oats"))

    def test_sqlite_repository_updates_meal_template_totals_and_ingredients(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))

            meal_template = MealTemplate(
                id="meal-protein-bowl",
                name="Protein Bowl",
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
            repo.save_meal_template(meal_template)

            updated_template = meal_template.model_copy(
                update={
                    "name": "Protein Bowl Deluxe",
                    "serving_count": 4,
                    "ingredients": [
                        IngredientInput(
                            id="ingredient-1",
                            food_id="food-oats",
                            name="Rolled oats",
                            grams=100,
                            calories_per_100g=389,
                            macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                        )
                    ],
                    "calories": 389.0,
                    "macros": MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                    "per_serving_calories": 97.2,
                    "per_serving_macros": MacroTargets(protein=4.2, carbs=16.6, fat=1.7),
                }
            )
            repo.save_meal_template(updated_template)

            fetched = repo.get_meal_template(meal_template.id)
            ingredient_rows = repo._connection.execute(
                """
                SELECT grams
                FROM meal_template_ingredients
                WHERE meal_template_id = ?
                ORDER BY id
                """,
                (meal_template.id,),
            ).fetchall()

        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.name, "Protein Bowl Deluxe")
        self.assertEqual(fetched.serving_count, 4)
        self.assertEqual(fetched.calories, 389.0)
        self.assertEqual(fetched.per_serving_calories, 97.2)
        self.assertEqual([row["grams"] for row in ingredient_rows], [100])

    def test_sqlite_repository_repairs_legacy_meal_and_recipe_schema_from_migrations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            apply_migrations(f"sqlite:///{db_path}")

            with connect(f"sqlite:///{db_path}") as connection:
                legacy_meal_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'meal_templates'
                    """
                ).fetchone()
                legacy_meal_ingredient_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'meal_template_ingredients'
                    """
                ).fetchone()
                legacy_recipe_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipes'
                    """
                ).fetchone()
                legacy_recipe_step_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipe_steps'
                    """
                ).fetchone()
                legacy_recipe_asset_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipe_assets'
                    """
                ).fetchone()
                legacy_recipe_ingredient_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipe_ingredients'
                    """
                ).fetchone()

            assert legacy_meal_row is not None
            assert legacy_meal_ingredient_row is not None
            assert legacy_recipe_row is not None
            assert legacy_recipe_step_row is not None
            assert legacy_recipe_asset_row is not None
            assert legacy_recipe_ingredient_row is not None
            self.assertIn("user_id", legacy_meal_row["sql"])
            self.assertIn("ingredient_name", legacy_meal_ingredient_row["sql"])
            self.assertIn("step_index", legacy_recipe_step_row["sql"])
            self.assertIn("asset_kind", legacy_recipe_asset_row["sql"])
            self.assertIn("food_item_id", legacy_recipe_ingredient_row["sql"])

            repo = SQLiteRepository(str(db_path))

            with connect(f"sqlite:///{db_path}") as connection:
                repaired_meal_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'meal_templates'
                    """
                ).fetchone()
                repaired_meal_ingredient_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'meal_template_ingredients'
                    """
                ).fetchone()
                repaired_recipe_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipes'
                    """
                ).fetchone()
                repaired_recipe_step_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipe_steps'
                    """
                ).fetchone()
                repaired_recipe_asset_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipe_assets'
                    """
                ).fetchone()
                repaired_recipe_ingredient_row = connection.execute(
                    """
                    SELECT sql
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'recipe_ingredients'
                    """
                ).fetchone()

            assert repaired_meal_row is not None
            assert repaired_meal_ingredient_row is not None
            assert repaired_recipe_row is not None
            assert repaired_recipe_step_row is not None
            assert repaired_recipe_asset_row is not None
            assert repaired_recipe_ingredient_row is not None
            self.assertNotIn("user_id", repaired_meal_row["sql"])
            self.assertIn("calories", repaired_meal_row["sql"])
            self.assertIn("food_id", repaired_meal_ingredient_row["sql"])
            self.assertIn("name", repaired_meal_ingredient_row["sql"])
            self.assertIn("position", repaired_recipe_step_row["sql"])
            self.assertIn("kind", repaired_recipe_asset_row["sql"])
            self.assertIn("content", repaired_recipe_asset_row["sql"])
            self.assertIn("food_id", repaired_recipe_ingredient_row["sql"])
            self.assertIn("name", repaired_recipe_ingredient_row["sql"])

            meal_template = MealTemplate(
                id="meal-protein-bowl",
                name="Protein Bowl",
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
                assets=[RecipeAsset(kind="text", content="base recipe")],
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

            updated_meal = meal_template.model_copy(
                update={
                    "name": "Protein Bowl Deluxe",
                    "serving_count": 4,
                    "ingredients": [
                        IngredientInput(
                            id="ingredient-1",
                            food_id="food-oats",
                            name="Rolled oats",
                            grams=100,
                            calories_per_100g=389,
                            macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                        )
                    ],
                    "calories": 389.0,
                    "macros": MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                    "per_serving_calories": 97.2,
                    "per_serving_macros": MacroTargets(protein=4.2, carbs=16.6, fat=1.7),
                    "favorite": True,
                }
            )
            updated_recipe = recipe.model_copy(
                update={
                    "title": "Overnight Oats Deluxe",
                    "steps": ["Mix ingredients.", "Chill overnight.", "Serve cold."],
                    "assets": [
                        RecipeAsset(kind="text", content="base recipe"),
                        RecipeAsset(kind="image", url="https://example.com/oats.jpg"),
                    ],
                    "ingredients": [
                        IngredientInput(
                            id="ingredient-2",
                            food_id="food-oats",
                            name="Rolled oats",
                            grams=100,
                            calories_per_100g=389,
                            macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                        )
                    ],
                    "default_yield": 3,
                    "favorite": True,
                }
            )

            repo.save_meal_template(updated_meal)
            repo.save_recipe(updated_recipe)

            fetched_meal = repo.get_meal_template(meal_template.id)
            fetched_recipe = repo.get_recipe(recipe.id)
            meal_templates = repo.list_meal_templates()
            recipes = repo.list_recipes()

        self.assertIsNotNone(fetched_meal)
        self.assertIsNotNone(fetched_recipe)
        assert fetched_meal is not None
        assert fetched_recipe is not None
        self.assertEqual(fetched_meal.name, "Protein Bowl Deluxe")
        self.assertEqual(fetched_meal.serving_count, 4)
        self.assertEqual(fetched_meal.favorite, True)
        self.assertEqual(fetched_meal.ingredients[0].grams, 100)
        self.assertEqual(fetched_meal.per_serving_calories, 97.2)
        self.assertEqual(fetched_recipe.title, "Overnight Oats Deluxe")
        self.assertEqual(fetched_recipe.default_yield, 3)
        self.assertEqual(fetched_recipe.favorite, True)
        self.assertEqual(fetched_recipe.steps, ["Mix ingredients.", "Chill overnight.", "Serve cold."])
        self.assertEqual(len(fetched_recipe.assets), 2)
        self.assertEqual(fetched_recipe.ingredients[0].grams, 100)
        self.assertEqual([meal.id for meal in meal_templates], [meal_template.id])
        self.assertEqual([recipe.id for recipe in recipes], [recipe.id])

    def test_sqlite_repository_persists_exercise_meal_plan_and_meal_prep(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "normalized.db"
            repo = SQLiteRepository(str(db_path))
            repo.save_user_identity(user_id="user-1", email="user@example.com")

            exercise_id = repo.create_exercise_entry(
                user_id="user-1",
                title="Incline walk",
                duration_minutes=35,
                calories_burned=240,
                logged_on=date(2026, 3, 28),
                logged_at="07:15",
                intensity="Moderate",
            )
            meal_plan_day_id = repo.save_meal_plan_day(
                user_id="user-1",
                plan_date=date(2026, 3, 31),
                label="Tue",
                focus="Training day",
                slots=[
                    {
                        "meal_label": "Breakfast",
                        "title": "Greek yogurt + berries",
                        "calories": 320,
                        "prep_status": "Prepped",
                    },
                    {
                        "meal_label": "Lunch",
                        "title": "Chicken rice bowl",
                        "calories": 610,
                        "prep_status": "Needs prep",
                    },
                ],
            )
            task_id = repo.create_meal_prep_task(
                user_id="user-1",
                title="Bake chicken breast",
                category="Protein",
                portions="8 portions",
                status="Queued",
                scheduled_for=date(2026, 3, 30),
            )
            updated_task = repo.update_meal_prep_task_status(task_id, "Done")

            exercises = repo.list_exercise_entries("user-1")
            meal_plan_days = repo.list_meal_plan_days("user-1")
            meal_prep_tasks = repo.list_meal_prep_tasks("user-1")

        self.assertEqual(exercises[0]["id"], exercise_id)
        self.assertEqual(exercises[0]["title"], "Incline walk")
        self.assertEqual(meal_plan_days[0]["id"], meal_plan_day_id)
        self.assertEqual(len(meal_plan_days[0]["slots"]), 2)
        self.assertEqual(meal_plan_days[0]["slots"][0]["meal_label"], "Breakfast")
        self.assertIsNotNone(updated_task)
        self.assertEqual(updated_task["status"], "Done")
        self.assertEqual(meal_prep_tasks[0]["status"], "Done")


if __name__ == "__main__":
    unittest.main()
