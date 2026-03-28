from __future__ import annotations

import sqlite3
import threading
from datetime import date, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from backend.app.models.auth import AuthSession
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import FoodItem, MacroTargets, WeeklyMetrics
from backend.app.models.recipes import RecipeAsset, RecipeDefinition


class SQLiteRepository:
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self.initialize()

    def initialize(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                PRAGMA foreign_keys = ON;

                CREATE TABLE IF NOT EXISTS auth_sessions (
                    access_token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    display_name TEXT,
                    expires_at TEXT NOT NULL,
                    provider TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id TEXT PRIMARY KEY,
                    display_name TEXT,
                    timezone TEXT NOT NULL DEFAULT 'UTC',
                    units TEXT NOT NULL DEFAULT 'imperial',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS user_goals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    effective_at TEXT NOT NULL,
                    calorie_goal INTEGER NOT NULL,
                    protein_goal REAL NOT NULL,
                    carbs_goal REAL NOT NULL,
                    fat_goal REAL NOT NULL,
                    target_weight_lbs REAL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS weight_entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    weight_lbs REAL NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS weekly_metrics (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    calorie_goal INTEGER NOT NULL,
                    calories_consumed INTEGER NOT NULL,
                    protein_target REAL NOT NULL,
                    carbs_target REAL NOT NULL,
                    fat_target REAL NOT NULL,
                    protein_consumed REAL NOT NULL,
                    carbs_consumed REAL NOT NULL,
                    fat_consumed REAL NOT NULL,
                    weekly_weight_change REAL NOT NULL,
                    adherence_score INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS food_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    log_date TEXT NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, log_date),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS food_log_entries (
                    id TEXT PRIMARY KEY,
                    food_log_id TEXT NOT NULL,
                    entry_type TEXT NOT NULL,
                    food_item_id TEXT,
                    meal_template_id TEXT,
                    grams REAL NOT NULL DEFAULT 0,
                    servings REAL NOT NULL DEFAULT 1,
                    calories REAL NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (food_log_id) REFERENCES food_logs (id) ON DELETE CASCADE,
                    FOREIGN KEY (meal_template_id) REFERENCES meal_templates (id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS ingestion_jobs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    source_kind TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    completed_at TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ingestion_outputs (
                    id TEXT PRIMARY KEY,
                    ingestion_job_id TEXT NOT NULL,
                    extracted_text TEXT,
                    structured_json TEXT,
                    confidence REAL NOT NULL DEFAULT 0,
                    reviewed_at TEXT,
                    accepted_at TEXT,
                    rejected_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ingestion_job_id) REFERENCES ingestion_jobs (id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS food_catalog (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    brand TEXT,
                    calories REAL NOT NULL,
                    serving_size REAL NOT NULL,
                    serving_unit TEXT NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    source TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS meal_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    serving_count REAL NOT NULL,
                    favorite INTEGER NOT NULL DEFAULT 0,
                    calories REAL NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    per_serving_calories REAL NOT NULL,
                    per_serving_protein REAL NOT NULL,
                    per_serving_carbs REAL NOT NULL,
                    per_serving_fat REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS meal_template_ingredients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    meal_template_id TEXT NOT NULL REFERENCES meal_templates(id) ON DELETE CASCADE,
                    food_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    grams REAL NOT NULL,
                    calories_per_100g REAL NOT NULL,
                    protein_per_100g REAL NOT NULL,
                    carbs_per_100g REAL NOT NULL,
                    fat_per_100g REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS recipes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    default_yield REAL NOT NULL,
                    favorite INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS recipe_steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                    position INTEGER NOT NULL,
                    step_text TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS recipe_assets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL,
                    url TEXT,
                    content TEXT
                );

                CREATE TABLE IF NOT EXISTS recipe_ingredients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                    food_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    grams REAL NOT NULL,
                    calories_per_100g REAL NOT NULL,
                    protein_per_100g REAL NOT NULL,
                    carbs_per_100g REAL NOT NULL,
                    fat_per_100g REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
                CREATE INDEX IF NOT EXISTS idx_user_goals_user_effective ON user_goals (user_id, effective_at DESC);
                CREATE INDEX IF NOT EXISTS idx_weight_entries_user_recorded ON weight_entries (user_id, recorded_at);
                CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs (user_id, log_date);
                CREATE INDEX IF NOT EXISTS idx_food_log_entries_log ON food_log_entries (food_log_id);
                CREATE INDEX IF NOT EXISTS idx_food_log_entries_food_item ON food_log_entries (food_item_id);
                CREATE INDEX IF NOT EXISTS idx_food_log_entries_meal_template ON food_log_entries (meal_template_id);
                CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_status ON ingestion_jobs (user_id, status);
                CREATE INDEX IF NOT EXISTS idx_ingestion_outputs_job ON ingestion_outputs (ingestion_job_id);
                """
            )
        self._seed_data()

    def _seed_data(self) -> None:
        if self.list_foods():
            return

        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO weekly_metrics (
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
                INSERT INTO food_catalog (
                    id, name, brand, calories, serving_size, serving_unit,
                    protein, carbs, fat, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "food-oats",
                        "Rolled oats",
                        None,
                        389,
                        100,
                        "g",
                        16.9,
                        66.3,
                        6.9,
                        "CUSTOM",
                    ),
                    (
                        "food-greek-yogurt",
                        "Greek yogurt, plain nonfat",
                        None,
                        59,
                        100,
                        "g",
                        10.3,
                        3.6,
                        0.4,
                        "CUSTOM",
                    ),
                    (
                        "food-blueberries",
                        "Blueberries",
                        None,
                        57,
                        100,
                        "g",
                        0.7,
                        14.5,
                        0.3,
                        "CUSTOM",
                    ),
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

    def list_foods(self) -> list[FoodItem]:
        rows = self._connection.execute("SELECT * FROM food_catalog ORDER BY name").fetchall()
        return [self._row_to_food(row) for row in rows]

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
        with self._lock, self._connection:
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
        identity = self.get_user_identity(user_id)
        if identity is None:
            raise RuntimeError("Failed to persist user identity.")
        return identity

    def _ensure_user_exists(self, user_id: str) -> None:
        row = self._connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is not None:
            return

        placeholder_email = f"{user_id}@local.invalid"
        self.save_user_identity(user_id=user_id, email=placeholder_email)

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
                p.updated_at AS profile_updated_at
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.id = ?
            """,
            (user_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def save_user_goal(
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
    ) -> dict[str, Any]:
        identifier = goal_id or f"goal-{user_id}-{effective_at.isoformat()}"
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO user_goals (
                    id, user_id, effective_at, calorie_goal, protein_goal,
                    carbs_goal, fat_goal, target_weight_lbs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id = excluded.user_id,
                    effective_at = excluded.effective_at,
                    calorie_goal = excluded.calorie_goal,
                    protein_goal = excluded.protein_goal,
                    carbs_goal = excluded.carbs_goal,
                    fat_goal = excluded.fat_goal,
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
                    target_weight_lbs,
                ),
            )
        goal = self.get_user_goal(identifier)
        if goal is None:
            raise RuntimeError("Failed to persist user goal.")
        return goal

    def get_user_goal(self, goal_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM user_goals WHERE id = ?",
            (goal_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def list_user_goals(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM user_goals
            WHERE user_id = ?
            ORDER BY effective_at DESC, created_at DESC
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
                    notes = excluded.notes,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (identifier, user_id, log_date.isoformat(), notes),
            )
        return identifier

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
        entry_id: str | None = None,
    ) -> str:
        identifier = entry_id or str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
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
        return identifier

    def list_food_log_entries(self, food_log_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM food_log_entries
            WHERE food_log_id = ?
            ORDER BY created_at, id
            """,
            (food_log_id,),
        ).fetchall()
        return [dict(row) for row in rows]

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

    def list_food_logs(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM food_logs
            WHERE user_id = ?
            ORDER BY log_date DESC, created_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

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

    def get_ingestion_job(self, ingestion_job_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM ingestion_jobs WHERE id = ?",
            (ingestion_job_id,),
        ).fetchone()
        return dict(row) if row is not None else None

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

        weight_rows = self._connection.execute(
            """
            SELECT recorded_at, weight_lbs
            FROM weight_entries
            WHERE user_id = ?
              AND recorded_at >= ?
              AND recorded_at <= ?
            ORDER BY recorded_at ASC, created_at ASC
            """,
            (user_id, week_start.isoformat(), week_end.isoformat()),
        ).fetchall()

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

    def list_meal_templates(self) -> list[MealTemplate]:
        rows = self._connection.execute("SELECT * FROM meal_templates ORDER BY name").fetchall()
        return [self._row_to_meal_template(row) for row in rows]

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

    def list_recipes(self) -> list[RecipeDefinition]:
        rows = self._connection.execute("SELECT * FROM recipes ORDER BY title").fetchall()
        return [self._row_to_recipe(row) for row in rows]

    def get_recipe(self, recipe_id: str) -> RecipeDefinition | None:
        row = self._connection.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_recipe(row)

    def close(self) -> None:
        self._connection.close()
