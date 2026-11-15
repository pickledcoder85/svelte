from backend.app.services.calculations.types import GoalPace, GoalType

PROTEIN_PER_KG = {
    "lose": 1.8,
    "maintain": 1.6,
    "gain": 1.8,
}

FAT_FLOOR_PER_KG = {
    "lose": 0.6,
    "maintain": 0.7,
    "gain": 0.7,
}

FAT_CALORIE_SHARE = {
    "lose": 0.25,
    "maintain": 0.30,
    "gain": 0.25,
}

# Maintenance focus: same calories, different split (docs/CALCULATION_STRATEGY.md).
# build_muscle: more protein for recomposition alongside strength training.
# fuel_training: less fat, so more of the calories come from carbohydrate for endurance work.
MAINTENANCE_FOCUS_MACROS = {
    "steady": {"protein_per_kg": 1.6, "fat_floor_per_kg": 0.7, "fat_share": 0.30},
    "build_muscle": {"protein_per_kg": 2.0, "fat_floor_per_kg": 0.7, "fat_share": 0.27},
    "fuel_training": {"protein_per_kg": 1.6, "fat_floor_per_kg": 0.6, "fat_share": 0.22},
}


def generate_macro_targets(
    *,
    calorie_target: int,
    current_weight_lbs: float,
    goal_type: GoalType,
    goal_pace: GoalPace = None,
) -> tuple[float, float, float]:
    weight_kg = current_weight_lbs / 2.2046226218
    if goal_type == "maintain" and goal_pace in MAINTENANCE_FOCUS_MACROS:
        profile = MAINTENANCE_FOCUS_MACROS[goal_pace]
        protein_per_kg = profile["protein_per_kg"]
        fat_floor_per_kg = profile["fat_floor_per_kg"]
        fat_share = profile["fat_share"]
    else:
        protein_per_kg = PROTEIN_PER_KG[goal_type]
        fat_floor_per_kg = FAT_FLOOR_PER_KG[goal_type]
        fat_share = FAT_CALORIE_SHARE[goal_type]
    # Macro targets are whole grams.
    protein_goal = float(round(weight_kg * protein_per_kg))
    fat_floor = weight_kg * fat_floor_per_kg
    fat_from_calorie_share = (calorie_target * fat_share) / 9
    fat_goal = float(round(max(fat_floor, fat_from_calorie_share)))
    # Very low targets (possible when the calorie floor is off): protein and fat per kg can
    # exceed the calories. Then fat shrinks first, then protein, so the macros fit the target.
    if protein_goal * 4 + fat_goal * 9 > calorie_target:
        fat_goal = float(int(max(calorie_target - protein_goal * 4, 0) / 9))
        if protein_goal * 4 > calorie_target:
            protein_goal = float(int(calorie_target / 4))
    carb_calories = max(calorie_target - protein_goal * 4 - fat_goal * 9, 0)
    carbs_goal = float(int(carb_calories / 4))
    return protein_goal, carbs_goal, fat_goal


def generate_fiber_target(calorie_target: int) -> float:
    return float(round((calorie_target / 1000) * 14))
