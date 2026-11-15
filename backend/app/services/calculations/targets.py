from backend.app.services.calculations.energy import (
    NON_EXERCISE_ACTIVITY_FACTORS,
    calculate_energy_targets,
    recommended_minimum_calories,
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


def weekly_change(daily_change: int) -> float:
    return round(daily_change * 7 / KCAL_PER_LB, 2)


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
    calorie_floor: str = "recommended",
) -> GeneratedNutritionTargets:
    bmr_calories, maintenance_calories, calorie_target = calculate_energy_targets(
        sex=sex,
        age_years=age_years,
        height_cm=height_cm,
        current_weight_lbs=current_weight_lbs,
        activity_level=activity_level,
        goal_type=goal_type,
        goal_pace=goal_pace,
        calorie_floor=calorie_floor,
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
    minimum = recommended_minimum_calories(sex)
    options = []
    bmr_calories = maintenance_calories = 0
    for goal_type, paces in GOAL_PACES.items():
        for goal_pace in paces:
            body = dict(
                sex=sex,
                age_years=age_years,
                height_cm=height_cm,
                current_weight_lbs=current_weight_lbs,
                activity_level=activity_level,
                goal_type=goal_type,
                goal_pace=goal_pace,
            )
            # The honest calculation, and the same pace with the recommended minimum applied.
            calculated = generate_nutrition_targets(**body, calorie_floor="off")
            floored = generate_nutrition_targets(**body, calorie_floor="recommended")
            bmr_calories, maintenance_calories = calculated.bmr_calories, calculated.maintenance_calories
            daily_change = calculated.calorie_target - calculated.maintenance_calories
            options.append(
                {
                    "goal_type": goal_type,
                    "goal_pace": goal_pace,
                    "calorie_target": calculated.calorie_target,
                    "daily_adjustment": daily_change,
                    "weekly_change_lbs": weekly_change(daily_change),
                    "protein_target_g": calculated.protein_target_g,
                    "carbs_target_g": calculated.carbs_target_g,
                    "fat_target_g": calculated.fat_target_g,
                    "below_recommended_minimum": calculated.calorie_target < minimum,
                    "floor_calorie_target": floored.calorie_target,
                    "floor_weekly_change_lbs": weekly_change(floored.calorie_target - floored.maintenance_calories),
                    "floor_protein_target_g": floored.protein_target_g,
                    "floor_carbs_target_g": floored.carbs_target_g,
                    "floor_fat_target_g": floored.fat_target_g,
                }
            )
    return {
        "bmr_calories": bmr_calories,
        "maintenance_calories": maintenance_calories,
        "recommended_minimum_calories": minimum,
        # When even maintenance is under the minimum, the floor makes every target a surplus.
        "maintenance_below_minimum": maintenance_calories < minimum,
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
