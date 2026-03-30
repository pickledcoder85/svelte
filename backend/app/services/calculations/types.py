from typing import Literal

from pydantic import BaseModel


GoalType = Literal["lose", "maintain", "gain"]
GoalPace = Literal["light", "recommended", "extreme", "lean", "aggressive"] | None
DietaryPattern = Literal["vegan", "vegetarian", "pescatarian", "omnivore", "carnivore"]
NutritionStyle = Literal["balanced", "keto", "mediterranean"]
TargetSource = Literal["system_default", "user_custom", "agent_adjusted", "admin_override"]

CALCULATION_VERSION = "v1"


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
