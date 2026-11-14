from fastapi import APIRouter, Depends, HTTPException

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_required_session, get_repository
from backend.app.models.auth import AuthSession, LoginRequest, SessionResponse
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.auth import AuthIntentConflictError, create_session


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=SessionResponse)
async def login(
    payload: LoginRequest,
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> SessionResponse:
    if settings.auth_mode == "tailscale":
        # Sign-up and email sign-in only exist for local development and tests.
        raise HTTPException(status_code=404, detail="Not found.")
    try:
        return SessionResponse(session=create_session(repository, payload))
    except AuthIntentConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/session", response_model=SessionResponse)
async def current_session(
    session: AuthSession = Depends(get_required_session),
) -> SessionResponse:
    return SessionResponse(session=session)
