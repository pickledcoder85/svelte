import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_required_session, get_repository
from backend.app.models.nutrition import (
    VisionLabelScanResult,
    VisionNutritionExtraction,
    VisionPackageScanResult,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.ingestion import create_scan_output
from backend.app.services.package_match import find_package_matches, package_structured_json
from backend.app.services.vision import (
    VisionImageError,
    VisionNotConfiguredError,
    analyze_label_image,
    analyze_package_image,
)

# Hard ceiling on the request field; the configurable per-image limit is checked in the
# vision service before any decoding.
MAX_IMAGE_FIELD_CHARS = 16_000_000
SCAN_FAILED_MESSAGE = "The scan could not be read right now. Try again in a moment."


class VisionRequest(BaseModel):
    image_base64: str = Field(min_length=1, max_length=MAX_IMAGE_FIELD_CHARS)


router = APIRouter(prefix="/vision", tags=["vision"])
logger = logging.getLogger(__name__)


def _scan_http_error(exc: Exception, action: str) -> HTTPException:
    """Map scan failures to user-facing errors; details stay in the server log."""
    if isinstance(exc, VisionImageError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, VisionNotConfiguredError):
        return HTTPException(status_code=503, detail=str(exc))
    logger.exception("%s failed", action)
    return HTTPException(status_code=502, detail=SCAN_FAILED_MESSAGE)


@router.post("/label", response_model=VisionNutritionExtraction)
async def analyze_label(
    payload: VisionRequest,
    settings: Settings = Depends(get_app_settings),
) -> VisionNutritionExtraction:
    try:
        return await analyze_label_image(payload.image_base64, settings)
    except Exception as exc:
        raise _scan_http_error(exc, "Vision label analysis") from exc


@router.post("/package", response_model=VisionPackageScanResult)
async def analyze_package(
    payload: VisionRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> VisionPackageScanResult:
    try:
        extraction = await analyze_package_image(payload.image_base64, repository, settings)
        # Look the product up by name for its nutrition (real scans only: the development demo
        # result is made up, so there is nothing real to search for).
        matches = []
        if settings.openai_api_key:
            try:
                matches = await find_package_matches(
                    repository, extraction.product_name, extraction.brand_name, usda_api_key=settings.usda_api_key
                )
            except Exception:  # matching is optional: never lose a scan that already succeeded
                logger.warning("Package match lookup failed", exc_info=False)
        output = create_scan_output(
            repository,
            session.user_id,
            source_kind="camera_package",
            source_name="package-scan",
            extracted_text=extraction.package_text,
            structured_json=package_structured_json(extraction.model_dump(), matches),
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
        raise _scan_http_error(exc, "Vision package scan") from exc


@router.post("/label/ingest", response_model=VisionLabelScanResult)
async def ingest_label(
    payload: VisionRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> VisionLabelScanResult:
    try:
        extraction = await analyze_label_image(payload.image_base64, settings)
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
        raise _scan_http_error(exc, "Vision label ingest") from exc
