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


def fat_share_for(goal_type: str | None, goal_pace: str | None = None) -> float:
    """The share of calories that fat gets for a goal (the same table setup uses)."""
    if goal_type == "maintain" and goal_pace in MAINTENANCE_FOCUS_MACROS:
        return MAINTENANCE_FOCUS_MACROS[goal_pace]["fat_share"]
    return FAT_CALORIE_SHARE.get(goal_type or "", FAT_CALORIE_SHARE["lose"])


def macros_for_allowance(
    *,
    base_calories: float,
    protein: float,
    carbs: float,
    fat: float,
    allowance: float,
    fat_share: float,
) -> tuple[float, float, float]:
    """A workout day's macro targets: the same split as setup, at the day's allowance.

    Protein comes from body weight, so it stays. Fat gets its share of the bigger number (never
    less than the day's base fat, which already covers the per-kg floor), but grows by no more
    than its share of the extra calories (so a custom goal with less fat doesn't jump on a short
    walk, and the macros never add up to more than the allowance). Carbs get the rest. Days
    without workout calories keep the base targets."""
    extra = allowance - base_calories
    if extra <= 0 or base_calories <= 0:
        return protein, carbs, fat
    grown_fat = max(fat, min(allowance * fat_share / 9, fat + extra * fat_share / 9))
    grown_carbs = carbs + max(0.0, extra - (grown_fat - fat) * 9) / 4
    return protein, float(round(grown_carbs)), float(round(grown_fat))
