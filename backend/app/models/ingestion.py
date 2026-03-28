from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IngestionOutputReviewRequest(BaseModel):
    review_state: Literal["reviewed", "accepted", "rejected"]


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
