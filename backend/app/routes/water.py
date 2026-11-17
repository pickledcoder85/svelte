"""Water: each drink logged (a glass is 250 ml in the app), and the day's totals."""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.dependencies import get_repository, get_required_session
from backend.app.repositories.sqlite import SQLiteRepository

router = APIRouter(prefix="/water", tags=["water"])
MAX_RANGE_DAYS = 400


class WaterEntryCreate(BaseModel):
    logged_on: date
    amount_ml: int = Field(gt=0, le=3000)


class WaterEntry(BaseModel):
    id: str
    logged_on: date
    amount_ml: int
    created_at: datetime


@router.get("", response_model=list[WaterEntry])
async def read_water(
    start: date = Query(...),
    end: date = Query(...),
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[WaterEntry]:
    if end < start or (end - start).days > MAX_RANGE_DAYS:
        raise HTTPException(status_code=400, detail=f"Ask for at most {MAX_RANGE_DAYS} days, start before end.")
    return [WaterEntry.model_validate(row) for row in repository.list_water_entries(session.user_id, start, end)]


@router.post("", response_model=WaterEntry)
async def add_water(
    payload: WaterEntryCreate,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> WaterEntry:
    return WaterEntry.model_validate(repository.add_water_entry(user_id=session.user_id, logged_on=payload.logged_on, amount_ml=payload.amount_ml))


@router.delete("/{entry_id}", status_code=204)
async def remove_water(
    entry_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> None:
    if not repository.delete_water_entry(user_id=session.user_id, entry_id=entry_id):
        raise HTTPException(status_code=404, detail="That drink isn't logged.")
