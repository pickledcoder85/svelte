from __future__ import annotations

import functools
import json
import sqlite3
import threading
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from backend.app.models.auth import AuthSession
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import FoodItem, MacroTargets, WeeklyMetrics
from backend.app.models.recipes import RecipeAsset, RecipeDefinition
from backend.app.db.database import apply_pending_migrations, json_text


DEFAULT_FOOD_CATALOG_SEEDS: list[dict[str, Any]] = [
    {
        "id": "food-oats",
        "name": "Rolled oats",
        "brand": None,
        "calories": 389,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 16.9,
        "carbs": 66.3,
        "fat": 6.9,
        "source": "CUSTOM",
    },
    {
        "id": "food-greek-yogurt",
        "name": "Greek yogurt, plain nonfat",
        "brand": None,
        "calories": 59,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 10.3,
        "carbs": 3.6,
        "fat": 0.4,
        "source": "CUSTOM",
    },
    {
        "id": "food-blueberries",
        "name": "Blueberries",
        "brand": None,
        "calories": 57,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 0.7,
        "carbs": 14.5,
        "fat": 0.3,
        "source": "CUSTOM",
    },
    {
        "id": "food-chicken-breast",
        "name": "Chicken breast, skinless",
        "brand": None,
        "calories": 165,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 31.0,
        "carbs": 0.0,
        "fat": 3.6,
        "source": "CUSTOM",
    },
    {
        "id": "food-chicken-thighs",
        "name": "Chicken thighs, skinless",
        "brand": None,
        "calories": 209,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 26.0,
        "carbs": 0.0,
        "fat": 10.9,
        "source": "CUSTOM",
    },
    {
        "id": "food-beef-ground-80-20",
        "name": "Beef, ground (80/20)",
        "brand": None,
        "calories": 254,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 17.2,
        "carbs": 0.0,
        "fat": 20.0,
        "source": "CUSTOM",
    },
    {
        "id": "food-carrots",
        "name": "Carrots",
        "brand": None,
        "calories": 41,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 0.9,
        "carbs": 9.6,
        "fat": 0.2,
        "source": "CUSTOM",
    },
    {
        "id": "food-apples-granny-smith",
        "name": "Apple, Granny Smith",
        "brand": None,
        "calories": 52,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 0.3,
        "carbs": 13.8,
        "fat": 0.2,
        "source": "CUSTOM",
    },
    {
        "id": "food-bread-whole-wheat",
        "name": "Bread, whole wheat",
        "brand": None,
        "calories": 247,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 13.0,
        "carbs": 41.0,
        "fat": 4.2,
        "source": "CUSTOM",
    },
    {
        "id": "food-eggs-whole",
        "name": "Eggs, whole",
        "brand": None,
        "calories": 143,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 12.6,
        "carbs": 0.7,
        "fat": 9.5,
        "source": "CUSTOM",
    },
    {
        "id": "food-strawberries",
        "name": "Strawberries",
        "brand": None,
        "calories": 32,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 0.7,
        "carbs": 7.7,
        "fat": 0.3,
        "source": "CUSTOM",
    },
    {
        "id": "food-bananas",
        "name": "Bananas",
        "brand": None,
        "calories": 89,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 1.1,
        "carbs": 22.8,
        "fat": 0.3,
        "source": "CUSTOM",
    },
    {
        "id": "food-rice-white",
        "name": "Rice, white",
        "brand": None,
        "calories": 130,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 2.4,
        "carbs": 28.2,
        "fat": 0.3,
        "source": "CUSTOM",
    },
    {
        "id": "food-potatoes",
        "name": "Potatoes",
        "brand": None,
        "calories": 77,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 2.0,
        "carbs": 17.0,
        "fat": 0.1,
        "source": "CUSTOM",
    },
    {
        "id": "food-salmon",
        "name": "Salmon",
        "brand": None,
        "calories": 208,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 20.0,
        "carbs": 0.0,
        "fat": 13.0,
        "source": "CUSTOM",
    },
    {
        "id": "food-broccoli",
        "name": "Broccoli",
        "brand": None,
        "calories": 34,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 2.8,
        "carbs": 6.6,
        "fat": 0.4,
        "source": "CUSTOM",
    },
    {
        "id": "food-avocado",
        "name": "Avocado",
        "brand": None,
        "calories": 160,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 2.0,
        "carbs": 8.5,
        "fat": 14.7,
        "source": "CUSTOM",
    },
    {
        "id": "food-peanut-butter",
        "name": "Peanut butter",
        "brand": None,
        "calories": 588,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 25.1,
        "carbs": 20.0,
        "fat": 50.4,
        "source": "CUSTOM",
    },
    {
        "id": "food-milk-2pct",
        "name": "Milk, 2%",
        "brand": None,
        "calories": 50,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 3.4,
        "carbs": 4.8,
        "fat": 2.0,
        "source": "CUSTOM",
    },
    {
        "id": "food-spinach",
        "name": "Spinach",
        "brand": None,
        "calories": 23,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 2.9,
        "carbs": 3.6,
        "fat": 0.4,
        "source": "CUSTOM",
    },
    {
        "id": "food-cottage-cheese",
        "name": "Cottage cheese",
        "brand": None,
        "calories": 98,
        "serving_size": 100,
        "serving_unit": "g",
        "protein": 11.1,
        "carbs": 3.4,
        "fat": 4.3,
        "source": "CUSTOM",
    },
]

DEFAULT_FAVORITE_FOOD_IDS = [seed["id"] for seed in DEFAULT_FOOD_CATALOG_SEEDS]


def _synchronized(method):
    """Run a repository read under the connection lock.

    All access goes through one sqlite3 connection, which must not be used from two threads
    at once. The lock is re-entrant, so a locked method may call these reads.
    """

    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        with self._lock:
            return method(self, *args, **kwargs)

    return wrapper


class SQLiteRepository:
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._lock = threading.RLock()
        self._configure_durability()
        with self._lock:
            apply_pending_migrations(self._connection)
        self._seed_data()

    def _configure_durability(self) -> None:
        """WAL keeps readers and the writer from blocking each other and survives crashes
        better; NORMAL sync is safe with WAL; busy_timeout waits briefly instead of failing."""
        self._connection.execute("PRAGMA foreign_keys = ON")
        if self.database_path != ":memory:":
            self._connection.execute("PRAGMA journal_mode = WAL")
        self._connection.execute("PRAGMA synchronous = NORMAL")
        self._connection.execute("PRAGMA busy_timeout = 5000")

    @_synchronized
    def journal_mode(self) -> str:
        return str(self._connection.execute("PRAGMA journal_mode").fetchone()[0]).lower()

    def _seed_data(self) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT OR IGNORE INTO weekly_metrics (
                    id, calorie_goal, calories_consumed,
                    protein_target, carbs_target, fat_target,
                    protein_consumed, carbs_consumed, fat_consumed,
                    weekly_weight_change, adherence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (1, 14800, 10360, 980, 1260, 420, 742, 901, 308, -1.2, 87),
            )
            self._connection.executemany(
                """
                INSERT OR IGNORE INTO food_catalog (
                    id, name, brand, calories, serving_size, serving_unit,
                    protein, carbs, fat, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        seed["id"],
                        seed["name"],
                        seed["brand"],
                        seed["calories"],
                        seed["serving_size"],
                        seed["serving_unit"],
                        seed["protein"],
                        seed["carbs"],
                        seed["fat"],
                        seed["source"],
                    )
                    for seed in DEFAULT_FOOD_CATALOG_SEEDS
                ],
            )
            self._connection.executemany(
                """
                INSERT OR IGNORE INTO default_favorite_foods (
                    food_id, food_name, brand, calories, serving_size,
                    serving_unit, protein, carbs, fat, source, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        seed["id"],
                        seed["name"],
                        seed["brand"],
                        seed["calories"],
                        seed["serving_size"],
                        seed["serving_unit"],
                        seed["protein"],
                        seed["carbs"],
                        seed["fat"],
                        seed["source"],
                        index + 1,
                    )
                    for index, seed in enumerate(DEFAULT_FOOD_CATALOG_SEEDS)
                ],
            )


    def _row_to_food(self, row: sqlite3.Row) -> FoodItem:
        return FoodItem(
            id=row["id"],
            name=row["name"],
            brand=row["brand"],
            calories=row["calories"],
            serving_size=row["serving_size"],
            serving_unit=row["serving_unit"],
            macros=MacroTargets(protein=row["protein"], carbs=row["carbs"], fat=row["fat"]),
            source=row["source"],
        )

    @_synchronized
    def list_foods(self) -> list[FoodItem]:
        rows = self._connection.execute("SELECT * FROM food_catalog ORDER BY name").fetchall()
        return [self._row_to_food(row) for row in rows]

    @_synchronized
    def get_food_by_id(self, food_id: str) -> FoodItem | None:
        row = self._connection.execute(
            "SELECT * FROM food_catalog WHERE id = ?",
            (food_id,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_food(row)

    @_synchronized
    def search_foods(self, query: str) -> list[FoodItem]:
        normalized = query.strip()
        if not normalized:
            return self.list_foods()
        rows = self._connection.execute(
            """
            SELECT * FROM food_catalog
            WHERE LOWER(name) LIKE LOWER(?) OR LOWER(COALESCE(brand, '')) LIKE LOWER(?)
            ORDER BY name
            """,
            (f"%{normalized}%", f"%{normalized}%"),
        ).fetchall()
        return [self._row_to_food(row) for row in rows]

    def save_food_item(self, food_item: FoodItem) -> FoodItem:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO food_catalog (
                    id, name, brand, calories, serving_size, serving_unit,
                    protein, carbs, fat, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    brand = excluded.brand,
                    calories = excluded.calories,
                    serving_size = excluded.serving_size,
                    serving_unit = excluded.serving_unit,
                    protein = excluded.protein,
                    carbs = excluded.carbs,
                    fat = excluded.fat,
                    source = excluded.source
                """,
                (
                    food_item.id,
                    food_item.name,
                    food_item.brand,
                    food_item.calories,
                    food_item.serving_size,
                    food_item.serving_unit,
                    food_item.macros.protein,
                    food_item.macros.carbs,
                    food_item.macros.fat,
                    food_item.source,
                ),
            )
        persisted = self.get_food_by_id(food_item.id)
        if persisted is None:
            raise RuntimeError("Failed to persist food item.")
        return persisted

    @_synchronized
    def get_weekly_metrics(self) -> WeeklyMetrics:
        row = self._connection.execute("SELECT * FROM weekly_metrics WHERE id = 1").fetchone()
        if row is None:
            return WeeklyMetrics(
                calorie_goal=0,
                calories_consumed=0,
                macro_targets=MacroTargets(protein=0, carbs=0, fat=0),
                macro_consumed=MacroTargets(protein=0, carbs=0, fat=0),
                weekly_weight_change=0.0,
                adherence_score=0,
            )
        return WeeklyMetrics(
            calorie_goal=row["calorie_goal"],
            calories_consumed=row["calories_consumed"],
            macro_targets=MacroTargets(
                protein=row["protein_target"],
                carbs=row["carbs_target"],
                fat=row["fat_target"],
            ),
            macro_consumed=MacroTargets(
                protein=row["protein_consumed"],
                carbs=row["carbs_consumed"],
                fat=row["fat_consumed"],
            ),
            weekly_weight_change=row["weekly_weight_change"],
            adherence_score=row["adherence_score"],
        )

    def save_session(self, session: AuthSession) -> AuthSession:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO auth_sessions (
                    access_token, user_id, email, display_name, expires_at, provider
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(access_token) DO UPDATE SET
                    user_id = excluded.user_id,
                    email = excluded.email,
                    display_name = excluded.display_name,
                    expires_at = excluded.expires_at,
                    provider = excluded.provider
                """,
                (
                    session.access_token,
                    session.user_id,
                    session.email,
                    session.display_name,
                    session.expires_at.isoformat(),
                    session.provider,
                ),
            )
        return session

    @_synchronized
    def get_session(self, access_token: str) -> AuthSession | None:
        row = self._connection.execute(
            "SELECT * FROM auth_sessions WHERE access_token = ?",
            (access_token,),
        ).fetchone()
        if row is None:
            return None
        return AuthSession(
            user_id=row["user_id"],
            email=row["email"],
            display_name=row["display_name"],
            access_token=row["access_token"],
            expires_at=row["expires_at"],
            provider=row["provider"],
        )

    def save_user_identity(
        self,
        *,
        user_id: str,
        email: str,
        display_name: str | None = None,
        timezone: str = "UTC",
        units: str = "imperial",
    ) -> dict[str, Any]:
        """Create or explicitly overwrite the user's display name, timezone, and units.

        Only call this when the user is deliberately changing those settings (for example
        `PUT /profile`). Incidental paths should use `ensure_user_identity`, which never
        overwrites saved settings.
        """
        with self._lock, self._connection:
            user_existed = (
                self._connection.execute(
                    "SELECT 1 FROM users WHERE id = ?",
                    (user_id,),
                ).fetchone()
                is not None
            )
            self._connection.execute(
                """
                INSERT INTO users (id, email)
                VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    email = excluded.email
                """,
                (user_id, email),
            )
            self._connection.execute(
                """
                INSERT INTO user_profiles (user_id, display_name, timezone, units)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    display_name = excluded.display_name,
                    timezone = excluded.timezone,
                    units = excluded.units,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, display_name, timezone, units),
            )
            if not user_existed:
                self._seed_default_favorite_foods_for_user(user_id)
        identity = self.get_user_identity(user_id)
        if identity is None:
            raise RuntimeError("Failed to persist user identity.")
        return identity

    def ensure_user_identity(
        self,
        *,
        user_id: str,
        email: str,
        display_name: str | None = None,
    ) -> dict[str, Any]:
        """Make sure the user and profile rows exist without overwriting saved settings.

        New users get the default timezone and units. Existing users keep their saved
        display name, timezone, and units.
        """
        with self._lock, self._connection:
            user_existed = (
                self._connection.execute(
                    "SELECT 1 FROM users WHERE id = ?",
                    (user_id,),
                ).fetchone()
                is not None
            )
            self._connection.execute(
                """
                INSERT INTO users (id, email)
                VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    email = excluded.email
                """,
                (user_id, email),
            )
            self._connection.execute(
                """
                INSERT INTO user_profiles (user_id, display_name, timezone, units)
                VALUES (?, ?, 'UTC', 'imperial')
                ON CONFLICT(user_id) DO NOTHING
                """,
                (user_id, display_name),
            )
            if not user_existed:
                self._seed_default_favorite_foods_for_user(user_id)
        identity = self.get_user_identity(user_id)
        if identity is None:
            raise RuntimeError("Failed to persist user identity.")
        return identity

    @_synchronized
    def _seed_default_favorite_foods_for_user(self, user_id: str) -> None:
        if (
            self._connection.execute(
                "SELECT 1 FROM user_default_favorite_food_seed_runs WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            is not None
        ):
            return

        default_food_rows = self._connection.execute(
            """
            SELECT food_id, display_order
            FROM default_favorite_foods
            ORDER BY display_order ASC, food_name ASC
            """
        ).fetchall()
        if not default_food_rows:
            return

        seed_base = datetime(2026, 1, 1, 0, 0, 0)
        total_rows = len(default_food_rows)
        for row in default_food_rows:
            display_order = int(row["display_order"])
            created_at = (
                seed_base + timedelta(seconds=total_rows - display_order)
            ).isoformat(timespec="seconds")
            self._connection.execute(
                """
                INSERT INTO saved_favorites (id, user_id, entity_type, entity_id, created_at)
                VALUES (?, ?, 'food', ?, ?)
                ON CONFLICT(user_id, entity_type, entity_id) DO NOTHING
                """,
                (
                    f"seed-favorite-{user_id}-{row['food_id']}",
                    user_id,
                    row["food_id"],
                    created_at,
                ),
            )

        self._connection.execute(
            """
            INSERT INTO user_default_favorite_food_seed_runs (user_id)
            VALUES (?)
            ON CONFLICT(user_id) DO NOTHING
            """,
            (user_id,),
        )

    @_synchronized
    def _ensure_user_exists(self, user_id: str) -> None:
        row = self._connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is not None:
            return

        placeholder_email = f"{user_id}@local.invalid"
        self.ensure_user_identity(user_id=user_id, email=placeholder_email)

    @_synchronized
    def get_user_identity(self, user_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            """
            SELECT
                u.id AS user_id,
                u.email,
                u.created_at AS user_created_at,
                p.display_name,
                p.timezone,
                p.units,
                p.created_at AS profile_created_at,
                p.updated_at AS profile_updated_at,
                p.setup_completed_at,
                CASE WHEN p.setup_completed_at IS NOT NULL THEN 1 ELSE 0 END AS setup_complete,
                p.sex,
                p.age_years,
                p.height_cm,
                p.current_weight_lbs,
                p.goal_type,
                p.goal_pace,
                p.target_weight_lbs,
                p.activity_level,
                p.dietary_pattern,
                p.nutrition_style,
                p.allergy_notes,
                p.bmr_calories,
                p.tdee_calories,
                p.initial_calorie_target,
                p.protein_target_g,
                p.carbs_target_g,
                p.fat_target_g,
                p.fiber_target_g,
                p.calculation_version,
                p.target_source
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.id = ?
            """,
            (user_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def get_user_identity_by_email(self, email: str) -> dict[str, Any] | None:
        normalized_email = email.strip().lower()
        row = self._connection.execute(
            """
            SELECT u.id AS user_id
            FROM users u
            WHERE lower(u.email) = ?
            """,
            (normalized_email,),
        ).fetchone()
        if row is None:
            return None
        return self.get_user_identity(str(row["user_id"]))

    def mark_user_setup_completed(self, user_id: str) -> dict[str, Any] | None:
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                UPDATE user_profiles
                SET setup_completed_at = COALESCE(setup_completed_at, CURRENT_TIMESTAMP),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (user_id,),
            )
        return self.get_user_identity(user_id)

    def save_user_onboarding(
        self,
        *,
        user_id: str,
        sex: str,
        age_years: int,
        height_cm: float,
        current_weight_lbs: float,
        goal_type: str,
        goal_pace: str | None,
        target_weight_lbs: float | None,
        activity_level: str,
        dietary_pattern: str,
        nutrition_style: str,
        allergy_notes: str | None,
        bmr_calories: int,
        tdee_calories: int,
        initial_calorie_target: int,
        protein_target_g: float,
        carbs_target_g: float,
        fat_target_g: float,
        fiber_target_g: float,
        calculation_version: str,
        target_source: str,
    ) -> dict[str, Any]:
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO user_profiles (
                    user_id, sex, age_years, height_cm, current_weight_lbs,
                    goal_type, goal_pace, target_weight_lbs, activity_level,
                    dietary_pattern, nutrition_style, allergy_notes,
                    bmr_calories, tdee_calories, initial_calorie_target,
                    protein_target_g, carbs_target_g, fat_target_g, fiber_target_g,
                    calculation_version, target_source,
                    setup_completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    sex = excluded.sex,
                    age_years = excluded.age_years,
                    height_cm = excluded.height_cm,
                    current_weight_lbs = excluded.current_weight_lbs,
                    goal_type = excluded.goal_type,
                    goal_pace = excluded.goal_pace,
                    target_weight_lbs = excluded.target_weight_lbs,
                    activity_level = excluded.activity_level,
                    dietary_pattern = excluded.dietary_pattern,
                    nutrition_style = excluded.nutrition_style,
                    allergy_notes = excluded.allergy_notes,
                    bmr_calories = excluded.bmr_calories,
                    tdee_calories = excluded.tdee_calories,
                    initial_calorie_target = excluded.initial_calorie_target,
                    protein_target_g = excluded.protein_target_g,
                    carbs_target_g = excluded.carbs_target_g,
                    fat_target_g = excluded.fat_target_g,
                    fiber_target_g = excluded.fiber_target_g,
                    calculation_version = excluded.calculation_version,
                    target_source = excluded.target_source,
                    setup_completed_at = COALESCE(user_profiles.setup_completed_at, excluded.setup_completed_at),
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    user_id,
                    sex,
                    age_years,
                    height_cm,
                    current_weight_lbs,
                    goal_type,
                    goal_pace,
                    target_weight_lbs,
                    activity_level,
                    dietary_pattern,
                    nutrition_style,
                    allergy_notes,
                    bmr_calories,
                    tdee_calories,
                    initial_calorie_target,
                    protein_target_g,
                    carbs_target_g,
                    fat_target_g,
                    fiber_target_g,
                    calculation_version,
                    target_source,
                ),
            )
        profile = self.get_user_identity(user_id)
        if profile is None:
            raise RuntimeError("Failed to persist onboarding profile.")
        return profile

    def save_favorite(
        self,
        *,
        user_id: str,
        entity_type: str,
        entity_id: str,
        favorite_id: str | None = None,
    ) -> dict[str, Any]:
        if entity_type not in {"recipe", "meal_template", "food"}:
            raise ValueError("entity_type must be 'recipe', 'meal_template', or 'food'.")

        identifier = favorite_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO saved_favorites (id, user_id, entity_type, entity_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, entity_type, entity_id) DO NOTHING
                """,
                (identifier, user_id, entity_type, entity_id),
            )

        favorite = self.get_saved_favorite(user_id, entity_type, entity_id)
        if favorite is None:
            raise RuntimeError("Failed to persist favorite.")
        return favorite

    @_synchronized
    def get_saved_favorite(
        self,
        user_id: str,
        entity_type: str,
        entity_id: str,
    ) -> dict[str, Any] | None:
        row = self._connection.execute(
            """
            SELECT *
            FROM saved_favorites
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
            """,
            (user_id, entity_type, entity_id),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_saved_favorites(
        self,
        user_id: str,
        entity_type: str | None = None,
    ) -> list[dict[str, Any]]:
        params: list[Any] = [user_id]
        entity_type_clause = ""
        if entity_type is not None:
            if entity_type not in {"recipe", "meal_template", "food"}:
                raise ValueError("entity_type must be 'recipe', 'meal_template', or 'food'.")
            entity_type_clause = " AND entity_type = ?"
            params.append(entity_type)

        rows = self._connection.execute(
            f"""
            SELECT *
            FROM saved_favorites
            WHERE user_id = ?{entity_type_clause}
            ORDER BY created_at DESC, id DESC
            """,
            params,
        ).fetchall()
        return [dict(row) for row in rows]

    def is_saved_favorite(self, user_id: str, entity_type: str, entity_id: str) -> bool:
        return self.get_saved_favorite(user_id, entity_type, entity_id) is not None

    def remove_favorite(self, *, user_id: str, entity_type: str, entity_id: str) -> None:
        if entity_type not in {"recipe", "meal_template", "food"}:
            raise ValueError("entity_type must be 'recipe', 'meal_template', or 'food'.")
        with self._lock, self._connection:
            self._connection.execute(
                """
                DELETE FROM saved_favorites
                WHERE user_id = ? AND entity_type = ? AND entity_id = ?
                """,
                (user_id, entity_type, entity_id),
            )

    def save_user_goal(
        self,
        *,
        user_id: str,
        effective_at: date,
        calorie_goal: int,
        protein_goal: float,
        carbs_goal: float,
        fat_goal: float,
        fiber_goal: float | None = None,
        goal_type: str | None = None,
        goal_pace: str | None = None,
        calculation_version: str | None = None,
        target_source: str | None = None,
        target_weight_lbs: float | None = None,
        goal_id: str | None = None,
    ) -> dict[str, Any]:
        identifier = goal_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO user_goals (
                    id, user_id, effective_at, calorie_goal, protein_goal,
                    carbs_goal, fat_goal, fiber_goal, goal_type, goal_pace,
                    calculation_version, target_source, target_weight_lbs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id = excluded.user_id,
                    effective_at = excluded.effective_at,
                    calorie_goal = excluded.calorie_goal,
                    protein_goal = excluded.protein_goal,
                    carbs_goal = excluded.carbs_goal,
                    fat_goal = excluded.fat_goal,
                    fiber_goal = excluded.fiber_goal,
                    goal_type = excluded.goal_type,
                    goal_pace = excluded.goal_pace,
                    calculation_version = excluded.calculation_version,
                    target_source = excluded.target_source,
                    target_weight_lbs = excluded.target_weight_lbs
                """,
                (
                    identifier,
                    user_id,
                    effective_at.isoformat(),
                    calorie_goal,
                    protein_goal,
                    carbs_goal,
                    fat_goal,
                    fiber_goal,
                    goal_type,
                    goal_pace,
                    calculation_version,
                    target_source,
                    target_weight_lbs,
                ),
            )
        goal = self.get_user_goal(identifier)
        if goal is None:
            raise RuntimeError("Failed to persist user goal.")
        return goal

    @_synchronized
    def get_user_goal(self, goal_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM user_goals WHERE id = ?",
            (goal_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_user_goals(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM user_goals
            WHERE user_id = ?
            ORDER BY effective_at DESC, created_at DESC, rowid DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def create_food_log(
        self,
        *,
        user_id: str,
        log_date: date,
        notes: str | None = None,
        food_log_id: str | None = None,
    ) -> str:
        identifier = food_log_id or f"log-{user_id}-{log_date.isoformat()}"
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO food_logs (id, user_id, log_date, notes)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, log_date) DO UPDATE SET
                    notes = COALESCE(excluded.notes, food_logs.notes),
                    updated_at = CURRENT_TIMESTAMP
                """,
                (identifier, user_id, log_date.isoformat(), notes),
            )
        return identifier

    @_synchronized
    def get_food_log_for_date(self, user_id: str, log_date: date) -> dict[str, Any] | None:
        row = self._connection.execute(
            """
            SELECT * FROM food_logs
            WHERE user_id = ? AND log_date = ?
            """,
            (user_id, log_date.isoformat()),
        ).fetchone()
        if row is None:
            return None
        return self.get_food_log(row["id"])

    def add_food_log_entry(
        self,
        *,
        food_log_id: str,
        entry_type: str = "food",
        calories: float,
        protein: float,
        carbs: float,
        fat: float,
        grams: float = 0,
        servings: float = 1,
        food_item_id: str | None = None,
        meal_template_id: str | None = None,
        meal_plan_slot_id: str | None = None,
        display_name_override: str | None = None,
        created_at: str | None = None,
        entry_id: str | None = None,
    ) -> str:
        identifier = entry_id or str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO food_log_entries (
                    id, food_log_id, entry_type, food_item_id, meal_template_id,
                    meal_plan_slot_id, display_name_override, grams, servings, calories, protein, carbs, fat, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    food_log_id,
                    entry_type,
                    food_item_id,
                    meal_template_id,
                    meal_plan_slot_id,
                    display_name_override,
                    grams,
                    servings,
                    calories,
                    protein,
                    carbs,
                    fat,
                    created_at or datetime.now(UTC).isoformat(),
                ),
            )
        return identifier

    @_synchronized
    def list_food_log_entries(self, food_log_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT
                entries.*,
                CASE
                    WHEN entries.display_name_override IS NOT NULL THEN entries.display_name_override
                    WHEN entries.entry_type = 'meal' THEN meals.name
                    ELSE foods.name
                END AS display_name,
                foods.brand AS brand,
                foods.source AS source
            FROM food_log_entries entries
            LEFT JOIN food_catalog foods ON foods.id = entries.food_item_id
            LEFT JOIN meal_templates meals ON meals.id = entries.meal_template_id
            WHERE entries.food_log_id = ?
            ORDER BY created_at, id
            """,
            (food_log_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def delete_food_log_entries_by_meal_plan_slot(self, meal_plan_slot_id: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "DELETE FROM food_log_entries WHERE meal_plan_slot_id = ?",
                (meal_plan_slot_id,),
            )

    def reconcile_meal_plan_food_log_links(self, user_id: str) -> None:
        with self._lock, self._connection:
            rows = self._connection.execute(
                """
                SELECT
                    slots.id,
                    slots.meal_label,
                    slots.title,
                    slots.calories,
                    slots.items_json,
                    slots.eaten_at,
                    days.plan_date
                FROM meal_plan_slots slots
                JOIN meal_plan_days days ON days.id = slots.meal_plan_day_id
                WHERE days.user_id = ?
                ORDER BY days.plan_date ASC, slots.position ASC, slots.id ASC
                """,
                (user_id,),
            ).fetchall()

            for row in rows:
                self._connection.execute(
                    "DELETE FROM food_log_entries WHERE meal_plan_slot_id = ? AND ? IS NULL",
                    (row["id"], row["eaten_at"]),
                )
                if row["eaten_at"] is None:
                    continue

                existing = self._connection.execute(
                    "SELECT id FROM food_log_entries WHERE meal_plan_slot_id = ?",
                    (row["id"],),
                ).fetchone()
                if existing is not None:
                    continue

                items = json.loads(row["items_json"]) if row["items_json"] else []
                protein = 0.0
                carbs = 0.0
                fat = 0.0
                for item in items:
                    macros = item.get("macros", {})
                    protein += float(macros.get("protein", 0) or 0)
                    carbs += float(macros.get("carbs", 0) or 0)
                    fat += float(macros.get("fat", 0) or 0)

                food_log_row = self._connection.execute(
                    """
                    SELECT id FROM food_logs
                    WHERE user_id = ? AND log_date = ?
                    """,
                    (user_id, row["plan_date"]),
                ).fetchone()
                food_log_id = food_log_row["id"] if food_log_row is not None else f"log-{user_id}-{row['plan_date']}"
                if food_log_row is None:
                    self._connection.execute(
                        """
                        INSERT INTO food_logs (id, user_id, log_date, notes)
                        VALUES (?, ?, ?, NULL)
                        """,
                        (food_log_id, user_id, row["plan_date"]),
                    )

                self._connection.execute(
                    """
                    INSERT INTO food_log_entries (
                        id,
                        food_log_id,
                        entry_type,
                        meal_plan_slot_id,
                        display_name_override,
                        grams,
                        servings,
                        calories,
                        protein,
                        carbs,
                        fat,
                        created_at
                    ) VALUES (?, ?, 'meal', ?, ?, 0, 1, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        food_log_id,
                        row["id"],
                        f"{row['meal_label']}: {row['title']}",
                        row["calories"],
                        round(protein, 1),
                        round(carbs, 1),
                        round(fat, 1),
                        row["eaten_at"],
                    ),
                )

    @_synchronized
    def get_food_log(self, food_log_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM food_logs WHERE id = ?",
            (food_log_id,),
        ).fetchone()
        if row is None:
            return None
        log = dict(row)
        log["entries"] = self.list_food_log_entries(food_log_id)
        return log

    @_synchronized
    def list_food_logs(self, user_id: str) -> list[dict[str, Any]]:
        self.reconcile_meal_plan_food_log_links(user_id)
        rows = self._connection.execute(
            """
            SELECT * FROM food_logs
            WHERE user_id = ?
            ORDER BY log_date DESC, created_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def create_exercise_entry(
        self,
        *,
        user_id: str,
        title: str,
        duration_minutes: int,
        calories_burned: int,
        logged_on: date,
        logged_at: str,
        intensity: str,
        exercise_entry_id: str | None = None,
    ) -> str:
        identifier = exercise_entry_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO exercise_entries (
                    id, user_id, title, duration_minutes, calories_burned,
                    logged_on, logged_at, intensity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    user_id,
                    title,
                    duration_minutes,
                    calories_burned,
                    logged_on.isoformat(),
                    logged_at,
                    intensity,
                ),
            )
        return identifier

    @_synchronized
    def get_exercise_entry(self, exercise_entry_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM exercise_entries WHERE id = ?",
            (exercise_entry_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_exercise_entries(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM exercise_entries
            WHERE user_id = ?
            ORDER BY logged_on DESC, created_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def _infer_planned_workout_type(self, title: str) -> str:
        normalized = title.lower()
        if "swim" in normalized:
            return "swim"
        if "bike" in normalized or "ride" in normalized or "cycle" in normalized:
            return "bike"
        if "run" in normalized or "jog" in normalized:
            return "run"
        if "lift" in normalized or "strength" in normalized or "weight" in normalized:
            return "weights"
        return "custom"

    @_synchronized
    def _upsert_planned_workout_structure_for_legacy_entry_locked(self, entry: dict[str, Any]) -> None:
        session_id = str(entry["id"])
        block_id = f"{session_id}-activity"
        segment_id = f"{block_id}-1"
        workout_type = self._infer_planned_workout_type(str(entry["title"]))
        status = "completed" if entry.get("completed_at") else "planned"
        created_at = entry.get("created_at") or datetime.now(UTC).isoformat()
        updated_at = entry.get("updated_at") or created_at

        self._connection.execute(
            """
            INSERT INTO planned_workout_sessions (
                id,
                user_id,
                legacy_planned_exercise_entry_id,
                title,
                workout_type,
                planned_on,
                planned_at,
                notes,
                estimated_calories_burned,
                status,
                completed_at,
                completed_exercise_entry_id,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                user_id = excluded.user_id,
                legacy_planned_exercise_entry_id = excluded.legacy_planned_exercise_entry_id,
                title = excluded.title,
                workout_type = excluded.workout_type,
                planned_on = excluded.planned_on,
                planned_at = excluded.planned_at,
                estimated_calories_burned = excluded.estimated_calories_burned,
                status = excluded.status,
                completed_at = excluded.completed_at,
                completed_exercise_entry_id = excluded.completed_exercise_entry_id,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                session_id,
                entry["user_id"],
                session_id,
                entry["title"],
                workout_type,
                entry["planned_on"],
                entry["planned_at"],
                entry["calories_burned"],
                status,
                entry.get("completed_at"),
                entry.get("completed_exercise_entry_id"),
                created_at,
                updated_at,
            ),
        )
        self._connection.execute(
            """
            INSERT INTO planned_workout_blocks (
                id, session_id, block_kind, position, title, notes, created_at, updated_at
            ) VALUES (?, ?, 'activity', 0, 'Main set', NULL, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                session_id = excluded.session_id,
                block_kind = excluded.block_kind,
                position = excluded.position,
                title = excluded.title,
                updated_at = CURRENT_TIMESTAMP
            """,
            (block_id, session_id, created_at, updated_at),
        )
        self._connection.execute(
            """
            INSERT INTO planned_workout_segments (
                id,
                block_id,
                position,
                segment_type,
                title,
                activity_type,
                duration_minutes,
                distance_value,
                distance_unit,
                reps,
                intensity,
                notes,
                calories_estimate,
                created_at,
                updated_at
            ) VALUES (?, ?, 0, 'time', ?, ?, ?, NULL, NULL, NULL, ?, NULL, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                block_id = excluded.block_id,
                position = excluded.position,
                segment_type = excluded.segment_type,
                title = excluded.title,
                activity_type = excluded.activity_type,
                duration_minutes = excluded.duration_minutes,
                intensity = excluded.intensity,
                calories_estimate = excluded.calories_estimate,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                segment_id,
                block_id,
                entry["title"],
                workout_type,
                entry["duration_minutes"],
                entry["intensity"],
                entry["calories_burned"],
                created_at,
                updated_at,
            ),
        )

    @_synchronized
    def _backfill_planned_workout_structure_locked(self) -> None:
        legacy_rows = self._connection.execute(
            """
            SELECT * FROM planned_exercise_entries
            ORDER BY planned_on ASC, planned_at ASC, created_at ASC, id ASC
            """
        ).fetchall()
        for row in legacy_rows:
            self._upsert_planned_workout_structure_for_legacy_entry_locked(dict(row))

    @_synchronized
    def _list_planned_workout_sessions_locked(self, user_id: str) -> list[dict[str, Any]]:
        sessions = [
            dict(row)
            for row in self._connection.execute(
                """
                SELECT * FROM planned_workout_sessions
                WHERE user_id = ?
                ORDER BY planned_on ASC, planned_at ASC, created_at ASC, id ASC
                """,
                (user_id,),
            ).fetchall()
        ]
        if not sessions:
            return []

        session_ids = [session["id"] for session in sessions]
        placeholders = ",".join("?" for _ in session_ids)
        blocks = [
            dict(row)
            for row in self._connection.execute(
                f"""
                SELECT * FROM planned_workout_blocks
                WHERE session_id IN ({placeholders})
                ORDER BY session_id ASC, position ASC, id ASC
                """,
                session_ids,
            ).fetchall()
        ]
        block_ids = [block["id"] for block in blocks]
        segments_by_block_id: dict[str, list[dict[str, Any]]] = {}
        if block_ids:
            block_placeholders = ",".join("?" for _ in block_ids)
            segments = [
                dict(row)
                for row in self._connection.execute(
                    f"""
                    SELECT * FROM planned_workout_segments
                    WHERE block_id IN ({block_placeholders})
                    ORDER BY block_id ASC, position ASC, id ASC
                    """,
                    block_ids,
                ).fetchall()
            ]
            for segment in segments:
                segments_by_block_id.setdefault(str(segment["block_id"]), []).append(segment)

        blocks_by_session_id: dict[str, list[dict[str, Any]]] = {}
        for block in blocks:
            block["segments"] = segments_by_block_id.get(str(block["id"]), [])
            blocks_by_session_id.setdefault(str(block["session_id"]), []).append(block)

        for session in sessions:
            session["blocks"] = blocks_by_session_id.get(str(session["id"]), [])
        return sessions

    def list_planned_workout_sessions(self, user_id: str) -> list[dict[str, Any]]:
        with self._lock, self._connection:
            self._backfill_planned_workout_structure_locked()
            return self._list_planned_workout_sessions_locked(user_id)

    def get_planned_workout_session(self, user_id: str, planned_workout_session_id: str) -> dict[str, Any] | None:
        with self._lock, self._connection:
            self._backfill_planned_workout_structure_locked()
            sessions = self._list_planned_workout_sessions_locked(user_id)
            for session in sessions:
                if session["id"] == planned_workout_session_id:
                    return session
            return None

    @_synchronized
    def _replace_planned_workout_blocks_locked(
        self,
        planned_workout_session_id: str,
        blocks: list[dict[str, Any]],
    ) -> None:
        existing_block_rows = self._connection.execute(
            "SELECT id FROM planned_workout_blocks WHERE session_id = ?",
            (planned_workout_session_id,),
        ).fetchall()
        existing_block_ids = [str(row["id"]) for row in existing_block_rows]
        if existing_block_ids:
            placeholders = ",".join("?" for _ in existing_block_ids)
            self._connection.execute(
                f"DELETE FROM planned_workout_segments WHERE block_id IN ({placeholders})",
                existing_block_ids,
            )
        self._connection.execute(
            "DELETE FROM planned_workout_blocks WHERE session_id = ?",
            (planned_workout_session_id,),
        )

        for block_position, block in enumerate(blocks):
            block_id = str(uuid4())
            self._connection.execute(
                """
                INSERT INTO planned_workout_blocks (
                    id, session_id, block_kind, position, title, notes
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    block_id,
                    planned_workout_session_id,
                    block["block_kind"],
                    block_position,
                    block["title"],
                    block.get("notes"),
                ),
            )
            for segment_position, segment in enumerate(block.get("segments", [])):
                self._connection.execute(
                    """
                    INSERT INTO planned_workout_segments (
                        id, block_id, position, segment_type, title, activity_type,
                        duration_minutes, distance_value, distance_unit, reps, intensity,
                        notes, calories_estimate
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        block_id,
                        segment_position,
                        segment["segment_type"],
                        segment["title"],
                        segment.get("activity_type"),
                        segment.get("duration_minutes"),
                        segment.get("distance_value"),
                        segment.get("distance_unit"),
                        segment.get("reps"),
                        segment.get("intensity"),
                        segment.get("notes"),
                        segment.get("calories_estimate"),
                    ),
                )

    def _summarize_planned_workout_blocks(
        self,
        blocks: list[dict[str, Any]],
        fallback_intensity: str = "Moderate",
    ) -> tuple[int, str]:
        total_duration_minutes = 0
        seen_intensities: set[str] = set()
        for block in blocks:
            for segment in block.get("segments", []):
                duration_minutes = segment.get("duration_minutes")
                if isinstance(duration_minutes, int) and duration_minutes > 0:
                    total_duration_minutes += duration_minutes
                intensity = segment.get("intensity")
                if isinstance(intensity, str) and intensity:
                    seen_intensities.add(intensity)

        for intensity in ("High", "Moderate", "Low"):
            if intensity in seen_intensities:
                return total_duration_minutes, intensity
        return total_duration_minutes, fallback_intensity

    def create_planned_workout_session(
        self,
        *,
        user_id: str,
        title: str,
        workout_type: str,
        planned_on: date,
        planned_at: str,
        notes: str | None,
        estimated_calories_burned: int,
        blocks: list[dict[str, Any]],
        planned_workout_session_id: str | None = None,
    ) -> str:
        identifier = planned_workout_session_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO planned_workout_sessions (
                    id, user_id, legacy_planned_exercise_entry_id, title, workout_type,
                    planned_on, planned_at, notes, estimated_calories_burned, status,
                    completed_at, completed_exercise_entry_id
                ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'planned', NULL, NULL)
                """,
                (
                    identifier,
                    user_id,
                    title,
                    workout_type,
                    planned_on.isoformat(),
                    planned_at,
                    notes,
                    estimated_calories_burned,
                ),
            )
            self._replace_planned_workout_blocks_locked(identifier, blocks)
        return identifier

    def create_planned_exercise_entry(
        self,
        *,
        user_id: str,
        title: str,
        duration_minutes: int,
        calories_burned: int,
        planned_on: date,
        planned_at: str,
        intensity: str,
        planned_exercise_entry_id: str | None = None,
    ) -> str:
        identifier = planned_exercise_entry_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO planned_exercise_entries (
                    id, user_id, title, duration_minutes, calories_burned,
                    planned_on, planned_at, intensity, completed_at, completed_exercise_entry_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
                """,
                (
                    identifier,
                    user_id,
                    title,
                    duration_minutes,
                    calories_burned,
                    planned_on.isoformat(),
                    planned_at,
                    intensity,
                ),
            )
            entry = self.get_planned_exercise_entry(identifier)
            if entry is not None:
                self._upsert_planned_workout_structure_for_legacy_entry_locked(entry)
        return identifier

    @_synchronized
    def get_planned_exercise_entry(self, planned_exercise_entry_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM planned_exercise_entries WHERE id = ?",
            (planned_exercise_entry_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_planned_exercise_entries(self, user_id: str) -> list[dict[str, Any]]:
        with self._lock, self._connection:
            self._backfill_planned_workout_structure_locked()
        rows = self._connection.execute(
            """
            SELECT * FROM planned_exercise_entries
            WHERE user_id = ?
            ORDER BY planned_on ASC, planned_at ASC, created_at ASC, id ASC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def update_planned_workout_session(
        self,
        *,
        user_id: str,
        planned_workout_session_id: str,
        title: str,
        workout_type: str,
        planned_on: date,
        planned_at: str,
        notes: str | None,
        estimated_calories_burned: int,
        blocks: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT * FROM planned_workout_sessions WHERE id = ?",
                (planned_workout_session_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return None

            self._connection.execute(
                """
                UPDATE planned_workout_sessions
                SET
                    title = ?,
                    workout_type = ?,
                    planned_on = ?,
                    planned_at = ?,
                    notes = ?,
                    estimated_calories_burned = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    title,
                    workout_type,
                    planned_on.isoformat(),
                    planned_at,
                    notes,
                    estimated_calories_burned,
                    planned_workout_session_id,
                ),
            )
            self._replace_planned_workout_blocks_locked(planned_workout_session_id, blocks)

            legacy_planned_exercise_entry_id = row["legacy_planned_exercise_entry_id"]
            if legacy_planned_exercise_entry_id:
                total_duration_minutes, intensity = self._summarize_planned_workout_blocks(
                    blocks,
                    fallback_intensity="Moderate",
                )
                total_duration_minutes = max(total_duration_minutes, 1)
                self._connection.execute(
                    """
                    UPDATE planned_exercise_entries
                    SET
                        title = ?,
                        duration_minutes = ?,
                        calories_burned = ?,
                        planned_on = ?,
                        planned_at = ?,
                        intensity = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (
                        title,
                        total_duration_minutes,
                        estimated_calories_burned,
                        planned_on.isoformat(),
                        planned_at,
                        intensity,
                        legacy_planned_exercise_entry_id,
                    ),
                )
                completed_exercise_entry_id = row["completed_exercise_entry_id"]
                if completed_exercise_entry_id:
                    completed_at_value = row["completed_at"]
                    logged_on = planned_on.isoformat()
                    logged_at = planned_at
                    if completed_at_value:
                        try:
                            completed_at = datetime.fromisoformat(str(completed_at_value).replace("Z", "+00:00"))
                        except ValueError:
                            completed_at = None
                        if completed_at is not None:
                            logged_on = completed_at.date().isoformat()
                            logged_at = completed_at.strftime("%H:%M")
                    self._connection.execute(
                        """
                        UPDATE exercise_entries
                        SET title = ?, duration_minutes = ?, calories_burned = ?, logged_on = ?, logged_at = ?, intensity = ?
                        WHERE id = ?
                        """,
                        (
                            title,
                            total_duration_minutes,
                            estimated_calories_burned,
                            logged_on,
                            logged_at,
                            intensity,
                            completed_exercise_entry_id,
                        ),
                    )

            for session in self._list_planned_workout_sessions_locked(user_id):
                if session["id"] == planned_workout_session_id:
                    return session
            return None

    def update_planned_exercise_entry(
        self,
        *,
        user_id: str,
        planned_exercise_entry_id: str,
        title: str,
        duration_minutes: int,
        calories_burned: int,
        planned_on: date,
        planned_at: str,
        intensity: str,
    ) -> dict[str, Any] | None:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT * FROM planned_exercise_entries WHERE id = ?",
                (planned_exercise_entry_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return None

            self._connection.execute(
                """
                UPDATE planned_exercise_entries
                SET
                    title = ?,
                    duration_minutes = ?,
                    calories_burned = ?,
                    planned_on = ?,
                    planned_at = ?,
                    intensity = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    title,
                    duration_minutes,
                    calories_burned,
                    planned_on.isoformat(),
                    planned_at,
                    intensity,
                    planned_exercise_entry_id,
                ),
                )

            completed_exercise_entry_id = row["completed_exercise_entry_id"]
            if completed_exercise_entry_id:
                completed_at_value = row["completed_at"]
                logged_on = planned_on.isoformat()
                logged_at = planned_at
                if completed_at_value:
                    try:
                        completed_at = datetime.fromisoformat(str(completed_at_value).replace("Z", "+00:00"))
                    except ValueError:
                        completed_at = None
                    if completed_at is not None:
                        logged_on = completed_at.date().isoformat()
                        logged_at = completed_at.strftime("%H:%M")
                self._connection.execute(
                    """
                    UPDATE exercise_entries
                    SET title = ?, duration_minutes = ?, calories_burned = ?, logged_on = ?, logged_at = ?, intensity = ?
                    WHERE id = ?
                    """,
                    (
                        title,
                        duration_minutes,
                        calories_burned,
                        logged_on,
                        logged_at,
                        intensity,
                        completed_exercise_entry_id,
                    ),
                )
            entry = self.get_planned_exercise_entry(planned_exercise_entry_id)
            if entry is not None:
                self._upsert_planned_workout_structure_for_legacy_entry_locked(entry)
            return entry

    def delete_planned_exercise_entry(
        self,
        *,
        user_id: str,
        planned_exercise_entry_id: str,
    ) -> bool:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT * FROM planned_exercise_entries WHERE id = ?",
                (planned_exercise_entry_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return False

            # Keep any completed exercise_entries row: deleting a plan must not
            # erase logged exercise history.
            self._connection.execute(
                "DELETE FROM planned_workout_sessions WHERE id = ?",
                (planned_exercise_entry_id,),
            )

            self._connection.execute(
                "DELETE FROM planned_exercise_entries WHERE id = ?",
                (planned_exercise_entry_id,),
            )
            return True

    def delete_exercise_entry(self, exercise_entry_id: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "DELETE FROM exercise_entries WHERE id = ?",
                (exercise_entry_id,),
            )

    def update_planned_workout_session_completion(
        self,
        *,
        user_id: str,
        planned_workout_session_id: str,
        completed_at: datetime | None,
    ) -> dict[str, Any] | None:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT * FROM planned_workout_sessions WHERE id = ?",
                (planned_workout_session_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return None

            legacy_planned_exercise_entry_id = row["legacy_planned_exercise_entry_id"]
            if legacy_planned_exercise_entry_id:
                existing_completed_exercise_entry_id = row["completed_exercise_entry_id"]
                if existing_completed_exercise_entry_id:
                    self._connection.execute(
                        "DELETE FROM exercise_entries WHERE id = ?",
                        (existing_completed_exercise_entry_id,),
                    )

                next_completed_exercise_entry_id: str | None = None
                next_completed_at = completed_at.isoformat() if completed_at is not None else None
                if completed_at is not None:
                    session_blocks: list[dict[str, Any]] = []
                    for session in self._list_planned_workout_sessions_locked(user_id):
                        if session["id"] == planned_workout_session_id:
                            session_blocks = session["blocks"]
                            break
                    total_duration_minutes, intensity = self._summarize_planned_workout_blocks(
                        session_blocks,
                        fallback_intensity="Moderate",
                    )
                    next_completed_exercise_entry_id = str(uuid4())
                    self._connection.execute(
                        """
                        INSERT INTO exercise_entries (
                            id, user_id, title, duration_minutes, calories_burned,
                            logged_on, logged_at, intensity
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            next_completed_exercise_entry_id,
                            user_id,
                            row["title"],
                            max(1, total_duration_minutes),
                            row["estimated_calories_burned"],
                            completed_at.date().isoformat(),
                            completed_at.strftime("%H:%M"),
                            intensity,
                        ),
                    )
                self._connection.execute(
                    """
                    UPDATE planned_exercise_entries
                    SET completed_at = ?, completed_exercise_entry_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (next_completed_at, next_completed_exercise_entry_id, legacy_planned_exercise_entry_id),
                )
                self._connection.execute(
                    """
                    UPDATE planned_workout_sessions
                    SET status = ?, completed_at = ?, completed_exercise_entry_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (
                        "completed" if completed_at is not None else "planned",
                        next_completed_at,
                        next_completed_exercise_entry_id,
                        planned_workout_session_id,
                    ),
                )
                for session in self._list_planned_workout_sessions_locked(user_id):
                    if session["id"] == planned_workout_session_id:
                        return session
                return None

            existing_completed_exercise_entry_id = row["completed_exercise_entry_id"]
            if existing_completed_exercise_entry_id:
                self._connection.execute(
                    "DELETE FROM exercise_entries WHERE id = ?",
                    (existing_completed_exercise_entry_id,),
                )

            next_completed_exercise_entry_id: str | None = None
            next_completed_at = completed_at.isoformat() if completed_at is not None else None
            if completed_at is not None:
                blocks: list[dict[str, Any]] = []
                for session in self._list_planned_workout_sessions_locked(user_id):
                    if session["id"] == planned_workout_session_id:
                        blocks = session["blocks"]
                        break
                total_duration_minutes, intensity = self._summarize_planned_workout_blocks(
                    blocks,
                    fallback_intensity="Moderate",
                )
                next_completed_exercise_entry_id = str(uuid4())
                self._connection.execute(
                    """
                    INSERT INTO exercise_entries (
                        id, user_id, title, duration_minutes, calories_burned,
                        logged_on, logged_at, intensity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        next_completed_exercise_entry_id,
                        user_id,
                        row["title"],
                        max(total_duration_minutes, 1),
                        row["estimated_calories_burned"],
                        completed_at.date().isoformat(),
                        completed_at.strftime("%H:%M"),
                        intensity,
                    ),
                )

            self._connection.execute(
                """
                UPDATE planned_workout_sessions
                SET status = ?, completed_at = ?, completed_exercise_entry_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    "completed" if completed_at is not None else "planned",
                    next_completed_at,
                    next_completed_exercise_entry_id,
                    planned_workout_session_id,
                ),
            )
            for session in self._list_planned_workout_sessions_locked(user_id):
                if session["id"] == planned_workout_session_id:
                    return session
            return None

    def delete_planned_workout_session(
        self,
        *,
        user_id: str,
        planned_workout_session_id: str,
    ) -> bool:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT * FROM planned_workout_sessions WHERE id = ?",
                (planned_workout_session_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return False

            # Deleting a plan never erases logged exercise history: the linked
            # exercise_entries row is kept (it is only referenced, never owned).
            # Blocks and segments cascade from planned_workout_sessions.
            legacy_planned_exercise_entry_id = row["legacy_planned_exercise_entry_id"]
            if legacy_planned_exercise_entry_id:
                self._connection.execute(
                    "DELETE FROM planned_exercise_entries WHERE id = ?",
                    (legacy_planned_exercise_entry_id,),
                )
            self._connection.execute(
                "DELETE FROM planned_workout_sessions WHERE id = ?",
                (planned_workout_session_id,),
            )
            return True

    def update_planned_exercise_entry_completion(
        self,
        *,
        user_id: str,
        planned_exercise_entry_id: str,
        completed_at: datetime | None,
    ) -> dict[str, Any] | None:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT * FROM planned_exercise_entries WHERE id = ?",
                (planned_exercise_entry_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return None

            existing_completed_exercise_entry_id = row["completed_exercise_entry_id"]
            if existing_completed_exercise_entry_id:
                self._connection.execute(
                    "DELETE FROM exercise_entries WHERE id = ?",
                    (existing_completed_exercise_entry_id,),
                )

            next_completed_exercise_entry_id: str | None = None
            next_completed_at = completed_at.isoformat() if completed_at is not None else None
            if completed_at is not None:
                next_completed_exercise_entry_id = str(uuid4())
                self._connection.execute(
                    """
                    INSERT INTO exercise_entries (
                        id, user_id, title, duration_minutes, calories_burned,
                        logged_on, logged_at, intensity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        next_completed_exercise_entry_id,
                        user_id,
                        row["title"],
                        row["duration_minutes"],
                        row["calories_burned"],
                        completed_at.date().isoformat(),
                        completed_at.strftime("%H:%M"),
                        row["intensity"],
                    ),
                )

            self._connection.execute(
                """
                UPDATE planned_exercise_entries
                SET completed_at = ?, completed_exercise_entry_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (next_completed_at, next_completed_exercise_entry_id, planned_exercise_entry_id),
            )
            entry = self.get_planned_exercise_entry(planned_exercise_entry_id)
            if entry is not None:
                self._upsert_planned_workout_structure_for_legacy_entry_locked(entry)
            return entry

    def save_meal_plan_day(
        self,
        *,
        user_id: str,
        plan_date: date,
        label: str,
        focus: str,
        slots: list[dict[str, Any]],
        meal_plan_day_id: str | None = None,
    ) -> str:
        identifier = meal_plan_day_id or f"meal-plan-{user_id}-{plan_date.isoformat()}"
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO meal_plan_days (id, user_id, plan_date, label, focus)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, plan_date) DO UPDATE SET
                    label = excluded.label,
                    focus = excluded.focus,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (identifier, user_id, plan_date.isoformat(), label, focus),
            )
            row = self._connection.execute(
                "SELECT id FROM meal_plan_days WHERE user_id = ? AND plan_date = ?",
                (user_id, plan_date.isoformat()),
            ).fetchone()
            actual_id = row["id"] if row is not None else identifier
            self._connection.execute(
                """
                DELETE FROM food_log_entries
                WHERE meal_plan_slot_id IN (
                    SELECT id FROM meal_plan_slots WHERE meal_plan_day_id = ?
                )
                """,
                (actual_id,),
            )
            self._connection.execute(
                "DELETE FROM meal_plan_slots WHERE meal_plan_day_id = ?",
                (actual_id,),
            )
            for index, slot in enumerate(slots):
                self._connection.execute(
                    """
                    INSERT INTO meal_plan_slots (
                        id, meal_plan_day_id, position, meal_label, title, calories, items_json, eaten_at, prep_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        actual_id,
                        index,
                        slot["meal_label"],
                        slot["title"],
                        slot["calories"],
                        json.dumps(slot.get("items", [])),
                        slot.get("eaten_at"),
                        slot["prep_status"],
                    ),
                )
        return actual_id

    @_synchronized
    def _list_meal_plan_slots(self, meal_plan_day_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM meal_plan_slots
            WHERE meal_plan_day_id = ?
            ORDER BY position ASC, id ASC
            """,
            (meal_plan_day_id,),
        ).fetchall()
        slots: list[dict[str, Any]] = []
        for row in rows:
            payload = dict(row)
            items_json = payload.get("items_json")
            if items_json:
                payload["items"] = json.loads(items_json)
            else:
                payload["items"] = []
            slots.append(payload)
        return slots

    @_synchronized
    def get_meal_plan_day(self, meal_plan_day_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM meal_plan_days WHERE id = ?",
            (meal_plan_day_id,),
        ).fetchone()
        if row is None:
            return None
        day = dict(row)
        day["slots"] = self._list_meal_plan_slots(meal_plan_day_id)
        return day

    @_synchronized
    def list_meal_plan_days(self, user_id: str) -> list[dict[str, Any]]:
        self.reconcile_meal_plan_food_log_links(user_id)
        rows = self._connection.execute(
            """
            SELECT * FROM meal_plan_days
            WHERE user_id = ?
            ORDER BY plan_date ASC, created_at ASC
            """,
            (user_id,),
        ).fetchall()
        return [
            {
                **dict(row),
                "slots": self._list_meal_plan_slots(row["id"]),
            }
            for row in rows
        ]

    def update_meal_plan_slot_eaten_at(
        self,
        user_id: str,
        slot_id: str,
        eaten_at: datetime | None,
    ) -> dict[str, Any] | None:
        with self._lock, self._connection:
            row = self._connection.execute(
                """
                SELECT
                    slots.*,
                    days.id AS meal_plan_day_id,
                    days.user_id AS user_id,
                    days.plan_date AS plan_date
                FROM meal_plan_slots slots
                JOIN meal_plan_days days ON days.id = slots.meal_plan_day_id
                WHERE slots.id = ?
                """,
                (slot_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return None
            items = json.loads(row["items_json"]) if row["items_json"] else []
            protein = 0.0
            carbs = 0.0
            fat = 0.0
            for item in items:
                macros = item.get("macros", {})
                protein += float(macros.get("protein", 0) or 0)
                carbs += float(macros.get("carbs", 0) or 0)
                fat += float(macros.get("fat", 0) or 0)
            self._connection.execute(
                "UPDATE meal_plan_slots SET eaten_at = ? WHERE id = ?",
                (eaten_at.isoformat() if eaten_at is not None else None, slot_id),
            )
            self._connection.execute(
                "DELETE FROM food_log_entries WHERE meal_plan_slot_id = ?",
                (slot_id,),
            )
            if eaten_at is not None:
                food_log_row = self._connection.execute(
                    """
                    SELECT id FROM food_logs
                    WHERE user_id = ? AND log_date = ?
                    """,
                    (user_id, row["plan_date"]),
                ).fetchone()
                food_log_id = food_log_row["id"] if food_log_row is not None else f"log-{user_id}-{row['plan_date']}"
                if food_log_row is None:
                    self._connection.execute(
                        """
                        INSERT INTO food_logs (id, user_id, log_date, notes)
                        VALUES (?, ?, ?, NULL)
                        """,
                        (food_log_id, user_id, row["plan_date"]),
                    )
                self._connection.execute(
                    """
                    INSERT INTO food_log_entries (
                        id,
                        food_log_id,
                        entry_type,
                        meal_plan_slot_id,
                        display_name_override,
                        grams,
                        servings,
                        calories,
                        protein,
                        carbs,
                        fat,
                        created_at
                    ) VALUES (?, ?, 'meal', ?, ?, 0, 1, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        food_log_id,
                        slot_id,
                        f"{row['meal_label']}: {row['title']}",
                        row["calories"],
                        round(protein, 1),
                        round(carbs, 1),
                        round(fat, 1),
                        eaten_at.isoformat(),
                    ),
                )
            return self.get_meal_plan_day(row["meal_plan_day_id"])

    def create_meal_prep_task(
        self,
        *,
        user_id: str,
        title: str,
        category: str,
        portions: str,
        status: str,
        scheduled_for: date | None = None,
        meal_prep_task_id: str | None = None,
    ) -> str:
        identifier = meal_prep_task_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO meal_prep_tasks (
                    id, user_id, title, category, portions, status, scheduled_for
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    user_id,
                    title,
                    category,
                    portions,
                    status,
                    scheduled_for.isoformat() if scheduled_for is not None else None,
                ),
            )
        return identifier

    @_synchronized
    def get_meal_prep_task(self, task_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM meal_prep_tasks WHERE id = ?",
            (task_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_meal_prep_tasks(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM meal_prep_tasks
            WHERE user_id = ?
            ORDER BY updated_at DESC, created_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def update_meal_prep_task_status(self, task_id: str, status: str) -> dict[str, Any] | None:
        with self._lock, self._connection:
            self._connection.execute(
                """
                UPDATE meal_prep_tasks
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (status, task_id),
            )
        return self.get_meal_prep_task(task_id)

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
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO ingestion_jobs (id, user_id, source_kind, source_name, status)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id = excluded.user_id,
                    source_kind = excluded.source_kind,
                    source_name = excluded.source_name,
                    status = excluded.status
                """,
                (identifier, user_id, source_kind, source_name, status),
            )
        return identifier

    def save_ingestion_output(
        self,
        *,
        ingestion_job_id: str,
        extracted_text: str | None = None,
        structured_json: Any | None = None,
        confidence: float = 0,
        output_id: str | None = None,
    ) -> dict[str, Any]:
        identifier = output_id or str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO ingestion_outputs (
                    id, ingestion_job_id, extracted_text, structured_json, confidence,
                    reviewed_at, accepted_at, rejected_at
                ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)
                ON CONFLICT(id) DO UPDATE SET
                    ingestion_job_id = excluded.ingestion_job_id,
                    extracted_text = excluded.extracted_text,
                    structured_json = excluded.structured_json,
                    confidence = excluded.confidence
                """,
                (
                    identifier,
                    ingestion_job_id,
                    extracted_text,
                    json_text(structured_json) if structured_json is not None else None,
                    confidence,
                ),
            )
        output = self.get_ingestion_output(identifier)
        if output is None:
            raise RuntimeError("Failed to persist ingestion output.")
        return output

    def _ingestion_output_state(self, row: sqlite3.Row | dict[str, Any]) -> str:
        accepted_at = row["accepted_at"]
        rejected_at = row["rejected_at"]
        reviewed_at = row["reviewed_at"]
        if accepted_at is not None:
            return "accepted"
        if rejected_at is not None:
            return "rejected"
        if reviewed_at is not None:
            return "reviewed"
        return "pending"

    def _row_to_ingestion_output(self, row: sqlite3.Row) -> dict[str, Any]:
        output = dict(row)
        output["review_state"] = self._ingestion_output_state(row)
        return output

    @_synchronized
    def get_ingestion_output(self, output_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM ingestion_outputs WHERE id = ?",
            (output_id,),
        ).fetchone()
        return self._row_to_ingestion_output(row) if row is not None else None

    @_synchronized
    def list_ingestion_outputs(
        self,
        ingestion_job_id: str | None = None,
        *,
        pending_review_only: bool = False,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []

        if ingestion_job_id is not None:
            clauses.append("ingestion_job_id = ?")
            params.append(ingestion_job_id)

        if pending_review_only:
            clauses.append("reviewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL")

        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = self._connection.execute(
            f"""
            SELECT * FROM ingestion_outputs
            {where_clause}
            ORDER BY created_at DESC, id DESC
            """,
            params,
        ).fetchall()
        return [self._row_to_ingestion_output(row) for row in rows]

    def list_pending_ingestion_outputs(self, ingestion_job_id: str | None = None) -> list[dict[str, Any]]:
        return self.list_ingestion_outputs(ingestion_job_id, pending_review_only=True)

    def review_ingestion_output(
        self,
        output_id: str,
        *,
        reviewed_at: datetime | None = None,
        accepted_at: datetime | None = None,
        rejected_at: datetime | None = None,
    ) -> dict[str, Any] | None:
        with self._lock, self._connection:
            self._connection.execute(
                """
                UPDATE ingestion_outputs
                SET reviewed_at = ?, accepted_at = ?, rejected_at = ?
                WHERE id = ?
                """,
                (
                    reviewed_at.isoformat() if reviewed_at is not None else None,
                    accepted_at.isoformat() if accepted_at is not None else None,
                    rejected_at.isoformat() if rejected_at is not None else None,
                    output_id,
                ),
            )
        return self.get_ingestion_output(output_id)

    def mark_ingestion_output_reviewed(
        self, output_id: str, reviewed_at: datetime | None = None
    ) -> dict[str, Any] | None:
        return self.review_ingestion_output(output_id, reviewed_at=reviewed_at or datetime.utcnow())

    def accept_ingestion_output(
        self, output_id: str, accepted_at: datetime | None = None
    ) -> dict[str, Any] | None:
        timestamp = accepted_at or datetime.utcnow()
        return self.review_ingestion_output(
            output_id,
            reviewed_at=timestamp,
            accepted_at=timestamp,
            rejected_at=None,
        )

    def reject_ingestion_output(
        self, output_id: str, rejected_at: datetime | None = None
    ) -> dict[str, Any] | None:
        timestamp = rejected_at or datetime.utcnow()
        return self.review_ingestion_output(
            output_id,
            reviewed_at=timestamp,
            accepted_at=None,
            rejected_at=timestamp,
        )

    def update_ingestion_job(
        self,
        ingestion_job_id: str,
        *,
        status: str,
        completed_at: datetime | None = None,
        error_message: str | None = None,
    ) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """
                UPDATE ingestion_jobs
                SET status = ?, completed_at = ?, error_message = ?
                WHERE id = ?
                """,
                (
                    status,
                    completed_at.isoformat() if completed_at is not None else None,
                    error_message,
                    ingestion_job_id,
                ),
            )

    @_synchronized
    def get_ingestion_job(self, ingestion_job_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM ingestion_jobs WHERE id = ?",
            (ingestion_job_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_ingestion_jobs(self, user_id: str | None = None) -> list[dict[str, Any]]:
        if user_id is None:
            rows = self._connection.execute(
                "SELECT * FROM ingestion_jobs ORDER BY requested_at DESC, created_at DESC"
            ).fetchall()
        else:
            rows = self._connection.execute(
                """
                SELECT * FROM ingestion_jobs
                WHERE user_id = ?
                ORDER BY requested_at DESC, created_at DESC
                """,
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def record_weight_entry(
        self,
        *,
        user_id: str,
        recorded_at: date,
        weight_lbs: float,
        entry_id: str | None = None,
    ) -> str:
        identifier = entry_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO weight_entries (id, user_id, recorded_at, weight_lbs)
                VALUES (?, ?, ?, ?)
                """,
                (identifier, user_id, recorded_at.isoformat(), weight_lbs),
            )
        return identifier

    @_synchronized
    def get_weight_entry(self, entry_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM weight_entries WHERE id = ?",
            (entry_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_weight_entries(
        self,
        user_id: str,
        *,
        recorded_start: date | None = None,
        recorded_end: date | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["user_id = ?"]
        params: list[Any] = [user_id]

        if recorded_start is not None:
            clauses.append("recorded_at >= ?")
            params.append(recorded_start.isoformat())

        if recorded_end is not None:
            clauses.append("recorded_at <= ?")
            params.append(recorded_end.isoformat())

        rows = self._connection.execute(
            f"""
            SELECT *
            FROM weight_entries
            WHERE {' AND '.join(clauses)}
            ORDER BY recorded_at ASC, created_at ASC, id ASC
            """,
            params,
        ).fetchall()
        return [dict(row) for row in rows]

    @_synchronized
    def latest_activity_date(self, user_id: str) -> date | None:
        row = self._connection.execute(
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

    @_synchronized
    def get_weekly_metrics_for_user(
        self,
        *,
        user_id: str,
        week_start: date | None = None,
        week_end: date | None = None,
    ) -> WeeklyMetrics:
        if week_start is None or week_end is None:
            return self.get_weekly_metrics()

        goal_row = self._connection.execute(
            """
            SELECT * FROM user_goals
            WHERE user_id = ? AND effective_at <= ?
            ORDER BY effective_at DESC, created_at DESC
            LIMIT 1
            """,
            (user_id, week_end.isoformat()),
        ).fetchone()

        totals_row = self._connection.execute(
            """
            SELECT
                COALESCE(SUM(entries.calories), 0) AS calories,
                COALESCE(SUM(entries.protein), 0) AS protein,
                COALESCE(SUM(entries.carbs), 0) AS carbs,
                COALESCE(SUM(entries.fat), 0) AS fat
            FROM food_log_entries entries
            JOIN food_logs logs ON logs.id = entries.food_log_id
            WHERE logs.user_id = ?
              AND logs.log_date >= ?
              AND logs.log_date <= ?
            """,
            (user_id, week_start.isoformat(), week_end.isoformat()),
        ).fetchone()

        weight_rows = self.list_weight_entries(
            user_id,
            recorded_start=week_start,
            recorded_end=week_end,
        )

        if goal_row is None:
            return self.get_weekly_metrics()

        calories_consumed = int(round(float(totals_row["calories"])))
        calorie_goal = int(goal_row["calorie_goal"])
        protein_consumed = float(totals_row["protein"])
        carbs_consumed = float(totals_row["carbs"])
        fat_consumed = float(totals_row["fat"])

        if calorie_goal <= 0:
            adherence_score = 0
        else:
            adherence_score = min(int(round((calories_consumed / calorie_goal) * 100)), 100)

        weekly_weight_change = 0.0
        if len(weight_rows) >= 2:
            weekly_weight_change = round(
                float(weight_rows[-1]["weight_lbs"]) - float(weight_rows[0]["weight_lbs"]),
                1,
            )

        return WeeklyMetrics(
            calorie_goal=calorie_goal,
            calories_consumed=calories_consumed,
            macro_targets=MacroTargets(
                protein=float(goal_row["protein_goal"]),
                carbs=float(goal_row["carbs_goal"]),
                fat=float(goal_row["fat_goal"]),
            ),
            macro_consumed=MacroTargets(
                protein=protein_consumed,
                carbs=carbs_consumed,
                fat=fat_consumed,
            ),
            weekly_weight_change=weekly_weight_change,
            adherence_score=adherence_score,
        )

    def save_meal_template(self, meal_template: MealTemplate) -> MealTemplate:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO meal_templates (
                    id, name, serving_count, favorite, calories, protein, carbs, fat,
                    per_serving_calories, per_serving_protein, per_serving_carbs, per_serving_fat
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    serving_count = excluded.serving_count,
                    favorite = excluded.favorite,
                    calories = excluded.calories,
                    protein = excluded.protein,
                    carbs = excluded.carbs,
                    fat = excluded.fat,
                    per_serving_calories = excluded.per_serving_calories,
                    per_serving_protein = excluded.per_serving_protein,
                    per_serving_carbs = excluded.per_serving_carbs,
                    per_serving_fat = excluded.per_serving_fat
                """,
                (
                    meal_template.id,
                    meal_template.name,
                    meal_template.serving_count,
                    1 if meal_template.favorite else 0,
                    meal_template.calories,
                    meal_template.macros.protein,
                    meal_template.macros.carbs,
                    meal_template.macros.fat,
                    meal_template.per_serving_calories,
                    meal_template.per_serving_macros.protein,
                    meal_template.per_serving_macros.carbs,
                    meal_template.per_serving_macros.fat,
                ),
            )
            self._connection.execute(
                "DELETE FROM meal_template_ingredients WHERE meal_template_id = ?",
                (meal_template.id,),
            )
            self._connection.executemany(
                """
                INSERT INTO meal_template_ingredients (
                    meal_template_id, food_id, name, grams, calories_per_100g,
                    protein_per_100g, carbs_per_100g, fat_per_100g
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        meal_template.id,
                        ingredient.food_id,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.calories_per_100g,
                        ingredient.macros_per_100g.protein,
                        ingredient.macros_per_100g.carbs,
                        ingredient.macros_per_100g.fat,
                    )
                    for ingredient in meal_template.ingredients
                ],
            )
        return meal_template

    @_synchronized
    def _row_to_meal_template(self, row: sqlite3.Row) -> MealTemplate:
        ingredient_rows = self._connection.execute(
            """
            SELECT * FROM meal_template_ingredients
            WHERE meal_template_id = ?
            ORDER BY id
            """,
            (row["id"],),
        ).fetchall()
        ingredients = [
            {
                "id": f"{row['id']}-{ingredient_row['id']}",
                "food_id": ingredient_row["food_id"],
                "name": ingredient_row["name"],
                "grams": ingredient_row["grams"],
                "calories_per_100g": ingredient_row["calories_per_100g"],
                "macros_per_100g": {
                    "protein": ingredient_row["protein_per_100g"],
                    "carbs": ingredient_row["carbs_per_100g"],
                    "fat": ingredient_row["fat_per_100g"],
                },
            }
            for ingredient_row in ingredient_rows
        ]
        return MealTemplate(
            id=row["id"],
            name=row["name"],
            serving_count=row["serving_count"],
            ingredients=ingredients,
            favorite=bool(row["favorite"]),
            calories=row["calories"],
            macros=MacroTargets(
                protein=row["protein"], carbs=row["carbs"], fat=row["fat"]
            ),
            per_serving_calories=row["per_serving_calories"],
            per_serving_macros=MacroTargets(
                protein=row["per_serving_protein"],
                carbs=row["per_serving_carbs"],
                fat=row["per_serving_fat"],
            ),
        )

    @_synchronized
    def list_meal_templates(self) -> list[MealTemplate]:
        rows = self._connection.execute("SELECT * FROM meal_templates ORDER BY name").fetchall()
        return [self._row_to_meal_template(row) for row in rows]

    @_synchronized
    def get_meal_template(self, meal_template_id: str) -> MealTemplate | None:
        row = self._connection.execute(
            "SELECT * FROM meal_templates WHERE id = ?",
            (meal_template_id,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_meal_template(row)

    def save_recipe(self, recipe: RecipeDefinition) -> RecipeDefinition:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO recipes (id, title, default_yield, favorite)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    default_yield = excluded.default_yield,
                    favorite = excluded.favorite
                """,
                (recipe.id, recipe.title, recipe.default_yield, 1 if recipe.favorite else 0),
            )
            self._connection.execute("DELETE FROM recipe_steps WHERE recipe_id = ?", (recipe.id,))
            self._connection.execute("DELETE FROM recipe_assets WHERE recipe_id = ?", (recipe.id,))
            self._connection.execute(
                "DELETE FROM recipe_ingredients WHERE recipe_id = ?",
                (recipe.id,),
            )
            self._connection.executemany(
                """
                INSERT INTO recipe_steps (recipe_id, position, step_text)
                VALUES (?, ?, ?)
                """,
                [(recipe.id, index, step) for index, step in enumerate(recipe.steps, start=1)],
            )
            self._connection.executemany(
                """
                INSERT INTO recipe_assets (recipe_id, kind, url, content)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (recipe.id, asset.kind, asset.url, asset.content)
                    for asset in recipe.assets
                ],
            )
            self._connection.executemany(
                """
                INSERT INTO recipe_ingredients (
                    recipe_id, food_id, name, grams, calories_per_100g,
                    protein_per_100g, carbs_per_100g, fat_per_100g
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        recipe.id,
                        ingredient.food_id,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.calories_per_100g,
                        ingredient.macros_per_100g.protein,
                        ingredient.macros_per_100g.carbs,
                        ingredient.macros_per_100g.fat,
                    )
                    for ingredient in recipe.ingredients
                ],
            )
        return recipe

    @_synchronized
    def _row_to_recipe(self, row: sqlite3.Row) -> RecipeDefinition:
        step_rows = self._connection.execute(
            "SELECT step_text FROM recipe_steps WHERE recipe_id = ? ORDER BY position",
            (row["id"],),
        ).fetchall()
        asset_rows = self._connection.execute(
            "SELECT kind, url, content FROM recipe_assets WHERE recipe_id = ? ORDER BY id",
            (row["id"],),
        ).fetchall()
        ingredient_rows = self._connection.execute(
            "SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY id",
            (row["id"],),
        ).fetchall()
        return RecipeDefinition(
            id=row["id"],
            title=row["title"],
            steps=[step_row["step_text"] for step_row in step_rows],
            assets=[
                RecipeAsset(kind=asset_row["kind"], url=asset_row["url"], content=asset_row["content"])
                for asset_row in asset_rows
            ],
            ingredients=[
                {
                    "id": f"{row['id']}-{ingredient_row['id']}",
                    "food_id": ingredient_row["food_id"],
                    "name": ingredient_row["name"],
                    "grams": ingredient_row["grams"],
                    "calories_per_100g": ingredient_row["calories_per_100g"],
                    "macros_per_100g": {
                        "protein": ingredient_row["protein_per_100g"],
                        "carbs": ingredient_row["carbs_per_100g"],
                        "fat": ingredient_row["fat_per_100g"],
                    },
                }
                for ingredient_row in ingredient_rows
            ],
            default_yield=row["default_yield"],
            favorite=bool(row["favorite"]),
        )

    @_synchronized
    def list_recipes(self) -> list[RecipeDefinition]:
        rows = self._connection.execute("SELECT * FROM recipes ORDER BY title").fetchall()
        return [self._row_to_recipe(row) for row in rows]

    @_synchronized
    def get_recipe(self, recipe_id: str) -> RecipeDefinition | None:
        row = self._connection.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_recipe(row)

    @_synchronized
    def close(self) -> None:
        self._connection.close()
