"""Ingestion jobs and their review outputs."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Any
from uuid import uuid4

from backend.app.db.database import json_text

from ._base import _synchronized


class IngestionMixin:
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
