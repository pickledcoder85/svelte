import tempfile
import unittest
from datetime import date
from pathlib import Path
import os

from backend.app.db.database import apply_migrations, reset_database
from backend.app.db.dev_seed import seed_dev_data
from backend.app.main import create_app
from backend.app.repositories.sqlite import SQLiteRepository


class DatabaseLayerTests(unittest.TestCase):

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

    def test_repository_lists_weight_history_entries(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "weights.db"
            repo = SQLiteRepository(str(db_path))

            repo.save_user_identity(user_id="user-weights", email="weights@example.com")
            first_id = repo.record_weight_entry(
                user_id="user-weights",
                recorded_at=date(2026, 3, 24),
                weight_lbs=180,
            )
            second_id = repo.record_weight_entry(
                user_id="user-weights",
                recorded_at=date(2026, 3, 27),
                weight_lbs=178.8,
            )

            entries = repo.list_weight_entries(
                "user-weights",
                recorded_start=date(2026, 3, 23),
                recorded_end=date(2026, 3, 29),
            )

            weekly = repo.get_weekly_metrics_for_user(
                user_id="user-weights",
                week_start=date(2026, 3, 23),
                week_end=date(2026, 3, 29),
            )

        self.assertEqual([entry["id"] for entry in entries], [first_id, second_id])
        self.assertEqual(entries[0]["weight_lbs"], 180)
        self.assertEqual(entries[1]["weight_lbs"], 178.8)
        self.assertEqual(weekly.weekly_weight_change, -1.2)


    def test_reset_database_removes_existing_sqlite_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "reset.db"
            apply_migrations(f"sqlite:///{db_path}")
            self.assertTrue(db_path.exists())

            reset_database(f"sqlite:///{db_path}")

            self.assertFalse(db_path.exists())

    def test_seed_dev_data_creates_reusable_local_user_and_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "seeded.db"
            apply_migrations(f"sqlite:///{db_path}")

            result = seed_dev_data(f"sqlite:///{db_path}")
            repo = SQLiteRepository(str(db_path))
            user_id = repo.get_session(result["access_token"]).user_id
            profile = repo.get_user_identity(user_id)
            goals = repo.list_user_goals(user_id)
            weights = repo.list_weight_entries(user_id)
            logs = repo.list_food_logs(user_id)
            log = repo.get_food_log(logs[0]["id"])
            exercise = repo.list_exercise_entries(user_id)

        self.assertEqual(result["user_email"], "dev@example.com")
        self.assertIsNotNone(profile)
        self.assertEqual(profile["display_name"], "Local Dev User")
        self.assertEqual(len(goals), 1)
        self.assertEqual(len(weights), 4)
        self.assertEqual(len(logs), 1)
        self.assertEqual(len(log["entries"]), 3)
        # dev_seed creates a historical swim entry plus one dated today.
        self.assertEqual(len(exercise), 2)

    def test_create_app_uses_database_url_when_path_override_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "app.db"
            from backend.app.config import get_settings

            previous = os.environ.get("DATABASE_URL")
            os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
            get_settings.cache_clear()
            try:
                app = create_app()
            finally:
                if previous is None:
                    os.environ.pop("DATABASE_URL", None)
                else:
                    os.environ["DATABASE_URL"] = previous
                get_settings.cache_clear()

        self.assertEqual(app.state.repository.database_path, str(db_path))


if __name__ == "__main__":
    unittest.main()
