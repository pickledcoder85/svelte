from fastapi import APIRouter, Depends, Header, HTTPException

from backend.app.dependencies import get_repository
from backend.app.models.auth import LoginRequest, SessionResponse
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.auth import create_session, get_session_from_token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=SessionResponse)
async def login(
    payload: LoginRequest, repository: SQLiteRepository = Depends(get_repository)
) -> SessionResponse:
    return SessionResponse(session=create_session(repository, payload))


@router.get("/session", response_model=SessionResponse)
async def current_session(
    authorization: str | None = Header(default=None),
    repository: SQLiteRepository = Depends(get_repository),
) -> SessionResponse:
    if authorization and authorization.startswith("Bearer "):
        session = get_session_from_token(repository, authorization.removeprefix("Bearer ").strip())
        if session is not None:
            return SessionResponse(session=session)
    raise HTTPException(status_code=401, detail="No active session.")
