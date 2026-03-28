from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_current_session, get_repository
from backend.app.models.auth import AuthSession
from backend.app.models.profile import (
    UserGoal,
    UserGoalCreateRequest,
    UserProfile,
    UserProfileUpdateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.profile import (
    create_user_goal,
    get_user_profile,
    list_user_goals,
    update_user_profile,
)


router = APIRouter(prefix="/profile", tags=["profile"])


def _require_session(session: AuthSession | None) -> AuthSession:
    if session is None:
        raise HTTPException(status_code=401, detail="No active session.")
    return session


@router.get("", response_model=UserProfile)
async def read_profile(
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserProfile:
    return get_user_profile(repository, _require_session(session))


@router.put("", response_model=UserProfile)
async def write_profile(
    payload: UserProfileUpdateRequest,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserProfile:
    return update_user_profile(repository, _require_session(session), payload)


@router.get("/goals", response_model=list[UserGoal])
async def read_goals(
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[UserGoal]:
    return list_user_goals(repository, _require_session(session).user_id)


@router.post("/goals", response_model=UserGoal)
async def write_goal(
    payload: UserGoalCreateRequest,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserGoal:
    return create_user_goal(repository, _require_session(session), payload)
