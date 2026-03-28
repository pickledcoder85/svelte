from pydantic import BaseModel, Field

from backend.app.models.nutrition import IngredientInput, MacroTargets


class MealTemplateCreateRequest(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    serving_count: float = Field(gt=0)
    ingredients: list[IngredientInput] = Field(default_factory=list)


class MealTemplate(MealTemplateCreateRequest):
    favorite: bool = False
    calories: float
    macros: MacroTargets
    per_serving_calories: float
    per_serving_macros: MacroTargets
