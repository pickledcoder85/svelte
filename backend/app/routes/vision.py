from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.models.nutrition import VisionNutritionExtraction
from backend.app.services.vision import analyze_label_image


class VisionRequest(BaseModel):
    image_base64: str = Field(min_length=1)


router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/label", response_model=VisionNutritionExtraction)
async def analyze_label(payload: VisionRequest) -> VisionNutritionExtraction:
    try:
        return await analyze_label_image(payload.image_base64)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
