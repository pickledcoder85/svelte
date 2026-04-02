from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.auth import AuthSession, LoginRequest, SessionResponse
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.auth import AuthIntentConflictError, create_session


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=SessionResponse)
async def login(
    payload: LoginRequest, repository: SQLiteRepository = Depends(get_repository)
) -> SessionResponse:
    try:
        return SessionResponse(session=create_session(repository, payload))
    except AuthIntentConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/session", response_model=SessionResponse)
async def current_session(
    session: AuthSession = Depends(get_required_session),
) -> SessionResponse:
    return SessionResponse(session=session)
