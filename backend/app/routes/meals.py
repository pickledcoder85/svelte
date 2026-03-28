from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import MealInput
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.favorites import favorite_meal_template, list_favorite_meal_templates, unfavorite_meal_template
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
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[MealTemplate]:
    return list_favorite_meal_templates(repository, session.user_id)


@router.get("/templates/{meal_template_id}", response_model=MealTemplate)
async def read_meal_template(
    meal_template_id: str, repository: SQLiteRepository = Depends(get_repository)
) -> MealTemplate:
    meal_template = get_meal_template(repository, meal_template_id)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template


@router.post("/templates/{meal_template_id}/favorite", response_model=MealTemplate)
async def favorite_meal_template_route(
    meal_template_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> MealTemplate:
    meal_template = favorite_meal_template(repository, session.user_id, meal_template_id)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template


@router.delete("/templates/{meal_template_id}/favorite", response_model=MealTemplate)
async def unfavorite_meal_template_route(
    meal_template_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> MealTemplate:
    meal_template = unfavorite_meal_template(repository, session.user_id, meal_template_id)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template
