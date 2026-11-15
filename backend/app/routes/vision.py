import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_required_session, get_repository
from backend.app.models.nutrition import (
    SmartScanResult,
    VisionLabelScanResult,
    VisionNutritionExtraction,
    VisionPackageScanResult,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.ingestion import create_scan_output, get_output, transition_output
from backend.app.services.package_match import find_package_matches, package_structured_json
from backend.app.services.vision import (
    VisionImageError,
    VisionNotConfiguredError,
    analyze_label_image,
    analyze_package_image,
    analyze_scan_image,
)

# Hard ceiling on the request field; the configurable per-image limit is checked in the
# vision service before any decoding.
MAX_IMAGE_FIELD_CHARS = 16_000_000
SCAN_FAILED_MESSAGE = "The scan could not be read right now. Try again in a moment."
LABEL_EXPECTED_MESSAGE = "That looks like the front of the package. Point at the Nutrition Facts panel instead."


class VisionRequest(BaseModel):
    image_base64: str = Field(min_length=1, max_length=MAX_IMAGE_FIELD_CHARS)


class SmartScanRequest(VisionRequest):
    # A package scan whose matched nutrition this capture replaces if it reads a label.
    replace_output_id: str | None = Field(default=None, max_length=128)


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
        matches = await _package_matches(repository, settings, extraction)
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


async def _package_matches(repository: SQLiteRepository, settings: Settings, extraction) -> list:
    """Look the product up by name for its nutrition (real scans only: the development demo
    result is made up). Best-effort: a lookup problem never loses the scan."""
    if not settings.openai_api_key:
        return []
    try:
        return await find_package_matches(
            repository, extraction.product_name, extraction.brand_name, usda_api_key=settings.usda_api_key
        )
    except Exception:
        logger.warning("Package match lookup failed", exc_info=False)
        return []


def _keep_package_identity(repository: SQLiteRepository, user_id: str, output_id: str, label):
    """The package front names the product best; the label gives the numbers. Keep the name and
    brand read off the front when a label replaces a package scan."""
    try:
        package = get_output(repository, user_id, output_id)
    except Exception:
        return label
    front = package.structured_json if isinstance(package.structured_json, dict) else {}
    name = front.get("read_product_name") or front.get("product_name")
    brand = front.get("read_brand_name") or front.get("brand_name")
    updates = {}
    if isinstance(name, str) and name.strip():
        updates["product_name"] = name.strip()
    if isinstance(brand, str) and brand.strip():
        updates["brand_name"] = brand.strip()
    return label.model_copy(update=updates) if updates else label


@router.post("/scan", response_model=SmartScanResult)
async def smart_scan(
    payload: SmartScanRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> SmartScanResult:
    """The auto-capture scanner: one AI read that works out whether the frame is a nutrition
    label or a package front, then saves it for review like the separate scans."""
    try:
        kind, extraction, message = await analyze_scan_image(payload.image_base64, repository, settings)
        if kind == "unreadable" or extraction is None:
            return SmartScanResult(kind="unreadable", message=message)
        if kind == "nutrition_label":
            if payload.replace_output_id:
                extraction = _keep_package_identity(repository, session.user_id, payload.replace_output_id, extraction)
            output = create_scan_output(
                repository,
                session.user_id,
                source_kind="camera_label",
                source_name="nutrition-label-scan",
                extracted_text=extraction.label_text,
                structured_json=extraction.model_dump(),
                confidence=extraction.confidence,
            )
            replaced = False
            if payload.replace_output_id:
                try:
                    transition_output(repository, session.user_id, payload.replace_output_id, "rejected")
                    replaced = True
                except Exception:  # someone else's, already saved, or gone: leave it
                    replaced = False
            return SmartScanResult(
                kind=kind,
                ingestion_job_id=output.ingestion_job_id,
                output_id=output.id,
                label=extraction,
                replaced=replaced,
            )
        if payload.replace_output_id:
            # Scanning the label for a matched package: a second package front would only add a
            # duplicate, so ask for the label instead.
            return SmartScanResult(kind="unreadable", message=LABEL_EXPECTED_MESSAGE)
        matches = await _package_matches(repository, settings, extraction)
        output = create_scan_output(
            repository,
            session.user_id,
            source_kind="camera_package",
            source_name="package-scan",
            extracted_text=extraction.package_text,
            structured_json=package_structured_json(extraction.model_dump(), matches),
            confidence=extraction.confidence,
        )
        return SmartScanResult(
            kind=kind, ingestion_job_id=output.ingestion_job_id, output_id=output.id, package=extraction
        )
    except Exception as exc:
        raise _scan_http_error(exc, "Smart scan") from exc


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
