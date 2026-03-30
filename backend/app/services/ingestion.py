from __future__ import annotations

import json
from typing import Any, Literal
from uuid import uuid4

from backend.app.config import get_settings
from backend.app.integrations.usda import UsdaSearchError, search_usda_foods
from backend.app.models.ingestion import IngestionOutput
from backend.app.models.nutrition import (
    FoodItem,
    MacroTargets,
    SavedFoodsResult,
    VisionNutritionExtraction,
    VisionNutritionVariant,
    VisionPackageExtraction,
)
from backend.app.repositories.sqlite import SQLiteRepository


class IngestionNotFoundError(ValueError):
    pass


class IngestionAccessError(PermissionError):
    pass


class IngestionStateError(ValueError):
    pass


class IngestionSaveError(ValueError):
    pass


def _normalize_output(payload: dict[str, Any]) -> IngestionOutput:
    structured_json = payload.get("structured_json")
    if isinstance(structured_json, str):
        try:
            structured_json = json.loads(structured_json)
        except json.JSONDecodeError:
            pass
    return IngestionOutput.model_validate({**payload, "structured_json": structured_json})


def _coerce_structured_json(payload: Any) -> Any:
    if isinstance(payload, str):
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return payload
    return payload


def _assert_job_access(repository: SQLiteRepository, user_id: str, ingestion_job_id: str) -> dict[str, Any]:
    job = repository.get_ingestion_job(ingestion_job_id)
    if job is None:
        raise IngestionNotFoundError("Ingestion job not found.")
    if job["user_id"] != user_id:
        raise IngestionAccessError("Ingestion job is not owned by the active user.")
    return job


def _assert_output_access(repository: SQLiteRepository, user_id: str, output_id: str) -> dict[str, Any]:
    output = repository.get_ingestion_output(output_id)
    if output is None:
        raise IngestionNotFoundError("Ingestion output not found.")
    _assert_job_access(repository, user_id, output["ingestion_job_id"])
    return output


def list_review_queue(
    repository: SQLiteRepository,
    user_id: str,
    ingestion_job_id: str | None = None,
) -> list[IngestionOutput]:
    if ingestion_job_id is not None:
        _assert_job_access(repository, user_id, ingestion_job_id)
        outputs = repository.list_pending_ingestion_outputs(ingestion_job_id)
    else:
        outputs = []
        for job in repository.list_ingestion_jobs(user_id):
            outputs.extend(repository.list_pending_ingestion_outputs(job["id"]))
        outputs.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    return [_normalize_output(output) for output in outputs]


def list_job_outputs(
    repository: SQLiteRepository,
    user_id: str,
    ingestion_job_id: str,
) -> list[IngestionOutput]:
    _assert_job_access(repository, user_id, ingestion_job_id)
    return [_normalize_output(output) for output in repository.list_ingestion_outputs(ingestion_job_id)]


def get_output(repository: SQLiteRepository, user_id: str, output_id: str) -> IngestionOutput:
    return _normalize_output(_assert_output_access(repository, user_id, output_id))


def transition_output(
    repository: SQLiteRepository,
    user_id: str,
    output_id: str,
    review_state: Literal["reviewed", "accepted", "rejected"],
    *,
    extracted_text: str | None = None,
    structured_json: Any | None = None,
) -> IngestionOutput:
    output = _assert_output_access(repository, user_id, output_id)
    current_state = output["review_state"]

    if review_state == "reviewed":
        if current_state in {"accepted", "rejected"}:
            raise IngestionStateError("Reviewed outputs cannot be reopened.")
        if current_state != "reviewed":
            output = repository.mark_ingestion_output_reviewed(output_id)
    elif review_state == "accepted":
        if current_state == "accepted":
            return _normalize_output(output)
        if current_state == "rejected":
            raise IngestionStateError("Rejected outputs cannot be accepted.")
        if extracted_text is not None or structured_json is not None:
            repository.save_ingestion_output(
                ingestion_job_id=output["ingestion_job_id"],
                extracted_text=extracted_text if extracted_text is not None else output["extracted_text"],
                structured_json=
                    structured_json
                    if structured_json is not None
                    else _coerce_structured_json(output["structured_json"]),
                confidence=output["confidence"],
                output_id=output_id,
            )
        output = repository.accept_ingestion_output(output_id)
    else:
        if current_state == "rejected":
            return _normalize_output(output)
        if current_state == "accepted":
            raise IngestionStateError("Accepted outputs cannot be rejected.")
        output = repository.reject_ingestion_output(output_id)

    if output is None:
        raise IngestionNotFoundError("Ingestion output not found.")
    return _normalize_output(output)


def create_scan_output(
    repository: SQLiteRepository,
    user_id: str,
    *,
    source_kind: str,
    source_name: str,
    extracted_text: str | None,
    structured_json: Any,
    confidence: float,
) -> IngestionOutput:
    job_id = repository.create_ingestion_job(
        user_id=user_id,
        source_kind=source_kind,
        source_name=source_name,
        status="pending_review",
    )
    output = repository.save_ingestion_output(
        ingestion_job_id=job_id,
        extracted_text=extracted_text,
        structured_json=structured_json,
        confidence=confidence,
    )
    repository.update_ingestion_job(job_id, status="pending_review")
    return _normalize_output(output)


async def save_food_from_output(
    repository: SQLiteRepository,
    user_id: str,
    output_id: str,
) -> SavedFoodsResult:
    output = _assert_output_access(repository, user_id, output_id)
    if output["review_state"] != "accepted":
        raise IngestionStateError("Only accepted ingestion outputs can be saved as foods.")

    structured_json = _coerce_structured_json(output["structured_json"])
    if not isinstance(structured_json, dict):
        raise IngestionSaveError("Accepted ingestion output does not contain food data.")

    product_name = structured_json.get("product_name")
    brand_name = structured_json.get("brand_name")
    calories = structured_json.get("calories")
    macros = structured_json.get("macros")
    serving_size = structured_json.get("serving_size")
    if not isinstance(product_name, str) or not product_name.strip():
        raise IngestionSaveError("Accepted ingestion output is missing a product name.")

    variants = _coerce_variants(structured_json.get("variants"))
    if variants:
        saved_variants = [repository.save_food_item(_food_from_variant(product_name.strip(), brand_name, variant)) for variant in variants]
        return SavedFoodsResult(saved_foods=saved_variants)

    nutrition_missing = not isinstance(calories, (int, float)) or not isinstance(macros, dict)
    if nutrition_missing:
        usda_food = await _lookup_usda_food(product_name.strip(), brand_name)
        if usda_food is None:
            raise IngestionSaveError(
                "Accepted ingestion output is missing nutrition, and USDA lookup did not find a matching food."
            )
        return SavedFoodsResult(saved_foods=[repository.save_food_item(usda_food)])

    serving_quantity, serving_unit = _parse_serving_size(serving_size)
    try:
        protein = float(macros["protein"])
        carbs = float(macros["carbs"])
        fat = float(macros["fat"])
    except (KeyError, TypeError, ValueError) as exc:
        raise IngestionSaveError("Accepted ingestion output has invalid macro data.") from exc

    food = FoodItem(
        id=f"food-label-{uuid4().hex[:12]}",
        name=product_name.strip(),
        brand=structured_json.get("brand_name"),
        calories=float(calories),
        serving_size=serving_quantity,
        serving_unit=serving_unit,
        macros=MacroTargets(protein=protein, carbs=carbs, fat=fat),
        source="LABEL_SCAN",
        favorite=False,
    )
    return SavedFoodsResult(saved_foods=[repository.save_food_item(food)])


async def _lookup_usda_food(product_name: str, brand_name: Any) -> FoodItem | None:
    settings = get_settings()
    if not settings.usda_api_key:
        return None

    queries = [product_name]
    if isinstance(brand_name, str) and brand_name.strip():
        queries.insert(0, f"{brand_name.strip()} {product_name}")

    for query in queries:
        try:
            matches = await search_usda_foods(query, settings.usda_api_key)
        except UsdaSearchError:
            return None
        if matches:
            return matches[0]

    return None


def _coerce_variants(value: Any) -> list[VisionNutritionVariant]:
    if not isinstance(value, list):
        return []

    variants: list[VisionNutritionVariant] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        variant_name = item.get("variant_name")
        if not isinstance(variant_name, str) or not variant_name.strip():
            continue
        macros = item.get("macros")
        if not isinstance(macros, dict):
            macros = item
        try:
            variants.append(
                VisionNutritionVariant(
                    variant_name=variant_name.strip(),
                    serving_size=_as_string_value(item.get("serving_size"), "1 serving"),
                    calories=float(item.get("calories", 0)),
                    macros=MacroTargets(
                        protein=float(macros.get("protein", 0)),
                        carbs=float(macros.get("carbs", 0)),
                        fat=float(macros.get("fat", 0)),
                    ),
                )
            )
        except (TypeError, ValueError):
            continue
    return variants


def _food_from_variant(product_name: str, brand_name: Any, variant: VisionNutritionVariant) -> FoodItem:
    serving_quantity, serving_unit = _parse_serving_size(variant.serving_size)
    brand = brand_name.strip() if isinstance(brand_name, str) and brand_name.strip() else None
    variant_label = variant.variant_name.strip()
    return FoodItem(
        id=f"food-label-{uuid4().hex[:12]}",
        name=f"{product_name} - {variant_label}",
        brand=brand,
        calories=variant.calories,
        serving_size=serving_quantity,
        serving_unit=serving_unit,
        macros=variant.macros,
        source="LABEL_SCAN",
        favorite=False,
    )


def _as_string_value(value: Any, fallback: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _parse_serving_size(value: Any) -> tuple[float, str]:
    if isinstance(value, (int, float)):
        return float(value), "serving"
    if not isinstance(value, str):
        return 1.0, "serving"
    normalized = value.strip()
    if not normalized:
        return 1.0, "serving"
    parts = normalized.split(maxsplit=1)
    try:
        quantity = float(parts[0])
        unit = parts[1] if len(parts) > 1 else "serving"
        return quantity, unit
    except ValueError:
        return 1.0, normalized
