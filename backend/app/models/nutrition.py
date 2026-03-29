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
    favorite: bool = False


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


class FoodFavoriteState(BaseModel):
    food_id: str
    favorite: bool


class VisionNutritionExtraction(BaseModel):
    label_text: str
    product_name: str
    brand_name: str | None = None
    serving_size: str
    calories: float
    macros: MacroTargets
    confidence: float = Field(ge=0, le=1)


class VisionFoodMatchCandidate(BaseModel):
    food_id: str
    name: str
    brand: str | None = None
    source: Literal["USDA", "LABEL_SCAN", "CUSTOM"]
    confidence: float = Field(ge=0, le=1)


class VisionPackageExtraction(BaseModel):
    package_text: str
    product_name: str
    brand_name: str | None = None
    confidence: float = Field(ge=0, le=1)
    match_candidates: list[VisionFoodMatchCandidate] = Field(default_factory=list)


class VisionIngestionResult(BaseModel):
    ingestion_job_id: str
    output_id: str
    source_kind: str
    source_name: str
    confidence: float = Field(ge=0, le=1)


class VisionPackageScanResult(VisionIngestionResult):
    extraction: VisionPackageExtraction


class VisionLabelScanResult(VisionIngestionResult):
    extraction: VisionNutritionExtraction
