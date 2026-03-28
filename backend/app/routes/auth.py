from fastapi import APIRouter, Depends

from backend.app.dependencies import get_required_session, get_repository
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
    session: AuthSession = Depends(get_required_session),
) -> SessionResponse:
    return SessionResponse(session=session)
