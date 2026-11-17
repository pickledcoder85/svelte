"""Exercise entries and planned workouts."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4


from ._base import _synchronized
from ._constants import ExerciseLinkedToPlanError


class ExerciseMixin:
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

    def save_manual_exercise(self, *, user_id: str, entry: dict[str, Any]) -> dict[str, Any]:
        """Save a workout added by hand, with how its calories were counted."""
        self._ensure_user_exists(user_id)
        identifier = str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO exercise_entries (
                    id, user_id, title, duration_minutes, calories_burned, logged_on, logged_at,
                    intensity, source, activity_type, distance_m, source_calories_total,
                    relish_resting_calories, weight_lbs_at_time, calc_version, calories_method, met
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?)
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
                    entry.get("activity_type"),
                    entry.get("distance_m"),
                    entry.get("source_calories_total"),
                    entry.get("relish_resting_calories"),
                    entry.get("weight_lbs_at_time"),
                    entry.get("calc_version"),
                    entry.get("calories_method"),
                    entry.get("met"),
                ),
            )
            row = self._connection.execute("SELECT * FROM exercise_entries WHERE id = ?", (identifier,)).fetchone()
        return dict(row)

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

    def update_exercise_entry(
        self,
        *,
        user_id: str,
        exercise_entry_id: str,
        title: str,
        duration_minutes: int,
        calories_burned: int,
        logged_on: date,
        logged_at: str,
        intensity: str,
    ) -> dict[str, Any] | None:
        """Update a logged exercise the user owns; None if it is missing or not theirs.

        Raises ExerciseLinkedToPlanError for an entry created by completing a planned
        workout: the plan owns those values and rewrites them whenever the plan changes.
        """
        with self._lock, self._connection:
            linked = self._connection.execute(
                """
                SELECT 1 FROM planned_workout_sessions WHERE completed_exercise_entry_id = ? AND user_id = ?
                UNION ALL
                SELECT 1 FROM planned_exercise_entries WHERE completed_exercise_entry_id = ? AND user_id = ?
                LIMIT 1
                """,
                (exercise_entry_id, user_id, exercise_entry_id, user_id),
            ).fetchone()
            if linked is not None:
                raise ExerciseLinkedToPlanError(exercise_entry_id)
            cursor = self._connection.execute(
                """
                UPDATE exercise_entries
                SET title = ?, duration_minutes = ?, calories_burned = ?,
                    logged_on = ?, logged_at = ?, intensity = ?
                WHERE id = ? AND user_id = ?
                """,
                (
                    title,
                    duration_minutes,
                    calories_burned,
                    logged_on.isoformat(),
                    logged_at,
                    intensity,
                    exercise_entry_id,
                    user_id,
                ),
            )
            if cursor.rowcount == 0:
                return None
            row = self._connection.execute(
                "SELECT * FROM exercise_entries WHERE id = ?",
                (exercise_entry_id,),
            ).fetchone()
            return dict(row) if row is not None else None

    def delete_exercise_entry(self, *, user_id: str, exercise_entry_id: str) -> bool:
        """Delete a logged exercise the user owns.

        A planned workout that was completed through this entry goes back to "planned", so
        the plan and the exercise history never disagree.
        """
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT user_id FROM exercise_entries WHERE id = ?",
                (exercise_entry_id,),
            ).fetchone()
            if row is None or row["user_id"] != user_id:
                return False
            self._connection.execute(
                """
                UPDATE planned_workout_sessions
                SET status = 'planned', completed_at = NULL, completed_exercise_entry_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE completed_exercise_entry_id = ? AND user_id = ?
                """,
                (exercise_entry_id, user_id),
            )
            self._connection.execute(
                """
                UPDATE planned_exercise_entries
                SET completed_at = NULL, completed_exercise_entry_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE completed_exercise_entry_id = ? AND user_id = ?
                """,
                (exercise_entry_id, user_id),
            )
            self._connection.execute(
                "DELETE FROM exercise_entries WHERE id = ?",
                (exercise_entry_id,),
            )
            return True

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
