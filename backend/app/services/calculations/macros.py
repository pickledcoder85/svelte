from typing import Literal


GoalType = Literal["lose", "maintain", "gain"]

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


def generate_macro_targets(
    *,
    calorie_target: int,
    current_weight_lbs: float,
    goal_type: GoalType,
) -> tuple[float, float, float]:
    weight_kg = current_weight_lbs / 2.2046226218
    protein_goal = round(weight_kg * PROTEIN_PER_KG[goal_type], 1)
    fat_floor = weight_kg * FAT_FLOOR_PER_KG[goal_type]
    fat_from_calorie_share = (calorie_target * FAT_CALORIE_SHARE[goal_type]) / 9
    fat_goal = round(max(fat_floor, fat_from_calorie_share), 1)
    carb_calories = max(calorie_target - protein_goal * 4 - fat_goal * 9, 0)
    carbs_goal = round(carb_calories / 4, 1)
    return protein_goal, carbs_goal, fat_goal
