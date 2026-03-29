from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.models.nutrition import WeeklyMetrics


class UserProfile(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    timezone: str = "UTC"
    units: str = "imperial"
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
    target_weight_lbs: float | None = None
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"] | None = None
    bmr_calories: int | None = None
    tdee_calories: int | None = None
    initial_calorie_target: int | None = None


class UserOnboardingRequest(BaseModel):
    sex: Literal["male", "female"]
    age_years: int = Field(gt=0, lt=120)
    height_cm: float = Field(gt=0)
    current_weight_lbs: float = Field(gt=0)
    goal_type: Literal["lose", "maintain", "gain"]
    target_weight_lbs: float = Field(gt=0)
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"]


class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1)
    timezone: str = Field(min_length=1)
    units: str = Field(pattern="^(imperial|metric)$")
    sex: Literal["male", "female"] | None = None
    age_years: int | None = Field(default=None, gt=0, lt=120)
    height_cm: float | None = Field(default=None, gt=0)
    current_weight_lbs: float | None = Field(default=None, gt=0)
    goal_type: Literal["lose", "maintain", "gain"] | None = None
    target_weight_lbs: float | None = Field(default=None, gt=0)
    activity_level: Literal["sedentary", "light", "moderate", "very_active", "extra_active"] | None = None


class UserGoal(BaseModel):
    id: str
    user_id: str
    effective_at: date
    calorie_goal: int
    protein_goal: float
    carbs_goal: float
    fat_goal: float
    target_weight_lbs: float | None = None
    created_at: datetime | None = None


class UserGoalCreateRequest(BaseModel):
    effective_at: date
    calorie_goal: int = Field(gt=0)
    protein_goal: float = Field(ge=0)
    carbs_goal: float = Field(ge=0)
    fat_goal: float = Field(ge=0)
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
