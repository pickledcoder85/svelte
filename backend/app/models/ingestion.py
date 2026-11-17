from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.app.models.nutrition import FoodItem


class IngestionOutputEditRequest(BaseModel):
    extracted_text: str | None = None
    structured_json: Any | None = None


class IngestionOutput(BaseModel):
    id: str
    ingestion_job_id: str
    extracted_text: str | None = None
    structured_json: Any | None = None
    confidence: float = Field(ge=0, le=1)
    reviewed_at: datetime | None = None
    accepted_at: datetime | None = None
    rejected_at: datetime | None = None
    created_at: datetime
    review_state: Literal["pending", "reviewed", "accepted", "rejected"]


class BarcodeLookupRequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class BarcodeFoodResult(BaseModel):
    """Quick add: a scanned barcode turned straight into a food in the user's bank, ready to
    log (a product with several variants gives several foods). Not found: photograph the label."""

    barcode: str
    found: bool
    source: Literal["food_bank", "open_food_facts", "usda"] | None = None
    foods: list[FoodItem] = Field(default_factory=list)
    message: str | None = None


class BarcodeLookupResult(BaseModel):
    """food_bank: the food is already saved (log it directly). open_food_facts/usda: a pending
    scan to review and save, like a label scan. Not found: fall back to photographing the label."""

    barcode: str
    found: bool
    source: Literal["food_bank", "open_food_facts", "usda"] | None = None
    food: FoodItem | None = None
    output: IngestionOutput | None = None
    message: str | None = None
