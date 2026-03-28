from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_repository
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import MealInput
from backend.app.repositories.sqlite import SQLiteRepository
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


@router.get("/templates/{meal_template_id}", response_model=MealTemplate)
async def read_meal_template(
    meal_template_id: str, repository: SQLiteRepository = Depends(get_repository)
) -> MealTemplate:
    meal_template = get_meal_template(repository, meal_template_id)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template
