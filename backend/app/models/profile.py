from datetime import date, datetime

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


class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1)
    timezone: str = Field(min_length=1)
    units: str = Field(pattern="^(imperial|metric)$")


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
