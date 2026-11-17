"""Users, auth sessions, profile, onboarding and saved favorites."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from backend.app.models.auth import AuthSession
from backend.app.services.meal_split import resolve_split

from ._base import _synchronized


class UsersMixin:
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

    def update_user_preferences(
        self,
        *,
        user_id: str,
        timezone: str | None = None,
        units: str | None = None,
        workout_calories_share: int | None = None,
        meals_per_day: int | None = None,
        meal_split: list[int] | None = None,
        water_goal_ml: int | None = None,
        language: str | None = None,
    ) -> None:
        """Set timezone, units, the workout calories share, and/or the meals a day and their
        split (already validated), the water goal, and/or the language; None keeps the saved value."""
        with self._lock, self._connection:
            self._connection.execute(
                """
                UPDATE user_profiles
                SET timezone = COALESCE(?, timezone),
                    units = COALESCE(?, units),
                    workout_calories_share = COALESCE(?, workout_calories_share),
                    meals_per_day = COALESCE(?, meals_per_day),
                    meal_split = COALESCE(?, meal_split),
                    water_goal_ml = COALESCE(?, water_goal_ml),
                    language = COALESCE(?, language),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (
                    timezone,
                    units,
                    workout_calories_share,
                    meals_per_day,
                    json.dumps(meal_split) if meal_split is not None else None,
                    water_goal_ml,
                    language,
                    user_id,
                ),
            )

    def update_display_name(self, *, user_id: str, display_name: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE user_profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                (display_name, user_id),
            )

    def update_eating_preferences(
        self,
        *,
        user_id: str,
        dietary_pattern: str | None,
        nutrition_style: str | None,
        allergy_notes: str | None,
    ) -> None:
        """Save how the user eats. These don't affect calorie targets, so nothing is recalculated."""
        with self._lock, self._connection:
            self._connection.execute(
                """
                UPDATE user_profiles
                SET dietary_pattern = ?, nutrition_style = ?, allergy_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (dietary_pattern, nutrition_style, allergy_notes, user_id),
            )

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
                p.target_source,
                COALESCE(p.calorie_floor, 'recommended') AS calorie_floor,
                COALESCE(p.workout_calories_share, 75) AS workout_calories_share,
                COALESCE(p.water_goal_ml, 2000) AS water_goal_ml,
                COALESCE(p.language, 'en') AS language,
                p.meals_per_day,
                p.meal_split
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.id = ?
            """,
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        identity = dict(row)
        # Chosen in the meal-planning guide; until then the defaults apply and the guide shows.
        identity["meal_pattern_chosen"] = identity.get("meal_split") is not None
        identity["meals_per_day"], identity["meal_split"] = resolve_split(identity.get("meals_per_day"), identity.get("meal_split"))
        return identity

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

    @_synchronized
    def reset_user_setup(self, user_id: str) -> dict[str, Any] | None:
        """Clear the setup answers and the "setup done" mark so setup runs again.

        Also deletes the goals (the new setup's goal is the only one) and clears the meal
        pattern, so the meal-planning guide runs again. Keeps the name, timezone, and units, and
        everything else: foods, logged meals and workouts, weigh-ins, scans, and plans.
        """
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute("DELETE FROM user_goals WHERE user_id = ?", (user_id,))
            self._connection.execute(
                """
                UPDATE user_profiles
                SET setup_completed_at = NULL,
                    sex = NULL, age_years = NULL, height_cm = NULL, current_weight_lbs = NULL,
                    goal_type = NULL, goal_pace = NULL, target_weight_lbs = NULL,
                    activity_level = NULL, dietary_pattern = NULL, nutrition_style = NULL,
                    allergy_notes = NULL, bmr_calories = NULL, tdee_calories = NULL,
                    initial_calorie_target = NULL, protein_target_g = NULL, carbs_target_g = NULL,
                    fat_target_g = NULL, fiber_target_g = NULL, calculation_version = NULL,
                    target_source = NULL, calorie_floor = 'recommended',
                    meals_per_day = 3, meal_split = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (user_id,),
            )
        return self.get_user_identity(user_id)

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
        calorie_floor: str = "recommended",
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
                    calculation_version, target_source, calorie_floor,
                    setup_completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
                    calorie_floor = excluded.calorie_floor,
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
                    calorie_floor,
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
