from fastapi import Depends, Header, Request

from backend.app.models.auth import AuthSession
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.auth import get_session_from_token


async def get_repository(request: Request) -> SQLiteRepository:
    return request.app.state.repository


async def get_current_session(
    authorization: str | None = Header(default=None),
    repository: SQLiteRepository = Depends(get_repository),
) -> AuthSession | None:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        return get_session_from_token(repository, token)
    return None


async def get_required_session(
    authorization: str | None = Header(default=None),
    repository: SQLiteRepository = Depends(get_repository),
) -> AuthSession:
    session = await get_current_session(authorization=authorization, repository=repository)
    if session is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="No active session.")
    return session
