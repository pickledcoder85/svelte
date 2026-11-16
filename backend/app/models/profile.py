from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.app.services.calculations.types import GoalPace, is_valid_goal_pace

from backend.app.models.nutrition import WeeklyMetrics


class UserProfile(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    timezone: str = "UTC"
    units: str = "imperial"
    # "recommended": targets stop at 1,200 (women) / 1,500 (men); "off": opted out.
    calorie_floor: Literal["recommended", "off"] = "recommended"
    # Percent of logged workout calories added to the day's allowance (0 = off).
    workout_calories_share: Literal[0, 50, 75, 100] = 75
    # Meals a day (3-5, snacks between meals) and the daily target's split across them, in day
    # order (percent; macros follow). See services/meal_split.py.
    meals_per_day: Literal[3, 4, 5] = 3
    meal_split: list[int] = Field(default_factory=lambda: [25, 35, 40])
    user_created_at: datetime | None = None
    profile_created_at: datetime | None = None
    profile_updated_at: datetime | None = None
    setup_completed_at: datetime | None = None
    setup_complete: bool = False
    sex: Literal["male", "female"] | None = None
    age_years: int | None = None
    height_cm: float | None = None
    current_weight_lbs: float | None = None
    goal_type: Literal["lose", "maintain", "gain"] | None = None
    goal_pace: GoalPace = None
    target_weight_lbs: float | None = None
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"] | None = None
    dietary_pattern: Literal["vegan", "vegetarian", "pescatarian", "omnivore", "carnivore"] | None = None
    nutrition_style: Literal["balanced", "high_protein", "low_carb", "keto", "mediterranean", "paleo"] | None = None
    allergy_notes: str | None = None
    bmr_calories: int | None = None
    tdee_calories: int | None = None
    initial_calorie_target: int | None = None
    protein_target_g: float | None = None
    carbs_target_g: float | None = None
    fat_target_g: float | None = None
    fiber_target_g: float | None = None
    calculation_version: str | None = None
    target_source: Literal["system_default", "user_custom", "agent_adjusted", "admin_override"] | None = None


class UserOnboardingRequest(BaseModel):
    sex: Literal["male", "female"]
    age_years: int = Field(gt=0, lt=120)
    height_cm: float = Field(gt=0)
    current_weight_lbs: float = Field(gt=0)
    goal_type: Literal["lose", "maintain", "gain"]
    goal_pace: GoalPace = None
    target_weight_lbs: float | None = Field(default=None, gt=0)
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"]
    dietary_pattern: Literal["vegan", "vegetarian", "pescatarian", "omnivore", "carnivore"]
    nutrition_style: Literal["balanced", "high_protein", "low_carb", "keto", "mediterranean", "paleo"] = "balanced"
    allergy_notes: str | None = None
    calorie_floor: Literal["recommended", "off"] = "recommended"
    # The name to greet the user by; blank keeps the signed-in name.
    display_name: str | None = Field(default=None, max_length=60)
    @model_validator(mode="after")
    def _pace_matches_goal(self):
        if not is_valid_goal_pace(self.goal_type, self.goal_pace):
            raise ValueError(f"goal_pace {self.goal_pace!r} does not apply to goal_type {self.goal_type!r}.")
        return self

    # Display preferences captured during setup. Measurements above are always cm and lb.
    units: Literal["imperial", "metric"] | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("timezone")
    @classmethod
    def _known_timezone(cls, value: str | None) -> str | None:
        # The device reports this automatically; an unrecognised name must not block setup,
        # so it is dropped (the profile keeps its current timezone) instead of rejected.
        if value is None:
            return None
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            return None
        return value


class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1)
    timezone: str = Field(min_length=1)
    units: str = Field(pattern="^(imperial|metric)$")
    sex: Literal["male", "female"] | None = None
    age_years: int | None = Field(default=None, gt=0, lt=120)
    height_cm: float | None = Field(default=None, gt=0)
    current_weight_lbs: float | None = Field(default=None, gt=0)
    goal_type: Literal["lose", "maintain", "gain"] | None = None
    goal_pace: GoalPace = None
    target_weight_lbs: float | None = Field(default=None, gt=0)
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"] | None = None
    dietary_pattern: Literal["vegan", "vegetarian", "pescatarian", "omnivore", "carnivore"] | None = None
    nutrition_style: Literal["balanced", "high_protein", "low_carb", "keto", "mediterranean", "paleo"] | None = None
    allergy_notes: str | None = None
    calorie_floor: Literal["recommended", "off"] | None = None
    # A preference: changing it never recalculates targets.
    workout_calories_share: Literal[0, 50, 75, 100] | None = None
    # Preferences too: meals a day and how the target splits across them (checked on save).
    meals_per_day: Literal[3, 4, 5] | None = None
    meal_split: list[int] | None = None

    @field_validator("workout_calories_share", mode="before")
    @classmethod
    def _share_is_a_number(cls, value):
        # Pydantic would read JSON false as 0 (turning add-back off); only numbers are allowed.
        if isinstance(value, bool):
            raise ValueError("workout_calories_share must be 0, 50, 75, or 100.")
        return value

    @model_validator(mode="after")
    def _pace_matches_goal(self):
        if self.goal_type is not None and not is_valid_goal_pace(self.goal_type, self.goal_pace):
            raise ValueError(f"goal_pace {self.goal_pace!r} does not apply to goal_type {self.goal_type!r}.")
        return self

class UserGoal(BaseModel):
    id: str
    user_id: str
    effective_at: date
    calorie_goal: int
    protein_goal: float
    carbs_goal: float
    fat_goal: float
    fiber_goal: float | None = None
    goal_type: Literal["lose", "maintain", "gain"] | None = None
    goal_pace: GoalPace = None
    calculation_version: str | None = None
    target_source: Literal["system_default", "user_custom", "agent_adjusted", "admin_override"] | None = None
    target_weight_lbs: float | None = None
    created_at: datetime | None = None


class UserGoalCreateRequest(BaseModel):
    effective_at: date
    calorie_goal: int = Field(gt=0)
    protein_goal: float = Field(ge=0)
    carbs_goal: float = Field(ge=0)
    fat_goal: float = Field(ge=0)
    fiber_goal: float | None = Field(default=None, ge=0)
    target_weight_lbs: float | None = None


class WeightEntryCreateRequest(BaseModel):
    recorded_at: date
    weight_lbs: float = Field(gt=0)


class WeightEntry(BaseModel):
    id: str
    user_id: str
    recorded_at: date
    weight_lbs: float
    created_at: datetime | None = None


class ProfileProgress(BaseModel):
    user_id: str
    display_name: str | None = None
    current_weight_lbs: float | None = None
    start_weight_lbs: float | None = None
    target_weight_lbs: float | None = None
    weekly_weight_change: float
    weight_entries: int
    calorie_goal: int
    calories_consumed: int
    adherence_score: int


class WeightHistorySummary(BaseModel):
    entry_count: int
    current_weight_lbs: float | None = None
    start_weight_lbs: float | None = None
    change_from_start_lbs: float | None = None
    latest_recorded_at: date | None = None
    recent_entries: list[WeightEntry] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    progress: ProfileProgress
    weekly_metrics: WeeklyMetrics
    weight_history: WeightHistorySummary


class TargetPreviewRequest(BaseModel):
    """Body details for previewing targets during setup; nothing is saved."""

    sex: Literal["male", "female"]
    age_years: int = Field(gt=0, lt=120)
    height_cm: float = Field(gt=0, lt=300)
    current_weight_lbs: float = Field(gt=0, lt=1500)
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"]


class TargetPreviewOption(BaseModel):
    goal_type: Literal["lose", "maintain", "gain"]
    goal_pace: GoalPace = None
    # The calculation as is (what the target is with the floor off).
    calorie_target: int
    daily_adjustment: int
    weekly_change_lbs: float
    protein_target_g: float
    carbs_target_g: float
    fat_target_g: float
    # Below the recommended minimum for the user's sex, and the same pace with the floor on.
    below_recommended_minimum: bool
    floor_calorie_target: int
    floor_weekly_change_lbs: float
    floor_protein_target_g: float
    floor_carbs_target_g: float
    floor_fat_target_g: float


class TargetPreview(BaseModel):
    bmr_calories: int
    maintenance_calories: int
    recommended_minimum_calories: int
    maintenance_below_minimum: bool
    options: list[TargetPreviewOption]
    # Maintenance calories for each activity level (sedentary ... extra_active).
    maintenance_by_activity: dict[str, int]
