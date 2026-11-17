"""Imported workouts and integration sync state."""

from __future__ import annotations

from typing import Any
from uuid import uuid4


from ._base import _synchronized


class IntegrationsMixin:
    def save_imported_exercise(
        self,
        *,
        user_id: str,
        source: str,
        source_id: str,
        payload_json: str,
        entry: dict[str, Any],
    ) -> tuple[str, dict[str, Any] | None]:
        """Save one workout from another app, keeping its original record.

        Returns ("created", row) the first time; ("matched", row) when the user had already
        logged it in Relish (same day, similar length), linked rather than duplicated;
        ("unchanged", row) when it was already imported
        (Relish's numbers are frozen at import, so only the stored original record is refreshed);
        ("deleted", None) when the user deleted it in Relish, which is never undone by a sync.
        """
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            existing = self._connection.execute(
                """
                SELECT exercise_entry_id FROM exercise_source_records
                WHERE user_id = ? AND source = ? AND source_id = ?
                """,
                (user_id, source, source_id),
            ).fetchone()
            if existing is not None:
                self._connection.execute(
                    """
                    UPDATE exercise_source_records SET payload_json = ?, fetched_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND source = ? AND source_id = ?
                    """,
                    (payload_json, user_id, source, source_id),
                )
                if existing["exercise_entry_id"] is None:
                    return "deleted", None
                row = self._connection.execute(
                    "SELECT * FROM exercise_entries WHERE id = ?", (existing["exercise_entry_id"],)
                ).fetchone()
                return "unchanged", dict(row) if row is not None else None

            # Already logged in Relish (by hand, or by ticking off a planned workout)? Link the
            # record to that workout instead of adding a second one, so the day isn't counted
            # twice. The user's own entry is kept as they logged it.
            minutes = int(entry["duration_minutes"])
            tolerance = max(10, round(minutes * 0.25))
            match = self._connection.execute(
                """
                SELECT e.* FROM exercise_entries e
                WHERE e.user_id = ? AND e.logged_on = ? AND e.source <> ?
                  AND abs(e.duration_minutes - ?) <= ?
                  AND NOT EXISTS (
                      SELECT 1 FROM exercise_source_records r WHERE r.exercise_entry_id = e.id
                  )
                ORDER BY abs(e.duration_minutes - ?) ASC, e.created_at ASC
                LIMIT 1
                """,
                (user_id, entry["logged_on"].isoformat(), source, minutes, tolerance, minutes),
            ).fetchone()
            if match is not None:
                self._connection.execute(
                    """
                    INSERT INTO exercise_source_records (user_id, source, source_id, payload_json, exercise_entry_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, source, source_id, payload_json, match["id"]),
                )
                return "matched", dict(match)

            identifier = str(uuid4())
            self._connection.execute(
                """
                INSERT INTO exercise_entries (
                    id, user_id, title, duration_minutes, calories_burned, logged_on, logged_at,
                    intensity, source, source_id, activity_type, started_at, distance_m,
                    source_calories_total, source_bmr_calories, relish_resting_calories,
                    weight_lbs_at_time, calc_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    identifier,
                    user_id,
                    entry["title"],
                    entry["duration_minutes"],
                    entry["calories_burned"],
                    entry["logged_on"].isoformat(),
                    entry["logged_at"],
                    entry["intensity"],
                    source,
                    source_id,
                    entry.get("activity_type"),
                    entry.get("started_at"),
                    entry.get("distance_m"),
                    entry.get("source_calories_total"),
                    entry.get("source_bmr_calories"),
                    entry.get("relish_resting_calories"),
                    entry.get("weight_lbs_at_time"),
                    entry.get("calc_version"),
                ),
            )
            self._connection.execute(
                """
                INSERT INTO exercise_source_records (user_id, source, source_id, payload_json, exercise_entry_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, source, source_id, payload_json, identifier),
            )
            row = self._connection.execute("SELECT * FROM exercise_entries WHERE id = ?", (identifier,)).fetchone()
            return "created", dict(row)

    @_synchronized
    def get_exercise_source_record(self, *, user_id: str, exercise_entry_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            """
            SELECT source, source_id, payload_json, fetched_at FROM exercise_source_records
            WHERE user_id = ? AND exercise_entry_id = ?
            """,
            (user_id, exercise_entry_id),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def get_sync_state(self, *, user_id: str, source: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM integration_sync_state WHERE user_id = ? AND source = ?",
            (user_id, source),
        ).fetchone()
        return dict(row) if row is not None else None

    def record_sync_result(
        self, *, user_id: str, source: str, at: str, ok: bool, imported: int = 0, error: str | None = None
    ) -> None:
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO integration_sync_state (
                    user_id, source, last_attempt_at, last_success_at, last_status, last_error, last_imported
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, source) DO UPDATE SET
                    last_attempt_at = excluded.last_attempt_at,
                    last_success_at = COALESCE(excluded.last_success_at, integration_sync_state.last_success_at),
                    last_status = excluded.last_status,
                    last_error = excluded.last_error,
                    last_imported = CASE WHEN excluded.last_status = 'ok'
                        THEN excluded.last_imported ELSE integration_sync_state.last_imported END
                """,
                (user_id, source, at, at if ok else None, "ok" if ok else "error", error, imported),
            )
