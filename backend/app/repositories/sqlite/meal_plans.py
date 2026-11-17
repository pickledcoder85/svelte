"""Meal plan days, slots and meal prep tasks."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any
from uuid import uuid4


from ._base import _synchronized


class MealPlansMixin:
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

    def add_meal_plan_slot(
        self,
        *,
        user_id: str,
        plan_date: date,
        slot: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Add one planned meal to a day, creating the day if needed. Never touches the day's
        other meals (re-saving a whole day would drop what was already eaten from it)."""
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO meal_plan_days (id, user_id, plan_date, label, focus)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, plan_date) DO NOTHING
                """,
                (f"meal-plan-{user_id}-{plan_date.isoformat()}", user_id, plan_date.isoformat(), plan_date.strftime("%A"), "Planned"),
            )
            day = self._connection.execute(
                "SELECT id FROM meal_plan_days WHERE user_id = ? AND plan_date = ?",
                (user_id, plan_date.isoformat()),
            ).fetchone()
            position = self._connection.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM meal_plan_slots WHERE meal_plan_day_id = ?",
                (day["id"],),
            ).fetchone()[0]
            self._connection.execute(
                """
                INSERT INTO meal_plan_slots (
                    id, meal_plan_day_id, position, meal_label, title, calories, items_json, eaten_at, prep_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
                """,
                (
                    str(uuid4()),
                    day["id"],
                    position,
                    slot["meal_label"],
                    slot["title"],
                    slot["calories"],
                    json.dumps(slot.get("items", [])),
                    slot.get("prep_status", "Flexible"),
                ),
            )
            return self.get_meal_plan_day(day["id"])

    def delete_meal_plan_slot(self, user_id: str, slot_id: str) -> dict[str, Any] | None:
        """Remove one planned meal ("plans changed"). Anything already logged from it stays in
        the food log (its link is cleared); the rest of the day's plan is untouched."""
        with self._lock, self._connection:
            row = self._connection.execute(
                """
                SELECT slots.meal_plan_day_id, days.user_id FROM meal_plan_slots slots
                JOIN meal_plan_days days ON days.id = slots.meal_plan_day_id
                WHERE slots.id = ?
                """,
                (slot_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return None
            self._connection.execute("DELETE FROM meal_plan_slots WHERE id = ?", (slot_id,))
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
