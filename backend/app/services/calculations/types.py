from typing import Literal

from pydantic import BaseModel


GoalType = Literal["lose", "maintain", "gain"]
# For lose/gain this is the pace; for maintain it is the focus (same stored field).
PaceOrFocus = Literal[
    "light", "recommended", "extreme", "lean", "aggressive", "steady", "build_muscle", "fuel_training"
]
GoalPace = PaceOrFocus | None

GOAL_PACES: dict[str, tuple[str, ...]] = {
    "lose": ("light", "recommended", "extreme"),
    "maintain": ("steady", "build_muscle", "fuel_training"),
    "gain": ("lean", "aggressive"),
}
DEFAULT_GOAL_PACE: dict[str, str] = {"lose": "recommended", "maintain": "steady", "gain": "lean"}


def is_valid_goal_pace(goal_type: str, goal_pace: str | None) -> bool:
    """A pace/focus must belong to its goal; None means the goal's default."""
    return goal_pace is None or goal_pace in GOAL_PACES.get(goal_type, ())
DietaryPattern = Literal["vegan", "vegetarian", "pescatarian", "omnivore", "carnivore"]
NutritionStyle = Literal["balanced", "high_protein", "low_carb", "keto", "mediterranean", "paleo"]
TargetSource = Literal["system_default", "user_custom", "agent_adjusted", "admin_override"]

# v2: sex-based recommended minimum (1,200 / 1,500) that users can opt out of.
# v3: BMR, maintenance, and targets rounded to the nearest 10 kcal; macro targets in whole grams.
CALCULATION_VERSION = "v3"


class GeneratedNutritionTargets(BaseModel):
    bmr_calories: int
    maintenance_calories: int
    calorie_target: int
    protein_target_g: float
    carbs_target_g: float
    fat_target_g: float
    fiber_target_g: float
    goal_type: GoalType
    goal_pace: GoalPace = None
    calculation_version: str = CALCULATION_VERSION
    target_source: TargetSource = "system_default"
