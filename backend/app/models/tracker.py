from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.models.nutrition import MacroTargets


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
    # Where it came from ("manual", "garmin") and the source's numbers as recorded. For an
    # import, calories_burned is the active calories Relish counts (source total minus Relish's
    # resting calories for the workout's minutes).
    source: str = "manual"
    source_id: str | None = None
    activity_type: str | None = None
    started_at: str | None = None
    distance_m: float | None = None
    source_calories_total: int | None = None
    source_bmr_calories: int | None = None
    relish_resting_calories: int | None = None
    weight_lbs_at_time: float | None = None
    calc_version: str | None = None


class PlannedExerciseEntryCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    duration_minutes: int = Field(gt=0)
    calories_burned: int = Field(ge=0)
    planned_on: date
    planned_at: str = Field(min_length=1)
    intensity: Literal["Low", "Moderate", "High"]


class PlannedExerciseEntryUpdateRequest(PlannedExerciseEntryCreateRequest):
    pass


class PlannedExerciseEntry(PlannedExerciseEntryCreateRequest):
    id: str
    user_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None
    completed_exercise_entry_id: str | None = None


class PlannedExerciseEntryCompletionRequest(BaseModel):
    completed_at: datetime | None = None


class PlannedWorkoutSegmentInput(BaseModel):
    segment_type: Literal["time", "distance", "activity", "reps"]
    title: str = Field(min_length=1)
    activity_type: Literal["weights", "swim", "bike", "run", "custom"] | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    distance_value: float | None = Field(default=None, gt=0)
    distance_unit: Literal["m", "km", "mi", "yd"] | None = None
    reps: int | None = Field(default=None, gt=0)
    intensity: Literal["Low", "Moderate", "High"] | None = None
    notes: str | None = None
    calories_estimate: int | None = Field(default=None, ge=0)


class PlannedWorkoutSegment(PlannedWorkoutSegmentInput):
    id: str
    block_id: str
    position: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PlannedWorkoutBlockInput(BaseModel):
    block_kind: Literal["warmup", "activity", "cooldown"]
    title: str = Field(min_length=1)
    notes: str | None = None
    segments: list[PlannedWorkoutSegmentInput] = Field(default_factory=list)


class PlannedWorkoutBlock(PlannedWorkoutBlockInput):
    id: str
    session_id: str
    position: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PlannedWorkoutSessionCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    workout_type: Literal["weights", "swim", "bike", "run", "custom"]
    planned_on: date
    planned_at: str = Field(min_length=1)
    notes: str | None = None
    estimated_calories_burned: int = Field(ge=0)
    blocks: list[PlannedWorkoutBlockInput] = Field(default_factory=list)


class PlannedWorkoutSessionUpdateRequest(PlannedWorkoutSessionCreateRequest):
    pass


class PlannedWorkoutSession(PlannedWorkoutSessionCreateRequest):
    id: str
    user_id: str
    legacy_planned_exercise_entry_id: str | None = None
    status: Literal["planned", "completed", "skipped"]
    completed_at: datetime | None = None
    completed_exercise_entry_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PlannedWorkoutSessionCompletionRequest(BaseModel):
    completed_at: datetime | None = None


class MealPlanSlotItem(BaseModel):
    name: str = Field(min_length=1)
    quantity_label: str = Field(min_length=1)
    calories: int = Field(ge=0)
    macros: MacroTargets


class MealPlanSlotCreateRequest(BaseModel):
    meal_label: str = Field(min_length=1)
    title: str = Field(min_length=1)
    calories: int = Field(ge=0)
    prep_status: Literal["Prepped", "Needs prep", "Flexible"]
    items: list[MealPlanSlotItem] = Field(default_factory=list)


class MealPlanDayCreateRequest(BaseModel):
    plan_date: date
    label: str = Field(min_length=1)
    focus: str = Field(min_length=1)
    slots: list[MealPlanSlotCreateRequest] = Field(default_factory=list)


class MealPlanSlot(MealPlanSlotCreateRequest):
    id: str
    meal_plan_day_id: str
    position: int
    eaten_at: datetime | None = None


class MealPlanSlotEatenAtUpdateRequest(BaseModel):
    eaten_at: datetime | None = None


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
