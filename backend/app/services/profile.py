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


class OnboardingAlreadyCompletedError(RuntimeError):
    pass


def ensure_default_meal_plan_window(
    repository: SQLiteRepository,
    *,
    user_id: str,
    calorie_target: int | None = None,
    start_date: date | None = None,
    day_count: int = 4,
) -> None:
    profile = repository.get_user_identity(user_id) or {}
    resolved_target = calorie_target or profile.get("initial_calorie_target")
    if resolved_target is None:
        return
    existing_dates = {day.get("plan_date") for day in repository.list_meal_plan_days(user_id)}
    first_day = start_date or date.today()
    calorie_target = int(round(resolved_target))

    slot_specs = [
        {
            "meal_label": "Breakfast",
            "title": "Greek yogurt + berries",
            "prep_status": "Prepped",
            "ratio": 0.22,
            "items": [
                {
                    "name": "Greek yogurt",
                    "quantity_label": "300 g",
                    "calories": 177,
                    "macros": {"protein": 30.9, "carbs": 10.8, "fat": 1.2},
                },
                {
                    "name": "Blueberries",
                    "quantity_label": "140 g",
                    "calories": 80,
                    "macros": {"protein": 1.0, "carbs": 20.3, "fat": 0.4},
                },
                {
                    "name": "Chia seeds",
                    "quantity_label": "20 g",
                    "calories": 97,
                    "macros": {"protein": 3.3, "carbs": 8.4, "fat": 6.1},
                },
            ],
        },
        {
            "meal_label": "Snack",
            "title": "Apple + string cheese",
            "prep_status": "Flexible",
            "ratio": 0.10,
            "items": [
                {
                    "name": "Apple",
                    "quantity_label": "1 medium",
                    "calories": 95,
                    "macros": {"protein": 0.5, "carbs": 25.0, "fat": 0.3},
                },
                {
                    "name": "String cheese",
                    "quantity_label": "1 stick",
                    "calories": 80,
                    "macros": {"protein": 7.0, "carbs": 1.0, "fat": 6.0},
                },
            ],
        },
        {
            "meal_label": "Lunch",
            "title": "Chicken rice bowl",
            "prep_status": "Needs prep",
            "ratio": 0.30,
            "items": [
                {
                    "name": "Chicken breast",
                    "quantity_label": "170 g",
                    "calories": 281,
                    "macros": {"protein": 52.7, "carbs": 0.0, "fat": 6.1},
                },
                {
                    "name": "Cooked rice",
                    "quantity_label": "250 g",
                    "calories": 325,
                    "macros": {"protein": 6.8, "carbs": 70.5, "fat": 0.8},
                },
                {
                    "name": "Broccoli",
                    "quantity_label": "120 g",
                    "calories": 41,
                    "macros": {"protein": 3.4, "carbs": 7.9, "fat": 0.5},
                },
            ],
        },
        {
            "meal_label": "Snack",
            "title": "Protein shake",
            "prep_status": "Flexible",
            "ratio": 0.10,
            "items": [
                {
                    "name": "Whey protein",
                    "quantity_label": "1 scoop",
                    "calories": 120,
                    "macros": {"protein": 24.0, "carbs": 3.0, "fat": 1.5},
                },
                {
                    "name": "Banana",
                    "quantity_label": "1 small",
                    "calories": 90,
                    "macros": {"protein": 1.1, "carbs": 23.0, "fat": 0.3},
                },
            ],
        },
        {
            "meal_label": "Dinner",
            "title": "Salmon + potato + broccoli",
            "prep_status": "Needs prep",
            "ratio": 0.28,
            "items": [
                {
                    "name": "Salmon",
                    "quantity_label": "170 g",
                    "calories": 354,
                    "macros": {"protein": 37.4, "carbs": 0.0, "fat": 22.1},
                },
                {
                    "name": "Roasted potato",
                    "quantity_label": "250 g",
                    "calories": 232,
                    "macros": {"protein": 5.0, "carbs": 52.0, "fat": 0.3},
                },
                {
                    "name": "Broccoli",
                    "quantity_label": "150 g",
                    "calories": 51,
                    "macros": {"protein": 4.2, "carbs": 9.9, "fat": 0.6},
                },
            ],
        },
    ]
    rounded = [round(calorie_target * spec["ratio"]) for spec in slot_specs]
    adjustment = calorie_target - sum(rounded)
    rounded[-1] += adjustment
    slots = [
        {
            "meal_label": spec["meal_label"],
            "title": spec["title"],
            "calories": max(int(calories), 0),
            "prep_status": spec["prep_status"],
            "items": spec["items"],
        }
        for spec, calories in zip(slot_specs, rounded, strict=False)
    ]
    for day_offset in range(max(day_count, 1)):
        plan_day = first_day + timedelta(days=day_offset)
        if plan_day.isoformat() in existing_dates:
            continue
        repository.save_meal_plan_day(
            user_id=user_id,
            plan_date=plan_day,
            label=plan_day.strftime("%a"),
            focus="Daily plan",
            slots=slots,
        )


def ensure_default_planned_exercise_window(
    repository: SQLiteRepository,
    *,
    user_id: str,
    start_date: date | None = None,
    day_count: int = 4,
) -> None:
    existing_dates = {entry.get("planned_on") for entry in repository.list_planned_exercise_entries(user_id)}
    first_day = start_date or date.today()
    plan_specs = [
        {
            "title": "Swim 2000m · 400m warmup · 4 x 50m drills · 10 x 100m steady · 400m cool-down",
            "duration_minutes": 55,
            "calories_burned": 520,
            "planned_at": "06:30",
            "intensity": "High",
        },
        {
            "title": "Incline walk",
            "duration_minutes": 35,
            "calories_burned": 240,
            "planned_at": "07:15",
            "intensity": "Moderate",
        },
        {
            "title": "Upper body lift",
            "duration_minutes": 52,
            "calories_burned": 310,
            "planned_at": "17:40",
            "intensity": "High",
        },
        {
            "title": "Recovery walk",
            "duration_minutes": 25,
            "calories_burned": 140,
            "planned_at": "18:00",
            "intensity": "Low",
        },
    ]

    for day_offset in range(max(day_count, 1)):
        planned_day = first_day + timedelta(days=day_offset)
        if planned_day.isoformat() in existing_dates:
            continue
        spec = plan_specs[day_offset % len(plan_specs)]
        repository.create_planned_exercise_entry(
            user_id=user_id,
            title=spec["title"],
            duration_minutes=spec["duration_minutes"],
            calories_burned=spec["calories_burned"],
            planned_on=planned_day,
            planned_at=spec["planned_at"],
            intensity=spec["intensity"],
        )


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
