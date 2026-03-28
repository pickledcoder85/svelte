from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.dependencies import get_current_session, get_repository
from backend.app.models.auth import AuthSession
from backend.app.models.ingestion import IngestionOutput, IngestionOutputEditRequest
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.ingestion import (
    IngestionAccessError,
    IngestionNotFoundError,
    IngestionStateError,
    get_output,
    list_job_outputs,
    list_review_queue,
    transition_output,
)


router = APIRouter(prefix="/ingestion", tags=["ingestion"])


def _require_session(session: AuthSession | None) -> AuthSession:
    if session is None:
        raise HTTPException(status_code=401, detail="No active session.")
    return session


def _map_ingestion_error(exc: Exception) -> HTTPException:
    if isinstance(exc, IngestionNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, IngestionAccessError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, IngestionStateError):
        return HTTPException(status_code=409, detail=str(exc))
    return HTTPException(status_code=500, detail="Unexpected ingestion error.")


@router.get("/queue", response_model=list[IngestionOutput])
async def read_review_queue(
    ingestion_job_id: str | None = Query(default=None),
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[IngestionOutput]:
    try:
        return list_review_queue(repository, _require_session(session).user_id, ingestion_job_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_ingestion_error(exc) from exc


@router.get("/jobs/{ingestion_job_id}/outputs", response_model=list[IngestionOutput])
async def read_job_outputs(
    ingestion_job_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[IngestionOutput]:
    try:
        return list_job_outputs(repository, _require_session(session).user_id, ingestion_job_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_ingestion_error(exc) from exc


@router.get("/outputs/{output_id}", response_model=IngestionOutput)
async def read_output(
    output_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> IngestionOutput:
    try:
        return get_output(repository, _require_session(session).user_id, output_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_ingestion_error(exc) from exc


@router.post("/outputs/{output_id}/review", response_model=IngestionOutput)
async def mark_output_reviewed(
    output_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> IngestionOutput:
    try:
        return transition_output(repository, _require_session(session).user_id, output_id, "reviewed")
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_ingestion_error(exc) from exc


@router.post("/outputs/{output_id}/accept", response_model=IngestionOutput)
async def accept_output(
    output_id: str,
    payload: IngestionOutputEditRequest | None = None,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> IngestionOutput:
    try:
        return transition_output(
            repository,
            _require_session(session).user_id,
            output_id,
            "accepted",
            extracted_text=payload.extracted_text if payload is not None else None,
            structured_json=payload.structured_json if payload is not None else None,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_ingestion_error(exc) from exc


@router.post("/outputs/{output_id}/reject", response_model=IngestionOutput)
async def reject_output(
    output_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> IngestionOutput:
    try:
        return transition_output(repository, _require_session(session).user_id, output_id, "rejected")
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_ingestion_error(exc) from exc
