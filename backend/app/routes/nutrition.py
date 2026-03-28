from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.dependencies import get_current_session, get_repository
from backend.app.models.auth import AuthSession
from backend.app.models.nutrition import FoodFavoriteState, FoodItem, MealInput, MealTotals, WeeklyMetrics
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.nutrition import (
    favorite_food,
    get_weekly_metrics,
    list_favorite_foods,
    meal_totals,
    unfavorite_food,
)
from backend.app.services.usda import search_standardized_foods


router = APIRouter(prefix="/nutrition", tags=["nutrition"])


def _require_session(session: AuthSession | None) -> AuthSession:
    if session is None:
        raise HTTPException(status_code=401, detail="No active session.")
    return session


@router.get("/weekly-metrics", response_model=WeeklyMetrics)
async def weekly_metrics(
    week_start: date | None = Query(default=None),
    week_end: date | None = Query(default=None),
    current_session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> WeeklyMetrics:
    user_id = current_session.user_id if current_session is not None else None
    return get_weekly_metrics(repository, user_id=user_id, week_start=week_start, week_end=week_end)


@router.get("/foods/search", response_model=list[FoodItem])
async def foods_search(
    q: str = Query(min_length=1),
    current_session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[FoodItem]:
    try:
        user_id = current_session.user_id if current_session is not None else None
        return await search_standardized_foods(q, repository, user_id=user_id)
    except Exception as exc:  # pragma: no cover - network path
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/favorites/foods", response_model=list[FoodItem])
async def read_favorite_foods(
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[FoodItem]:
    return list_favorite_foods(repository, _require_session(session).user_id)


@router.post("/favorites/foods/{food_id}", response_model=FoodFavoriteState)
async def favorite_food_route(
    food_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodFavoriteState:
    return favorite_food(repository, _require_session(session).user_id, food_id)


@router.delete("/favorites/foods/{food_id}", response_model=FoodFavoriteState)
async def unfavorite_food_route(
    food_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodFavoriteState:
    return unfavorite_food(repository, _require_session(session).user_id, food_id)


@router.post("/meals/calculate", response_model=MealTotals)
async def calculate_meal(meal: MealInput) -> MealTotals:
    return meal_totals(meal)
