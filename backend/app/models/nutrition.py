from typing import Literal

from pydantic import BaseModel, Field


class MacroTargets(BaseModel):
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)


class FoodItem(BaseModel):
    id: str
    name: str
    brand: str | None = None
    calories: float = Field(ge=0)
    serving_size: float = Field(ge=0)
    serving_unit: str
    macros: MacroTargets
    source: Literal["USDA", "LABEL_SCAN", "CUSTOM"]


class IngredientInput(BaseModel):
    id: str
    food_id: str
    name: str
    grams: float = Field(gt=0)
    calories_per_100g: float = Field(ge=0)
    macros_per_100g: MacroTargets


class MealInput(BaseModel):
    id: str
    name: str
    serving_count: float = Field(gt=0)
    ingredients: list[IngredientInput]


class MealTotals(BaseModel):
    calories: float
    macros: MacroTargets
    per_serving_calories: float
    per_serving_macros: MacroTargets


class WeeklyMetrics(BaseModel):
    calorie_goal: int
    calories_consumed: int
    macro_targets: MacroTargets
    macro_consumed: MacroTargets
    weekly_weight_change: float
    adherence_score: int = Field(ge=0, le=100)


class VisionNutritionExtraction(BaseModel):
    label_text: str
    product_name: str
    brand_name: str | None = None
    serving_size: str
    calories: float
    macros: MacroTargets
    confidence: float = Field(ge=0, le=1)
