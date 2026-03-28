from __future__ import annotations

import sqlite3
import threading
from datetime import date, timedelta
from pathlib import Path
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

                CREATE TABLE IF NOT EXISTS user_goals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    effective_at TEXT NOT NULL,
                    calorie_goal INTEGER NOT NULL,
                    protein_goal REAL NOT NULL,
                    carbs_goal REAL NOT NULL,
                    fat_goal REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS weight_entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    weight_lbs REAL NOT NULL,
                    notes TEXT
                );

                CREATE TABLE IF NOT EXISTS food_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    log_date TEXT NOT NULL,
                    notes TEXT,
                    UNIQUE (user_id, log_date)
                );

                CREATE TABLE IF NOT EXISTS food_log_entries (
                    id TEXT PRIMARY KEY,
                    food_log_id TEXT NOT NULL REFERENCES food_logs(id) ON DELETE CASCADE,
                    entry_type TEXT NOT NULL,
                    food_item_id TEXT,
                    meal_template_id TEXT,
                    grams REAL NOT NULL DEFAULT 0,
                    servings REAL NOT NULL DEFAULT 1,
                    calories REAL NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL
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

    def save_user_goal(
        self,
        *,
        user_id: str,
        effective_at: date,
        calorie_goal: int,
        protein_goal: float,
        carbs_goal: float,
        fat_goal: float,
        goal_id: str | None = None,
    ) -> str:
        identifier = goal_id or f"goal-{uuid4()}"
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO user_goals (
                    id, user_id, effective_at, calorie_goal, protein_goal, carbs_goal, fat_goal
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    user_id,
                    effective_at.isoformat(),
                    calorie_goal,
                    protein_goal,
                    carbs_goal,
                    fat_goal,
                ),
            )
        return identifier

    def create_food_log(
        self,
        *,
        user_id: str,
        log_date: date,
        notes: str | None = None,
        food_log_id: str | None = None,
    ) -> str:
        existing = self._connection.execute(
            "SELECT id FROM food_logs WHERE user_id = ? AND log_date = ?",
            (user_id, log_date.isoformat()),
        ).fetchone()
        if existing is not None:
            return existing["id"]

        identifier = food_log_id or f"log-{user_id}-{log_date.isoformat()}"
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO food_logs (id, user_id, log_date, notes)
                VALUES (?, ?, ?, ?)
                """,
                (identifier, user_id, log_date.isoformat(), notes),
            )
        return identifier

    def add_food_log_entry(
        self,
        *,
        food_log_id: str,
        calories: float,
        protein: float,
        carbs: float,
        fat: float,
        grams: float = 0,
        servings: float = 1,
        entry_type: str = "food",
        food_item_id: str | None = None,
        meal_template_id: str | None = None,
        entry_id: str | None = None,
    ) -> str:
        identifier = entry_id or f"entry-{uuid4()}"
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

    def record_weight_entry(
        self,
        *,
        user_id: str,
        recorded_at: date,
        weight_lbs: float,
        notes: str | None = None,
        weight_entry_id: str | None = None,
    ) -> str:
        identifier = weight_entry_id or f"weight-{uuid4()}"
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO weight_entries (id, user_id, recorded_at, weight_lbs, notes)
                VALUES (?, ?, ?, ?, ?)
                """,
                (identifier, user_id, recorded_at.isoformat(), weight_lbs, notes),
            )
        return identifier

    def _default_week_bounds(self) -> tuple[date, date]:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        return week_start, week_start + timedelta(days=6)

    def _latest_user_goal(self, user_id: str, week_end: date) -> dict[str, float | int]:
        row = self._connection.execute(
            """
            SELECT calorie_goal, protein_goal, carbs_goal, fat_goal
            FROM user_goals
            WHERE user_id = ? AND effective_at <= ?
            ORDER BY effective_at DESC, id DESC
            LIMIT 1
            """,
            (user_id, week_end.isoformat()),
        ).fetchone()
        if row is None:
            fallback = self._connection.execute(
                "SELECT * FROM weekly_metrics WHERE id = 1"
            ).fetchone()
            if fallback is None:
                return {
                    "calorie_goal": 0,
                    "protein_goal": 0.0,
                    "carbs_goal": 0.0,
                    "fat_goal": 0.0,
                }
            return {
                "calorie_goal": fallback["calorie_goal"],
                "protein_goal": fallback["protein_target"],
                "carbs_goal": fallback["carbs_target"],
                "fat_goal": fallback["fat_target"],
            }
        return {
            "calorie_goal": row["calorie_goal"],
            "protein_goal": row["protein_goal"],
            "carbs_goal": row["carbs_goal"],
            "fat_goal": row["fat_goal"],
        }

    def get_weekly_metrics_for_user(
        self,
        *,
        user_id: str,
        week_start: date | None = None,
        week_end: date | None = None,
    ) -> WeeklyMetrics:
        resolved_start = week_start
        resolved_end = week_end
        if resolved_start is None or resolved_end is None:
            resolved_start, resolved_end = self._default_week_bounds()

        goal_row = self._latest_user_goal(user_id, resolved_end)
        consumption_row = self._connection.execute(
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
            (user_id, resolved_start.isoformat(), resolved_end.isoformat()),
        ).fetchone()
        if consumption_row is None:
            consumption_row = {
                "calories_consumed": 0,
                "protein_consumed": 0.0,
                "carbs_consumed": 0.0,
                "fat_consumed": 0.0,
            }

        weight_rows = self._connection.execute(
            """
            SELECT weight_lbs
            FROM weight_entries
            WHERE user_id = ? AND recorded_at BETWEEN ? AND ?
            ORDER BY recorded_at ASC, id ASC
            """,
            (user_id, resolved_start.isoformat(), resolved_end.isoformat()),
        ).fetchall()

        weekly_weight_change = 0.0
        if len(weight_rows) >= 2:
            weekly_weight_change = round(weight_rows[-1]["weight_lbs"] - weight_rows[0]["weight_lbs"], 1)

        calorie_goal = int(goal_row["calorie_goal"])
        calories_consumed = int(round(consumption_row["calories_consumed"]))
        adherence_score = 0
        if calorie_goal > 0:
            adherence_score = int(
                max(0, 100 - round(abs(calories_consumed - calorie_goal) / calorie_goal * 100))
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
                protein=round(float(consumption_row["protein_consumed"]), 1),
                carbs=round(float(consumption_row["carbs_consumed"]), 1),
                fat=round(float(consumption_row["fat_consumed"]), 1),
            ),
            weekly_weight_change=weekly_weight_change,
            adherence_score=adherence_score,
        )

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
