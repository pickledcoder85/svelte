from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_current_session, get_repository
from backend.app.models.auth import AuthSession
from backend.app.models.profile import (
    DashboardSummary,
    ProfileProgress,
    UserGoal,
    UserGoalCreateRequest,
    UserProfile,
    UserProfileUpdateRequest,
    WeightEntry,
    WeightEntryCreateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.profile import (
    create_weight_entry,
    create_user_goal,
    get_dashboard_summary,
    get_profile_progress,
    get_user_profile,
    list_user_goals,
    list_weight_entries,
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


@router.get("/weights", response_model=list[WeightEntry])
async def read_weights(
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[WeightEntry]:
    return list_weight_entries(repository, _require_session(session).user_id)


@router.post("/weights", response_model=WeightEntry)
async def write_weight(
    payload: WeightEntryCreateRequest,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> WeightEntry:
    return create_weight_entry(repository, _require_session(session), payload)


@router.get("/progress", response_model=ProfileProgress)
async def read_progress(
    week_start: date | None = None,
    week_end: date | None = None,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> ProfileProgress:
    return get_profile_progress(
        repository,
        _require_session(session).user_id,
        week_start=week_start,
        week_end=week_end,
    )


@router.get("/dashboard", response_model=DashboardSummary)
async def read_dashboard(
    week_start: date | None = None,
    week_end: date | None = None,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> DashboardSummary:
    return get_dashboard_summary(
        repository,
        _require_session(session).user_id,
        week_start=week_start,
        week_end=week_end,
    )
