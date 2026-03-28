from __future__ import annotations

import json
from typing import Any, Literal

from backend.app.models.ingestion import IngestionOutput
from backend.app.repositories.sqlite import SQLiteRepository


class IngestionNotFoundError(ValueError):
    pass


class IngestionAccessError(PermissionError):
    pass


class IngestionStateError(ValueError):
    pass


def _normalize_output(payload: dict[str, Any]) -> IngestionOutput:
    structured_json = payload.get("structured_json")
    if isinstance(structured_json, str):
        try:
            structured_json = json.loads(structured_json)
        except json.JSONDecodeError:
            pass
    return IngestionOutput.model_validate({**payload, "structured_json": structured_json})


def _assert_job_access(repository: SQLiteRepository, user_id: str, ingestion_job_id: str) -> dict[str, Any]:
    job = repository.get_ingestion_job(ingestion_job_id)
    if job is None:
        raise IngestionNotFoundError("Ingestion job not found.")
    if job["user_id"] != user_id:
        raise IngestionAccessError("Ingestion job is not owned by the active user.")
    return job


def _assert_output_access(repository: SQLiteRepository, user_id: str, output_id: str) -> dict[str, Any]:
    output = repository.get_ingestion_output(output_id)
    if output is None:
        raise IngestionNotFoundError("Ingestion output not found.")
    _assert_job_access(repository, user_id, output["ingestion_job_id"])
    return output


def list_review_queue(
    repository: SQLiteRepository,
    user_id: str,
    ingestion_job_id: str | None = None,
) -> list[IngestionOutput]:
    if ingestion_job_id is not None:
        _assert_job_access(repository, user_id, ingestion_job_id)
        outputs = repository.list_pending_ingestion_outputs(ingestion_job_id)
    else:
        outputs = []
        for job in repository.list_ingestion_jobs(user_id):
            outputs.extend(repository.list_pending_ingestion_outputs(job["id"]))
        outputs.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    return [_normalize_output(output) for output in outputs]


def list_job_outputs(
    repository: SQLiteRepository,
    user_id: str,
    ingestion_job_id: str,
) -> list[IngestionOutput]:
    _assert_job_access(repository, user_id, ingestion_job_id)
    return [_normalize_output(output) for output in repository.list_ingestion_outputs(ingestion_job_id)]


def get_output(repository: SQLiteRepository, user_id: str, output_id: str) -> IngestionOutput:
    return _normalize_output(_assert_output_access(repository, user_id, output_id))


def transition_output(
    repository: SQLiteRepository,
    user_id: str,
    output_id: str,
    review_state: Literal["reviewed", "accepted", "rejected"],
) -> IngestionOutput:
    output = _assert_output_access(repository, user_id, output_id)
    current_state = output["review_state"]

    if review_state == "reviewed":
        if current_state in {"accepted", "rejected"}:
            raise IngestionStateError("Reviewed outputs cannot be reopened.")
        if current_state != "reviewed":
            output = repository.mark_ingestion_output_reviewed(output_id)
    elif review_state == "accepted":
        if current_state == "accepted":
            return _normalize_output(output)
        if current_state == "rejected":
            raise IngestionStateError("Rejected outputs cannot be accepted.")
        output = repository.accept_ingestion_output(output_id)
    else:
        if current_state == "rejected":
            return _normalize_output(output)
        if current_state == "accepted":
            raise IngestionStateError("Accepted outputs cannot be rejected.")
        output = repository.reject_ingestion_output(output_id)

    if output is None:
        raise IngestionNotFoundError("Ingestion output not found.")
    return _normalize_output(output)
