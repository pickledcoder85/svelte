from fastapi import APIRouter, HTTPException
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import MealInput
from backend.app.repositories.memory import get_demo_repository
from backend.app.services.recipes import save_meal_template


router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/templates", response_model=MealTemplate)
async def create_meal_template(meal: MealInput) -> MealTemplate:
    repository = get_demo_repository()
    return save_meal_template(repository, meal)


@router.get("/templates", response_model=list[MealTemplate])
async def list_meal_templates() -> list[MealTemplate]:
    repository = get_demo_repository()
    return repository.list_meal_templates()


@router.get("/templates/{meal_template_id}", response_model=MealTemplate)
async def get_meal_template(meal_template_id: str) -> MealTemplate:
    repository = get_demo_repository()
    meal_template = repository.get_meal_template(meal_template_id)
    if meal_template is None:
        raise HTTPException(status_code=404, detail="Meal template not found.")
    return meal_template
