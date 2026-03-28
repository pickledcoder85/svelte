from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class ExerciseEntryCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    duration_minutes: int = Field(gt=0)
    calories_burned: int = Field(ge=0)
    logged_on: date
    logged_at: str = Field(min_length=1)
    intensity: Literal["Low", "Moderate", "High"]


class ExerciseEntry(ExerciseEntryCreateRequest):
    id: str
    user_id: str
    created_at: datetime | None = None


class MealPlanSlotCreateRequest(BaseModel):
    meal_label: str = Field(min_length=1)
    title: str = Field(min_length=1)
    calories: int = Field(ge=0)
    prep_status: Literal["Prepped", "Needs prep", "Flexible"]


class MealPlanDayCreateRequest(BaseModel):
    plan_date: date
    label: str = Field(min_length=1)
    focus: str = Field(min_length=1)
    slots: list[MealPlanSlotCreateRequest] = Field(default_factory=list)


class MealPlanSlot(MealPlanSlotCreateRequest):
    id: str
    meal_plan_day_id: str
    position: int


class MealPlanDay(MealPlanDayCreateRequest):
    id: str
    user_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    slots: list[MealPlanSlot] = Field(default_factory=list)


class MealPrepTaskCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    category: Literal["Protein", "Carb", "Produce", "Assembly"]
    portions: str = Field(min_length=1)
    status: Literal["Queued", "In progress", "Done"] = "Queued"
    scheduled_for: date | None = None


class MealPrepTaskStatusUpdateRequest(BaseModel):
    status: Literal["Queued", "In progress", "Done"]


class MealPrepTask(MealPrepTaskCreateRequest):
    id: str
    user_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
