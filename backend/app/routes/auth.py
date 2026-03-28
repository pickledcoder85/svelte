from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_current_session, get_repository
from backend.app.models.auth import AuthSession, LoginRequest, SessionResponse
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.auth import create_session


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=SessionResponse)
async def login(
    payload: LoginRequest, repository: SQLiteRepository = Depends(get_repository)
) -> SessionResponse:
    return SessionResponse(session=create_session(repository, payload))


@router.get("/session", response_model=SessionResponse)
async def current_session(
    session: AuthSession | None = Depends(get_current_session),
) -> SessionResponse:
    if session is not None:
        return SessionResponse(session=session)
    raise HTTPException(status_code=401, detail="No active session.")
