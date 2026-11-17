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
from backend.app.services.calculations.types import DEFAULT_GOAL_PACE, is_valid_goal_pace
from backend.app.services.calculations.macros import generate_fiber_target
from backend.app.services.calculations.targets import generate_nutrition_targets
from backend.app.services.calculations.types import CALCULATION_VERSION
from backend.app.services.meal_split import DEFAULT_SPLITS, validate_split


class OnboardingAlreadyCompletedError(RuntimeError):
    pass


def get_user_profile(repository: SQLiteRepository, session: AuthSession) -> UserProfile:
    repository.ensure_user_identity(
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
    # Check the meal balance before saving anything (a ValueError: a 400).
    meal_split = validate_split(3, list(payload.meal_split)) if payload.meal_split is not None else None

    repository.ensure_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    if payload.display_name and payload.display_name.strip():
        repository.update_display_name(user_id=session.user_id, display_name=payload.display_name.strip())
    if payload.units is not None or payload.timezone is not None:
        repository.update_user_preferences(
            user_id=session.user_id,
            timezone=payload.timezone,
            units=payload.units,
        )
    targets = generate_nutrition_targets(
        sex=payload.sex,
        age_years=payload.age_years,
        height_cm=payload.height_cm,
        current_weight_lbs=payload.current_weight_lbs,
        activity_level=payload.activity_level,
        goal_type=payload.goal_type,
        goal_pace=payload.goal_pace,        calorie_floor=payload.calorie_floor,
    )
    profile = repository.save_user_onboarding(
        user_id=session.user_id,
        sex=payload.sex,
        age_years=payload.age_years,
        height_cm=payload.height_cm,
        current_weight_lbs=payload.current_weight_lbs,
        goal_type=payload.goal_type,
        goal_pace=payload.goal_pace,
        target_weight_lbs=payload.target_weight_lbs,
        activity_level=payload.activity_level,
        dietary_pattern=payload.dietary_pattern,
        nutrition_style=payload.nutrition_style,
        allergy_notes=payload.allergy_notes,
        bmr_calories=targets.bmr_calories,
        tdee_calories=targets.maintenance_calories,
        initial_calorie_target=targets.calorie_target,
        protein_target_g=targets.protein_target_g,
        carbs_target_g=targets.carbs_target_g,
        fat_target_g=targets.fat_target_g,
        fiber_target_g=targets.fiber_target_g,
        calculation_version=targets.calculation_version,
        target_source=targets.target_source,
        calorie_floor=payload.calorie_floor,
    )
    repository.save_user_goal(
        user_id=session.user_id,
        effective_at=date.today(),
        calorie_goal=targets.calorie_target,
        protein_goal=targets.protein_target_g,
        carbs_goal=targets.carbs_target_g,
        fat_goal=targets.fat_target_g,
        fiber_goal=targets.fiber_target_g,
        goal_type=targets.goal_type,
        goal_pace=targets.goal_pace,
        calculation_version=targets.calculation_version,
        target_source=targets.target_source,
        target_weight_lbs=payload.target_weight_lbs,
    )
    # Setup no longer creates a sample meal plan or sample workouts: real accounts start empty
    # and the user builds their own (the dev seed still has sample data for testing).
    if profile is None:
        raise RuntimeError("Failed to persist onboarding profile.")
    if meal_split is not None:
        # Breakfast, lunch, dinner (snacks come later).
        repository.update_user_preferences(user_id=session.user_id, meals_per_day=3, meal_split=meal_split)
        profile = repository.get_user_identity(session.user_id) or profile
    return UserProfile.model_validate(profile)


def reset_user_setup(repository: SQLiteRepository, session: AuthSession) -> UserProfile:
    """Start setup over (Profile > Reset profile). Foods, logs, and history are kept."""
    repository.ensure_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    profile = repository.reset_user_setup(session.user_id)
    if profile is None:
        raise RuntimeError("Failed to reset the profile.")
    return UserProfile.model_validate(profile)


def update_user_profile(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: UserProfileUpdateRequest,
) -> UserProfile:
    existing_profile = repository.get_user_identity(session.user_id) or {}
    # Check a new meal split before saving anything (MealSplitError is a ValueError: a 400).
    new_split: tuple[int, list[int]] | None = None
    if payload.meals_per_day is not None or payload.meal_split is not None:
        count = payload.meals_per_day or existing_profile.get("meals_per_day") or 3
        # A new count without a split starts from that count's default split.
        if payload.meal_split is not None:
            split = payload.meal_split
        elif count == existing_profile.get("meals_per_day"):
            split = existing_profile.get("meal_split") or DEFAULT_SPLITS[count]
        else:
            split = DEFAULT_SPLITS[count]
        new_split = (count, validate_split(count, list(split)))
    provided_fields = payload.model_fields_set
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=(
            payload.display_name
            if "display_name" in provided_fields
            else existing_profile.get("display_name")
        ),
        timezone=payload.timezone,
        units=payload.units,
    )
    if payload.workout_calories_share is not None:
        repository.update_user_preferences(
            user_id=session.user_id, workout_calories_share=payload.workout_calories_share
        )
    if new_split is not None:
        repository.update_user_preferences(user_id=session.user_id, meals_per_day=new_split[0], meal_split=new_split[1])
    if payload.water_goal_ml is not None:
        repository.update_user_preferences(user_id=session.user_id, water_goal_ml=payload.water_goal_ml)
    if payload.language is not None:
        repository.update_user_preferences(user_id=session.user_id, language=payload.language)

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
        "goal_pace": payload.goal_pace if "goal_pace" in provided_fields else existing_profile.get("goal_pace"),
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
        "dietary_pattern": (
            payload.dietary_pattern
            if "dietary_pattern" in provided_fields
            else existing_profile.get("dietary_pattern")
        ),
        "nutrition_style": (
            payload.nutrition_style
            if "nutrition_style" in provided_fields
            else existing_profile.get("nutrition_style")
        ),
        "allergy_notes": (
            payload.allergy_notes
            if "allergy_notes" in provided_fields
            else existing_profile.get("allergy_notes")
        ),
        "calorie_floor": (
            payload.calorie_floor
            if "calorie_floor" in provided_fields and payload.calorie_floor is not None
            else existing_profile.get("calorie_floor") or "recommended"
        ),
    }
    # A pace carried over from a different goal no longer applies; fall back to the default.
    if resolved["goal_type"] and not is_valid_goal_pace(resolved["goal_type"], resolved["goal_pace"]):
        resolved["goal_pace"] = None

    def comparable(key: str, value):
        # "No pace" and the goal's default pace produce the same targets, so they are equal here;
        # otherwise a profile saved before paces were stored would be recalculated (and a
        # custom goal replaced) on every unrelated save.
        if key == "goal_pace":
            return value or DEFAULT_GOAL_PACE.get(resolved["goal_type"] or "")
        return value

    derived_fields_changed = any(
        comparable(key, resolved[key]) != comparable(key, existing_profile.get(key))
        for key in (
            "sex",
            "age_years",
            "height_cm",
            "current_weight_lbs",
            "goal_type",
            "goal_pace",
            "target_weight_lbs",
            "activity_level",
            "calorie_floor",
        )
    )
    if derived_fields_changed:
        required_keys = (
            "sex",
            "age_years",
            "height_cm",
            "current_weight_lbs",
            "goal_type",
            "activity_level",
            "dietary_pattern",
            "nutrition_style",
        )
        missing_keys = [key for key in required_keys if resolved[key] is None]
        if missing_keys:
            missing_summary = ", ".join(missing_keys)
            raise ValueError(f"Profile recalculation requires: {missing_summary}.")

    # Diet, nutrition style, and allergies don't change the targets: save them directly, so a
    # change never recalculates (or replaces a custom goal). Checked above first, so a refused
    # recalculation doesn't leave these half-saved.
    if any(
        resolved[key] != existing_profile.get(key) for key in ("dietary_pattern", "nutrition_style", "allergy_notes")
    ):
        repository.update_eating_preferences(
            user_id=session.user_id,
            dietary_pattern=resolved["dietary_pattern"],
            nutrition_style=resolved["nutrition_style"],
            allergy_notes=resolved["allergy_notes"],
        )

    if derived_fields_changed:

        targets = generate_nutrition_targets(
            sex=str(resolved["sex"]),
            age_years=int(resolved["age_years"]),
            height_cm=float(resolved["height_cm"]),
            current_weight_lbs=float(resolved["current_weight_lbs"]),
            activity_level=str(resolved["activity_level"]),
            goal_type=str(resolved["goal_type"]),
            goal_pace=resolved["goal_pace"],
            calorie_floor=str(resolved["calorie_floor"]),
        )
        profile = repository.save_user_onboarding(
            user_id=session.user_id,
            sex=str(resolved["sex"]),
            age_years=int(resolved["age_years"]),
            height_cm=float(resolved["height_cm"]),
            current_weight_lbs=float(resolved["current_weight_lbs"]),
            goal_type=str(resolved["goal_type"]),
            goal_pace=resolved["goal_pace"],
            target_weight_lbs=(
                float(resolved["target_weight_lbs"])
                if resolved["target_weight_lbs"] is not None
                else None
            ),
            activity_level=str(resolved["activity_level"]),
            dietary_pattern=str(resolved["dietary_pattern"]),
            nutrition_style=str(resolved["nutrition_style"] or "balanced"),
            allergy_notes=(
                str(resolved["allergy_notes"])
                if resolved["allergy_notes"] is not None
                else None
            ),
            bmr_calories=targets.bmr_calories,
            tdee_calories=targets.maintenance_calories,
            initial_calorie_target=targets.calorie_target,
            protein_target_g=targets.protein_target_g,
            carbs_target_g=targets.carbs_target_g,
            fat_target_g=targets.fat_target_g,
            fiber_target_g=targets.fiber_target_g,
            calculation_version=targets.calculation_version,
            target_source=targets.target_source,
            calorie_floor=str(resolved["calorie_floor"]),
        )
        repository.save_user_goal(
            user_id=session.user_id,
            effective_at=date.today(),
            calorie_goal=targets.calorie_target,
            protein_goal=targets.protein_target_g,
            carbs_goal=targets.carbs_target_g,
            fat_goal=targets.fat_target_g,
            fiber_goal=targets.fiber_target_g,
            goal_type=targets.goal_type,
            goal_pace=targets.goal_pace,
            calculation_version=targets.calculation_version,
            target_source=targets.target_source,
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
    existing_profile = repository.get_user_identity(session.user_id) or {}
    fiber_goal = (
        payload.fiber_goal
        if payload.fiber_goal is not None
        else generate_fiber_target(payload.calorie_goal)
    )
    repository.ensure_user_identity(
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
        fiber_goal=fiber_goal,
        goal_type=existing_profile.get("goal_type"),
        goal_pace=existing_profile.get("goal_pace"),
        calculation_version=CALCULATION_VERSION,
        target_source="user_custom",
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
    repository.ensure_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    entry_id = repository.record_weight_entry(
        user_id=session.user_id,
        recorded_at=payload.recorded_at,
        weight_lbs=payload.weight_lbs,
    )
    entry = repository.get_weight_entry(entry_id)
    if entry is None:
        raise RuntimeError("Failed to load newly created weight entry.")
    return WeightEntry.model_validate(entry)


def list_weight_entries(repository: SQLiteRepository, user_id: str) -> list[WeightEntry]:
    return [WeightEntry.model_validate(entry) for entry in repository.list_weight_entries(user_id)]


def get_profile_progress(
    repository: SQLiteRepository,
    user_id: str,
    week_start: date | None = None,
    week_end: date | None = None,
) -> ProfileProgress:
    profile = repository.get_user_identity(user_id) or {"user_id": user_id}
    goals = repository.list_user_goals(user_id)
    weight_entries = repository.list_weight_entries(user_id)
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
    weight_entries = repository.list_weight_entries(user_id)
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

    resolved_end = repository.latest_activity_date(user_id)
    if resolved_end is None:
        return repository.get_weekly_metrics_for_user(user_id=user_id)
    return repository.get_weekly_metrics_for_user(
        user_id=user_id,
        week_start=resolved_end - timedelta(days=6),
        week_end=resolved_end,
    )
