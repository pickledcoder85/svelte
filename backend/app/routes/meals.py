from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_repository
from backend.app.models.meals import FavoriteMealTemplateRequest, MealTemplate
from backend.app.models.nutrition import MealInput
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.favorites import list_favorite_meal_templates, set_meal_template_favorite
from backend.app.services.meals import get_meal_template, list_meal_templates, save_meal_template


router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/templates", response_model=MealTemplate)
async def create_meal_template(
    meal: MealInput, repository: SQLiteRepository = Depends(get_repository)
) -> MealTemplate:
    return save_meal_template(repository, meal)


@router.get("/templates", response_model=list[MealTemplate])
async def read_meal_templates(
    repository: SQLiteRepository = Depends(get_repository),
) -> list[MealTemplate]:
    return list_meal_templates(repository)


@router.get("/favorites", response_model=list[MealTemplate])
async def read_favorite_meal_templates(
    repository: SQLiteRepository = Depends(get_repository),
) -> list[MealTemplate]:
    return list_favorite_meal_templates(repository)


@router.get("/templates/{meal_template_id}", response_model=MealTemplate)
async def read_meal_template(
    meal_template_id: str, repository: SQLiteRepository = Depends(get_repository)
) -> MealTemplate:
    meal_template = get_meal_template(repository, meal_template_id)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template


@router.put("/templates/{meal_template_id}/favorite", response_model=MealTemplate)
async def update_meal_template_favorite(
    meal_template_id: str,
    payload: FavoriteMealTemplateRequest,
    repository: SQLiteRepository = Depends(get_repository),
) -> MealTemplate:
    meal_template = set_meal_template_favorite(repository, meal_template_id, payload)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template
