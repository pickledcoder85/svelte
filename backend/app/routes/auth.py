from fastapi import APIRouter, Header, HTTPException
from backend.app.models.auth import LoginRequest, SessionResponse
from backend.app.repositories.memory import get_demo_repository
from backend.app.services.auth import create_session, get_session_from_token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=SessionResponse)
async def login(payload: LoginRequest) -> SessionResponse:
    repository = get_demo_repository()
    session = create_session(repository, payload)
    return SessionResponse(session=session)


@router.get("/session", response_model=SessionResponse)
async def current_session(
    authorization: str | None = Header(default=None)
) -> SessionResponse:
    repository = get_demo_repository()
    if authorization and authorization.startswith("Bearer "):
        session = get_session_from_token(repository, authorization.removeprefix("Bearer ").strip())
        if session is not None:
            return SessionResponse(session=session)
    raise HTTPException(status_code=401, detail="No active session.")
