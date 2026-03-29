from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.profile import (
    DashboardSummary,
    ProfileProgress,
    UserOnboardingRequest,
    UserGoal,
    UserGoalCreateRequest,
    UserProfile,
    UserProfileUpdateRequest,
    WeightEntry,
    WeightEntryCreateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.profile import (
    OnboardingAlreadyCompletedError,
    complete_user_onboarding,
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


@router.get("", response_model=UserProfile)
async def read_profile(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserProfile:
    return get_user_profile(repository, session)


@router.put("", response_model=UserProfile)
async def write_profile(
    payload: UserProfileUpdateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserProfile:
    try:
        return update_user_profile(repository, session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/goals", response_model=list[UserGoal])
async def read_goals(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[UserGoal]:
    return list_user_goals(repository, session.user_id)


@router.post("/goals", response_model=UserGoal)
async def write_goal(
    payload: UserGoalCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserGoal:
    return create_user_goal(repository, session, payload)


@router.get("/weights", response_model=list[WeightEntry])
async def read_weights(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[WeightEntry]:
    return list_weight_entries(repository, session.user_id)


@router.post("/weights", response_model=WeightEntry)
async def write_weight(
    payload: WeightEntryCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> WeightEntry:
    return create_weight_entry(repository, session, payload)


@router.get("/progress", response_model=ProfileProgress)
async def read_progress(
    week_start: date | None = None,
    week_end: date | None = None,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> ProfileProgress:
    return get_profile_progress(
        repository,
        session.user_id,
        week_start=week_start,
        week_end=week_end,
    )


@router.get("/dashboard", response_model=DashboardSummary)
async def read_dashboard(
    week_start: date | None = None,
    week_end: date | None = None,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> DashboardSummary:
    return get_dashboard_summary(
        repository,
        session.user_id,
        week_start=week_start,
        week_end=week_end,
    )


@router.post("/onboarding", response_model=UserProfile)
async def complete_onboarding(
    payload: UserOnboardingRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> UserProfile:
    try:
        return complete_user_onboarding(repository, session, payload)
    except OnboardingAlreadyCompletedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
