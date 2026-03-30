from backend.app.services.calculations.energy import calculate_energy_targets
from backend.app.services.calculations.macros import (
    generate_fiber_target,
    generate_macro_targets,
)
from backend.app.services.calculations.types import (
    GoalPace,
    GeneratedNutritionTargets,
    GoalType,
    TargetSource,
)


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
