from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_current_session, get_required_session, get_repository
from backend.app.integrations.barcodes import InvalidBarcodeError
from backend.app.models.ingestion import BarcodeFoodResult, BarcodeLookupRequest, BarcodeLookupResult
from backend.app.services.barcodes import food_for_barcode, lookup_barcode
from backend.app.models.food_logs import FoodLog
from backend.app.services.food_bank import (
    FoodBankError,
    LogFoodRequest,
    QuickCaloriesRequest,
    ServingWeightRequest,
    add_food_to_bank,
    list_bank_for_user,
    log_food,
    log_quick_calories,
    search_foods_for_user,
    set_food_serving_weight,
)
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
        if current_session is not None:
            # Signed in: the user's bank first, then other saved foods, then USDA.
            return await search_foods_for_user(repository, current_session.user_id, q)
        return await search_standardized_foods(q, repository, user_id=None)
    except Exception as exc:  # pragma: no cover - network path
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/bank", response_model=list[FoodItem])
async def read_food_bank(
    q: str = Query(default="", max_length=100),
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[FoodItem]:
    """The foods the user has scanned, saved, or logged, most recently used first."""
    return list_bank_for_user(repository, session.user_id, q)


@router.post("/bank/{food_id}", response_model=FoodItem)
async def add_to_bank(
    food_id: str,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodItem:
    food = add_food_to_bank(repository, session.user_id, food_id)
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found.")
    return food


@router.delete("/bank/{food_id}", status_code=204)
async def remove_from_bank(
    food_id: str,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> None:
    if not repository.remove_from_food_bank(user_id=session.user_id, food_id=food_id):
        raise HTTPException(status_code=404, detail="That food isn't in your food bank.")


@router.put("/foods/{food_id}/serving-weight", response_model=FoodItem)
async def put_serving_weight(
    food_id: str,
    payload: ServingWeightRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodItem:
    """Record how much one serving weighs, e.g. after weighing a packet."""
    try:
        food = set_food_serving_weight(repository, session.user_id, food_id, payload)
    except FoodBankError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found.")
    return food


@router.post("/log-food", response_model=FoodLog)
async def post_log_food(
    payload: LogFoodRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodLog:
    """Log a food by servings or by weight; the server works out calories and macros."""
    try:
        log = log_food(repository, session.user_id, payload)
    except FoodBankError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if log is None:
        raise HTTPException(status_code=404, detail="Food not found.")
    return log


@router.post("/quick-calories", response_model=FoodLog)
async def post_quick_calories(
    payload: QuickCaloriesRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodLog:
    """Log a number of calories (and optional macros) without looking a food up."""
    repository.ensure_user_identity(user_id=session.user_id, email=session.email, display_name=session.display_name)
    return log_quick_calories(repository, session.user_id, payload)


@router.get("/favorites/foods", response_model=list[FoodItem])
async def read_favorite_foods(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[FoodItem]:
    return list_favorite_foods(repository, session.user_id)


@router.post("/favorites/foods/{food_id}", response_model=FoodFavoriteState)
async def favorite_food_route(
    food_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodFavoriteState:
    return favorite_food(repository, session.user_id, food_id)


@router.delete("/favorites/foods/{food_id}", response_model=FoodFavoriteState)
async def unfavorite_food_route(
    food_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodFavoriteState:
    return unfavorite_food(repository, session.user_id, food_id)


@router.post("/meals/calculate", response_model=MealTotals)
async def calculate_meal(meal: MealInput) -> MealTotals:
    return meal_totals(meal)


@router.post("/barcode-lookups", response_model=BarcodeLookupResult)
async def barcode_lookup(
    payload: BarcodeLookupRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> BarcodeLookupResult:
    try:
        return await lookup_barcode(repository, session.user_id, payload.code, usda_api_key=settings.usda_api_key)
    except InvalidBarcodeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/barcode-foods", response_model=BarcodeFoodResult)
async def barcode_food(
    payload: BarcodeLookupRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> BarcodeFoodResult:
    """Quick add: scan a barcode and get a food to log, saved to the food bank."""
    repository.ensure_user_identity(user_id=session.user_id, email=session.email, display_name=session.display_name)
    try:
        return await food_for_barcode(repository, session.user_id, payload.code, usda_api_key=settings.usda_api_key)
    except InvalidBarcodeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
