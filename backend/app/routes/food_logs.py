from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.food_logs import FoodLog, FoodLogCreateRequest, FoodLogEntry, FoodLogEntryCreateRequest
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.food_logs import (
    add_food_log_entry,
    create_food_log,
    get_food_log,
    list_food_log_entries,
    list_food_logs,
)


router = APIRouter(prefix="/nutrition", tags=["nutrition"])
@router.post("/logs", response_model=FoodLog)
async def create_log(
    payload: FoodLogCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodLog:
    return create_food_log(repository, session, payload)


@router.get("/logs", response_model=list[FoodLog])
async def read_logs(
    week_start: date | None = Query(default=None),
    week_end: date | None = Query(default=None),
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[FoodLog]:
    return list_food_logs(repository, session.user_id, week_start, week_end)


@router.get("/logs/{food_log_id}", response_model=FoodLog)
async def read_log(
    food_log_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodLog:
    log = get_food_log(repository, session.user_id, food_log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Food log not found.")
    return log


@router.get("/logs/{food_log_id}/entries", response_model=list[FoodLogEntry])
async def read_log_entries(
    food_log_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[FoodLogEntry]:
    entries = list_food_log_entries(repository, session.user_id, food_log_id)
    if entries is None:
        raise HTTPException(status_code=404, detail="Food log not found.")
    return entries


@router.post("/logs/{food_log_id}/entries", response_model=FoodLog)
async def create_log_entry(
    food_log_id: str,
    payload: FoodLogEntryCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> FoodLog:
    log = add_food_log_entry(repository, session.user_id, food_log_id, payload)
    if log is None:
        raise HTTPException(status_code=404, detail="Food log not found.")
    return log
