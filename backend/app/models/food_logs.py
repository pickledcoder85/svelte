from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class FoodLogCreateRequest(BaseModel):
    log_date: date
    notes: str | None = None


class FoodLogEntryCreateRequest(BaseModel):
    entry_type: Literal["food", "meal"] = "food"
    food_item_id: str | None = None
    meal_template_id: str | None = None
    grams: float = Field(ge=0)
    servings: float = Field(gt=0)
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)


class FoodLogEntry(BaseModel):
    id: str
    food_log_id: str
    entry_type: Literal["food", "meal"]
    food_item_id: str | None = None
    meal_template_id: str | None = None
    display_name: str | None = None
    brand: str | None = None
    source: Literal["USDA", "LABEL_SCAN", "CUSTOM"] | None = None
    grams: float
    servings: float
    calories: float
    protein: float
    carbs: float
    fat: float
    created_at: datetime


class FoodLog(BaseModel):
    id: str
    user_id: str
    log_date: date
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    entries: list[FoodLogEntry] = Field(default_factory=list)
