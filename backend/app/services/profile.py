from backend.app.models.auth import AuthSession
from backend.app.models.profile import (
    UserGoal,
    UserGoalCreateRequest,
    UserProfile,
    UserProfileUpdateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository


def get_user_profile(repository: SQLiteRepository, session: AuthSession) -> UserProfile:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    profile = repository.get_user_identity(session.user_id)
    if profile is None:
        raise RuntimeError("Failed to load user profile.")
    return UserProfile.model_validate(profile)


def update_user_profile(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: UserProfileUpdateRequest,
) -> UserProfile:
    profile = repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=payload.display_name,
        timezone=payload.timezone,
        units=payload.units,
    )
    return UserProfile.model_validate(profile)


def create_user_goal(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: UserGoalCreateRequest,
) -> UserGoal:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    goal = repository.save_user_goal(
        user_id=session.user_id,
        effective_at=payload.effective_at,
        calorie_goal=payload.calorie_goal,
        protein_goal=payload.protein_goal,
        carbs_goal=payload.carbs_goal,
        fat_goal=payload.fat_goal,
        target_weight_lbs=payload.target_weight_lbs,
    )
    return UserGoal.model_validate(goal)


def list_user_goals(repository: SQLiteRepository, user_id: str) -> list[UserGoal]:
    return [UserGoal.model_validate(goal) for goal in repository.list_user_goals(user_id)]
