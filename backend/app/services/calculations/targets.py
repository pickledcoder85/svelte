from backend.app.services.calculations.energy import (
    GOAL_CALORIE_ADJUSTMENTS,
    MINIMUM_CALORIE_TARGET,
    NON_EXERCISE_ACTIVITY_FACTORS,
    calculate_energy_targets,
)
from backend.app.services.calculations.macros import (
    generate_fiber_target,
    generate_macro_targets,
)
from backend.app.services.calculations.types import (
    GOAL_PACES,
    GoalPace,
    GeneratedNutritionTargets,
    GoalType,
    TargetSource,
)

# Rule of thumb used for the weekly rate shown during setup: about 3,500 kcal per pound.
KCAL_PER_LB = 3500


def generate_nutrition_targets(
    *,
    sex: str,
    age_years: int,
    height_cm: float,
    current_weight_lbs: float,
    activity_level: str,
    goal_type: GoalType,
    goal_pace: GoalPace = None,
    target_source: TargetSource = "system_default",
) -> GeneratedNutritionTargets:
    bmr_calories, maintenance_calories, calorie_target = calculate_energy_targets(
        sex=sex,
        age_years=age_years,
        height_cm=height_cm,
        current_weight_lbs=current_weight_lbs,
        activity_level=activity_level,
        goal_type=goal_type,
        goal_pace=goal_pace,
    )
    protein_goal, carbs_goal, fat_goal = generate_macro_targets(
        calorie_target=calorie_target,
        current_weight_lbs=current_weight_lbs,
        goal_type=goal_type,
        goal_pace=goal_pace,
    )
    fiber_goal = generate_fiber_target(calorie_target)
    return GeneratedNutritionTargets(
        bmr_calories=bmr_calories,
        maintenance_calories=maintenance_calories,
        calorie_target=calorie_target,
        protein_target_g=protein_goal,
        carbs_target_g=carbs_goal,
        fat_target_g=fat_goal,
        fiber_target_g=fiber_goal,
        goal_type=goal_type,
        goal_pace=goal_pace,
        target_source=target_source,
    )


def preview_target_options(
    *,
    sex: str,
    age_years: int,
    height_cm: float,
    current_weight_lbs: float,
    activity_level: str,
) -> dict:
    """Everything setup shows before saving: BMR, maintenance, and each goal/pace option.

    Uses the same functions as generate_nutrition_targets, so previews match saved targets.
    """
    options = []
    bmr_calories = maintenance_calories = 0
    for goal_type, paces in GOAL_PACES.items():
        for goal_pace in paces:
            targets = generate_nutrition_targets(
                sex=sex,
                age_years=age_years,
                height_cm=height_cm,
                current_weight_lbs=current_weight_lbs,
                activity_level=activity_level,
                goal_type=goal_type,
                goal_pace=goal_pace,
            )
            bmr_calories, maintenance_calories = targets.bmr_calories, targets.maintenance_calories
            daily_change = targets.calorie_target - targets.maintenance_calories
            options.append(
                {
                    "goal_type": goal_type,
                    "goal_pace": goal_pace,
                    "calorie_target": targets.calorie_target,
                    "daily_adjustment": daily_change,
                    # A loss pace asked for less than the floor allows, so the target was raised.
                    "limited_by_minimum": goal_type == "lose"
                    and targets.maintenance_calories + GOAL_CALORIE_ADJUSTMENTS[(goal_type, goal_pace)]
                    < MINIMUM_CALORIE_TARGET,
                    "weekly_change_lbs": round(daily_change * 7 / KCAL_PER_LB, 2),
                    "protein_target_g": targets.protein_target_g,
                    "carbs_target_g": targets.carbs_target_g,
                    "fat_target_g": targets.fat_target_g,
                }
            )
    return {
        "bmr_calories": bmr_calories,
        "maintenance_calories": maintenance_calories,
        "minimum_calorie_target": MINIMUM_CALORIE_TARGET,
        # When even maintenance is under the floor, every target is a small surplus.
        "maintenance_below_minimum": maintenance_calories < MINIMUM_CALORIE_TARGET,
        "options": options,
        # Maintenance at every activity level, so setup can show each one without asking again.
        "maintenance_by_activity": {
            level: calculate_energy_targets(
                sex=sex,
                age_years=age_years,
                height_cm=height_cm,
                current_weight_lbs=current_weight_lbs,
                activity_level=level,
                goal_type="maintain",
            )[1]
            for level in NON_EXERCISE_ACTIVITY_FACTORS
        },
    }
