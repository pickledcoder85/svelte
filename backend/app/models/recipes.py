from typing import Literal

from pydantic import BaseModel, Field

from backend.app.models.nutrition import IngredientInput


class RecipeAsset(BaseModel):
    kind: Literal["text", "pdf", "image"]
    url: str | None = None
    content: str | None = None


class RecipeImportRequest(BaseModel):
    title: str = Field(min_length=1)
    steps: list[str] = Field(default_factory=list)
    assets: list[RecipeAsset] = Field(default_factory=list)


class RecipeDefinition(RecipeImportRequest):
    id: str
    ingredients: list[IngredientInput] = Field(default_factory=list)
    default_yield: float = Field(gt=0)
    favorite: bool = False


class FavoriteRecipeRequest(BaseModel):
    favorite: bool = True
