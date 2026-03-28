from fastapi import APIRouter, HTTPException, Query

from backend.app.models.nutrition import FoodItem, MealInput, MealTotals, WeeklyMetrics
from backend.app.services.nutrition import meal_totals
from backend.app.services.usda import search_foods


router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/weekly-metrics", response_model=WeeklyMetrics)
async def get_weekly_metrics() -> WeeklyMetrics:
    return WeeklyMetrics(
        calorie_goal=14800,
        calories_consumed=10360,
        macro_targets={"protein": 980, "carbs": 1260, "fat": 420},
        macro_consumed={"protein": 742, "carbs": 901, "fat": 308},
        weekly_weight_change=-1.2,
        adherence_score=87,
    )


@router.get("/foods/search", response_model=list[FoodItem])
async def foods_search(q: str = Query(min_length=1)) -> list[FoodItem]:
    try:
        return await search_foods(q)
    except Exception as exc:  # pragma: no cover - network path
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/meals/calculate", response_model=MealTotals)
async def calculate_meal(meal: MealInput) -> MealTotals:
    return meal_totals(meal)
