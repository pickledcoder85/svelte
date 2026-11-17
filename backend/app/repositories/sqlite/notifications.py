"""Push subscriptions and reminders."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4


from ._base import _synchronized


class NotificationsMixin:
    def save_push_subscription(self, *, user_id: str, endpoint: str, p256dh: str, auth: str, language: str = "en") -> None:
        """Store (or refresh) a phone's push subscription and the app's language on it; the
        endpoint is unique."""
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, language) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh,
                    auth = excluded.auth, language = excluded.language
                """,
                (str(uuid4()), user_id, endpoint, p256dh, auth, language),
            )

    @_synchronized
    def list_push_subscriptions(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            "SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY created_at", (user_id,)
        ).fetchall()
        return [dict(row) for row in rows]

    def delete_push_subscription(self, *, endpoint: str, user_id: str | None = None) -> bool:
        with self._lock, self._connection:
            if user_id is None:
                cursor = self._connection.execute("DELETE FROM push_subscriptions WHERE endpoint = ?", (endpoint,))
            else:
                cursor = self._connection.execute(
                    "DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?", (endpoint, user_id)
                )
            return cursor.rowcount > 0

    def mark_push_success(self, endpoint: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE push_subscriptions SET last_success_at = ? WHERE endpoint = ?",
                (datetime.now(UTC).isoformat(), endpoint),
            )

    @_synchronized
    def list_reminders(self, user_id: str | None = None, kind: str | None = None) -> list[dict[str, Any]]:
        query = "SELECT * FROM reminders WHERE 1 = 1"
        params: list[Any] = []
        if user_id is not None:
            query += " AND user_id = ?"
            params.append(user_id)
        if kind is not None:
            query += " AND kind = ?"
            params.append(kind)
        rows = self._connection.execute(query + " ORDER BY user_id, kind, local_time", params).fetchall()
        return [dict(row) for row in rows]

    def set_reminder_times(self, *, user_id: str, kind: str, times: list[str]) -> None:
        """Replace a kind's reminder times; a time that stays keeps its last-sent day."""
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            if times:
                placeholders = ",".join("?" for _ in times)
                self._connection.execute(
                    f"DELETE FROM reminders WHERE user_id = ? AND kind = ? AND local_time NOT IN ({placeholders})",
                    (user_id, kind, *times),
                )
            else:
                self._connection.execute("DELETE FROM reminders WHERE user_id = ? AND kind = ?", (user_id, kind))
            for local_time in times:
                self._connection.execute(
                    "INSERT OR IGNORE INTO reminders (id, user_id, kind, local_time) VALUES (?, ?, ?, ?)",
                    (str(uuid4()), user_id, kind, local_time),
                )

    def mark_reminder_sent(self, reminder_id: str, local_date: date) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE reminders SET last_sent_on = ? WHERE id = ?", (local_date.isoformat(), reminder_id)
            )
