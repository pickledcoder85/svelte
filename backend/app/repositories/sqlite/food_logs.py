"""Food logs and their entries."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4


from ._base import _synchronized


class FoodLogsMixin:
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
        meal_slot: str | None = None,
        quantity_label: str | None = None,
    ) -> str:
        identifier = entry_id or str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO food_log_entries (
                    id, food_log_id, entry_type, food_item_id, meal_template_id,
                    meal_plan_slot_id, display_name_override, grams, servings, calories, protein, carbs, fat, created_at,
                    meal_slot, quantity_label
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    meal_slot,
                    quantity_label,
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

    @_synchronized
    def _owned_food_log_entry_locked(
        self, user_id: str, food_log_id: str, entry_id: str
    ) -> sqlite3.Row | None:
        return self._connection.execute(
            """
            SELECT entries.*
            FROM food_log_entries entries
            JOIN food_logs logs ON logs.id = entries.food_log_id
            WHERE entries.id = ? AND entries.food_log_id = ? AND logs.user_id = ?
            """,
            (entry_id, food_log_id, user_id),
        ).fetchone()

    def update_food_log_entry(
        self,
        *,
        user_id: str,
        food_log_id: str,
        entry_id: str,
        grams: float,
        servings: float,
        calories: float,
        protein: float,
        carbs: float,
        fat: float,
    ) -> bool:
        """Change the amount and nutrition of a logged entry the user owns."""
        with self._lock, self._connection:
            if self._owned_food_log_entry_locked(user_id, food_log_id, entry_id) is None:
                return False
            self._connection.execute(
                """
                UPDATE food_log_entries
                SET grams = ?, servings = ?, calories = ?, protein = ?, carbs = ?, fat = ?, quantity_label = NULL
                WHERE id = ?
                """,
                (grams, servings, calories, protein, carbs, fat, entry_id),
            )
            self._connection.execute(
                "UPDATE food_logs SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (food_log_id,),
            )
            return True

    def delete_food_log_entry(self, *, user_id: str, food_log_id: str, entry_id: str) -> bool:
        """Delete a logged entry the user owns.

        Entries created by ticking a meal-plan slot un-tick that slot; otherwise
        reconcile_meal_plan_food_log_links would recreate the entry.
        """
        with self._lock, self._connection:
            entry = self._owned_food_log_entry_locked(user_id, food_log_id, entry_id)
            if entry is None:
                return False
            if entry["meal_plan_slot_id"]:
                self._connection.execute(
                    "UPDATE meal_plan_slots SET eaten_at = NULL WHERE id = ?",
                    (entry["meal_plan_slot_id"],),
                )
            self._connection.execute("DELETE FROM food_log_entries WHERE id = ?", (entry_id,))
            self._connection.execute(
                "UPDATE food_logs SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (food_log_id,),
            )
            return True

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
