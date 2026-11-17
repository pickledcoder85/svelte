"""Water intake entries."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4


from ._base import _synchronized


class WaterMixin:
    def add_water_entry(self, *, user_id: str, logged_on: date, amount_ml: int) -> dict[str, Any]:
        self._ensure_user_exists(user_id)
        identifier = str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO water_entries (id, user_id, logged_on, amount_ml, created_at) VALUES (?, ?, ?, ?, ?)",
                (identifier, user_id, logged_on.isoformat(), amount_ml, datetime.now(UTC).isoformat()),
            )
            row = self._connection.execute("SELECT * FROM water_entries WHERE id = ?", (identifier,)).fetchone()
        return dict(row)

    @_synchronized
    def list_water_entries(self, user_id: str, start: date, end: date) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM water_entries
            WHERE user_id = ? AND logged_on BETWEEN ? AND ?
            ORDER BY logged_on, created_at, id
            """,
            (user_id, start.isoformat(), end.isoformat()),
        ).fetchall()
        return [dict(row) for row in rows]

    def delete_water_entry(self, *, user_id: str, entry_id: str) -> bool:
        with self._lock, self._connection:
            cursor = self._connection.execute("DELETE FROM water_entries WHERE id = ? AND user_id = ?", (entry_id, user_id))
            return cursor.rowcount > 0
