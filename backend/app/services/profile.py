from datetime import date, timedelta
from uuid import uuid4

from backend.app.models.auth import AuthSession
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
    WeightHistorySummary,
)
from backend.app.models.nutrition import WeeklyMetrics
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.calculations.energy import calculate_onboarding_energy_targets
from backend.app.services.calculations.macros import generate_macro_targets
from backend.app.services.calculations.energy import calculate_energy_targets


class OnboardingAlreadyCompletedError(RuntimeError):
    pass


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


def complete_user_onboarding(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: UserOnboardingRequest,
) -> UserProfile:
    profile = repository.get_user_identity(session.user_id)
    if profile is not None and profile.get("setup_completed_at") is not None:
        raise OnboardingAlreadyCompletedError("User onboarding is already complete.")

    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    bmr_calories, tdee_calories, initial_calorie_target = calculate_onboarding_energy_targets(payload)
    protein_goal, carbs_goal, fat_goal = generate_macro_targets(
        calorie_target=initial_calorie_target,
        current_weight_lbs=payload.current_weight_lbs,
        goal_type=payload.goal_type,
    )
    profile = repository.save_user_onboarding(
        user_id=session.user_id,
        sex=payload.sex,
        age_years=payload.age_years,
        height_cm=payload.height_cm,
        current_weight_lbs=payload.current_weight_lbs,
        goal_type=payload.goal_type,
        target_weight_lbs=payload.target_weight_lbs,
        activity_level=payload.activity_level,
        bmr_calories=bmr_calories,
        tdee_calories=tdee_calories,
        initial_calorie_target=initial_calorie_target,
    )
    repository.save_user_goal(
        user_id=session.user_id,
        effective_at=date.today(),
        calorie_goal=initial_calorie_target,
        protein_goal=protein_goal,
        carbs_goal=carbs_goal,
        fat_goal=fat_goal,
        target_weight_lbs=payload.target_weight_lbs,
    )
    if profile is None:
        raise RuntimeError("Failed to persist onboarding profile.")
    return UserProfile.model_validate(profile)


def update_user_profile(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: UserProfileUpdateRequest,
) -> UserProfile:
    existing_profile = repository.get_user_identity(session.user_id) or {}
    provided_fields = payload.model_fields_set
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=payload.display_name,
        timezone=payload.timezone,
        units=payload.units,
    )

    resolved = {
        "sex": payload.sex if "sex" in provided_fields else existing_profile.get("sex"),
        "age_years": payload.age_years if "age_years" in provided_fields else existing_profile.get("age_years"),
        "height_cm": payload.height_cm if "height_cm" in provided_fields else existing_profile.get("height_cm"),
        "current_weight_lbs": (
            payload.current_weight_lbs
            if "current_weight_lbs" in provided_fields
            else existing_profile.get("current_weight_lbs")
        ),
        "goal_type": payload.goal_type if "goal_type" in provided_fields else existing_profile.get("goal_type"),
        "target_weight_lbs": (
            payload.target_weight_lbs
            if "target_weight_lbs" in provided_fields
            else existing_profile.get("target_weight_lbs")
        ),
        "activity_level": (
            payload.activity_level
            if "activity_level" in provided_fields
            else existing_profile.get("activity_level")
        ),
    }
    derived_fields_changed = any(
        resolved[key] != existing_profile.get(key)
        for key in (
            "sex",
            "age_years",
            "height_cm",
            "current_weight_lbs",
            "goal_type",
            "target_weight_lbs",
            "activity_level",
        )
    )

    if derived_fields_changed:
        required_keys = ("sex", "age_years", "height_cm", "current_weight_lbs", "goal_type", "activity_level")
        missing_keys = [key for key in required_keys if resolved[key] is None]
        if missing_keys:
            missing_summary = ", ".join(missing_keys)
            raise ValueError(f"Profile recalculation requires: {missing_summary}.")

        bmr_calories, tdee_calories, initial_calorie_target = calculate_energy_targets(
            sex=str(resolved["sex"]),
            age_years=int(resolved["age_years"]),
            height_cm=float(resolved["height_cm"]),
            current_weight_lbs=float(resolved["current_weight_lbs"]),
            activity_level=str(resolved["activity_level"]),
            goal_type=str(resolved["goal_type"]),
        )
        protein_goal, carbs_goal, fat_goal = generate_macro_targets(
            calorie_target=initial_calorie_target,
            current_weight_lbs=float(resolved["current_weight_lbs"]),
            goal_type=str(resolved["goal_type"]),
        )
        profile = repository.save_user_onboarding(
            user_id=session.user_id,
            sex=str(resolved["sex"]),
            age_years=int(resolved["age_years"]),
            height_cm=float(resolved["height_cm"]),
            current_weight_lbs=float(resolved["current_weight_lbs"]),
            goal_type=str(resolved["goal_type"]),
            target_weight_lbs=(
                float(resolved["target_weight_lbs"])
                if resolved["target_weight_lbs"] is not None
                else None
            ),
            activity_level=str(resolved["activity_level"]),
            bmr_calories=bmr_calories,
            tdee_calories=tdee_calories,
            initial_calorie_target=initial_calorie_target,
        )
        repository.save_user_goal(
            user_id=session.user_id,
            effective_at=date.today(),
            calorie_goal=initial_calorie_target,
            protein_goal=protein_goal,
            carbs_goal=carbs_goal,
            fat_goal=fat_goal,
            target_weight_lbs=(
                float(resolved["target_weight_lbs"])
                if resolved["target_weight_lbs"] is not None
                else None
            ),
            goal_id=str(uuid4()),
        )
    else:
        profile = repository.mark_user_setup_completed(session.user_id)

    if profile is None:
        raise RuntimeError("Failed to persist user profile setup state.")
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
    weekly_metrics = _resolve_weekly_metrics(repository, user_id, week_start, week_end)

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


def get_dashboard_summary(
    repository: SQLiteRepository,
    user_id: str,
    week_start: date | None = None,
    week_end: date | None = None,
) -> DashboardSummary:
    progress = get_profile_progress(repository, user_id, week_start=week_start, week_end=week_end)
    weight_entries = _list_weight_entries(repository, user_id)
    weekly_metrics = _resolve_weekly_metrics(repository, user_id, week_start, week_end)
    latest_recorded_at = date.fromisoformat(weight_entries[-1]["recorded_at"]) if weight_entries else None
    current_weight = float(weight_entries[-1]["weight_lbs"]) if weight_entries else None
    start_weight = float(weight_entries[0]["weight_lbs"]) if weight_entries else None
    recent_entries = [WeightEntry.model_validate(entry) for entry in weight_entries[-7:]]

    return DashboardSummary(
        progress=progress,
        weekly_metrics=weekly_metrics,
        weight_history=WeightHistorySummary(
            entry_count=len(weight_entries),
            current_weight_lbs=current_weight,
            start_weight_lbs=start_weight,
            change_from_start_lbs=(
                round(current_weight - start_weight, 1)
                if current_weight is not None and start_weight is not None
                else None
            ),
            latest_recorded_at=latest_recorded_at,
            recent_entries=recent_entries,
        ),
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


def _latest_activity_date(repository: SQLiteRepository, user_id: str) -> date | None:
    row = repository._connection.execute(
        """
        SELECT MAX(activity_date) AS activity_date
        FROM (
            SELECT MAX(recorded_at) AS activity_date
            FROM weight_entries
            WHERE user_id = ?
            UNION ALL
            SELECT MAX(log_date) AS activity_date
            FROM food_logs
            WHERE user_id = ?
        )
        """,
        (user_id, user_id),
    ).fetchone()
    if row is None or row["activity_date"] is None:
        return None
    return date.fromisoformat(row["activity_date"])


def _resolve_weekly_metrics(
    repository: SQLiteRepository,
    user_id: str,
    week_start: date | None,
    week_end: date | None,
) -> WeeklyMetrics:
    if week_start is not None and week_end is not None:
        return repository.get_weekly_metrics_for_user(
            user_id=user_id,
            week_start=week_start,
            week_end=week_end,
        )

    resolved_end = _latest_activity_date(repository, user_id)
    if resolved_end is None:
        return repository.get_weekly_metrics_for_user(user_id=user_id)
    return repository.get_weekly_metrics_for_user(
        user_id=user_id,
        week_start=resolved_end - timedelta(days=6),
        week_end=resolved_end,
    )
