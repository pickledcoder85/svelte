from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.nutrition import (
    VisionLabelScanResult,
    VisionNutritionExtraction,
    VisionPackageScanResult,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.ingestion import create_scan_output
from backend.app.services.vision import analyze_label_image, analyze_package_image


class VisionRequest(BaseModel):
    image_base64: str = Field(min_length=1)


router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/label", response_model=VisionNutritionExtraction)
async def analyze_label(payload: VisionRequest) -> VisionNutritionExtraction:
    try:
        return await analyze_label_image(payload.image_base64)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/package", response_model=VisionPackageScanResult)
async def analyze_package(
    payload: VisionRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> VisionPackageScanResult:
    try:
        extraction = await analyze_package_image(payload.image_base64, repository)
        output = create_scan_output(
            repository,
            session.user_id,
            source_kind="camera_package",
            source_name="package-scan",
            extracted_text=extraction.package_text,
            structured_json=extraction.model_dump(),
            confidence=extraction.confidence,
        )
        return VisionPackageScanResult(
            ingestion_job_id=output.ingestion_job_id,
            output_id=output.id,
            source_kind="camera_package",
            source_name="package-scan",
            confidence=output.confidence,
            extraction=extraction,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/label/ingest", response_model=VisionLabelScanResult)
async def ingest_label(
    payload: VisionRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> VisionLabelScanResult:
    try:
        extraction = await analyze_label_image(payload.image_base64)
        output = create_scan_output(
            repository,
            session.user_id,
            source_kind="camera_label",
            source_name="nutrition-label-scan",
            extracted_text=extraction.label_text,
            structured_json=extraction.model_dump(),
            confidence=extraction.confidence,
        )
        return VisionLabelScanResult(
            ingestion_job_id=output.ingestion_job_id,
            output_id=output.id,
            source_kind="camera_label",
            source_name="nutrition-label-scan",
            confidence=output.confidence,
            extraction=extraction,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
