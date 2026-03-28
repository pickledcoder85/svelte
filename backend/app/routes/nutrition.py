from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.dependencies import get_repository
from backend.app.models.nutrition import FoodItem, MealInput, MealTotals, WeeklyMetrics
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.nutrition import get_weekly_metrics, meal_totals
from backend.app.services.usda import search_standardized_foods


router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/weekly-metrics", response_model=WeeklyMetrics)
async def weekly_metrics(repository: SQLiteRepository = Depends(get_repository)) -> WeeklyMetrics:
    return get_weekly_metrics(repository)


@router.get("/foods/search", response_model=list[FoodItem])
async def foods_search(
    q: str = Query(min_length=1), repository: SQLiteRepository = Depends(get_repository)
) -> list[FoodItem]:
    try:
        return await search_standardized_foods(q, repository)
    except Exception as exc:  # pragma: no cover - network path
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/meals/calculate", response_model=MealTotals)
async def calculate_meal(meal: MealInput) -> MealTotals:
    return meal_totals(meal)
