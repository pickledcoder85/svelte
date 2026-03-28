from datetime import date, timedelta

from backend.app.models.auth import AuthSession
from backend.app.models.profile import (
    ProfileProgress,
    UserGoal,
    UserGoalCreateRequest,
    UserProfile,
    UserProfileUpdateRequest,
    WeightEntry,
    WeightEntryCreateRequest,
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


def create_weight_entry(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: WeightEntryCreateRequest,
) -> WeightEntry:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    entry_id = repository.record_weight_entry(
        user_id=session.user_id,
        recorded_at=payload.recorded_at,
        weight_lbs=payload.weight_lbs,
    )
    entry = _get_weight_entry(repository, entry_id)
    if entry is None:
        raise RuntimeError("Failed to load newly created weight entry.")
    return WeightEntry.model_validate(entry)


def list_weight_entries(repository: SQLiteRepository, user_id: str) -> list[WeightEntry]:
    return [WeightEntry.model_validate(entry) for entry in _list_weight_entries(repository, user_id)]


def get_profile_progress(
    repository: SQLiteRepository,
    user_id: str,
    week_start: date | None = None,
    week_end: date | None = None,
) -> ProfileProgress:
    profile = repository.get_user_identity(user_id) or {"user_id": user_id}
    goals = repository.list_user_goals(user_id)
    weight_entries = _list_weight_entries(repository, user_id)
    if week_start is None or week_end is None:
        current_date = date.today()
        week_start = current_date - timedelta(days=current_date.weekday())
        week_end = week_start + timedelta(days=6)

    weekly_metrics = repository.get_weekly_metrics_for_user(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
    )

    current_weight = float(weight_entries[-1]["weight_lbs"]) if weight_entries else None
    start_weight = float(weight_entries[0]["weight_lbs"]) if weight_entries else None
    target_weight = next((goal["target_weight_lbs"] for goal in goals if goal["target_weight_lbs"] is not None), None)

    return ProfileProgress(
        user_id=user_id,
        display_name=profile.get("display_name"),
        current_weight_lbs=current_weight,
        start_weight_lbs=start_weight,
        target_weight_lbs=float(target_weight) if target_weight is not None else None,
        weekly_weight_change=weekly_metrics.weekly_weight_change,
        weight_entries=len(weight_entries),
        calorie_goal=weekly_metrics.calorie_goal,
        calories_consumed=weekly_metrics.calories_consumed,
        adherence_score=weekly_metrics.adherence_score,
    )


def _list_weight_entries(repository: SQLiteRepository, user_id: str) -> list[dict]:
    rows = repository._connection.execute(
        """
        SELECT *
        FROM weight_entries
        WHERE user_id = ?
        ORDER BY recorded_at ASC, created_at ASC, id ASC
        """,
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def _get_weight_entry(repository: SQLiteRepository, entry_id: str) -> dict | None:
    row = repository._connection.execute(
        "SELECT * FROM weight_entries WHERE id = ?",
        (entry_id,),
    ).fetchone()
    return dict(row) if row is not None else None
