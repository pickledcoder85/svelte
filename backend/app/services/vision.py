import base64
import binascii
import json
from typing import Any

import httpx

from backend.app.config import Settings
from backend.app.models.nutrition import (
    MacroTargets,
    VisionFoodMatchCandidate,
    VisionNutritionExtraction,
    VisionNutritionVariant,
    VisionPackageExtraction,
)
from backend.app.repositories.sqlite import SQLiteRepository


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
VISION_TIMEOUT_SECONDS = 45

# Image formats OpenAI vision accepts, detected from the file's leading bytes.
_IMAGE_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
)


class VisionNotConfiguredError(RuntimeError):
    """Scanning needs OPENAI_API_KEY, and demo results are not allowed (production)."""


class VisionImageError(ValueError):
    """The uploaded image is too large, not base64, or not a supported format."""


def prepare_image_data_url(image_base64: str, settings: Settings) -> str:
    """Validate an uploaded image and return a data URL with its real media type.

    Accepts raw base64 or a data URL. Rejects oversized uploads before any decoding, and
    formats OpenAI cannot read (for example HEIC straight from an iPhone).
    """
    raw = image_base64.strip()
    if raw.startswith("data:"):
        _, _, raw = raw.partition(",")
    raw = "".join(raw.split())
    if not raw:
        raise VisionImageError("The image is empty.")
    if len(raw) > settings.vision_max_image_base64_chars:
        raise VisionImageError("The image is too large. Retake it or use a smaller photo.")
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise VisionImageError("The image could not be read.") from exc
    media_type = _detect_image_type(data)
    if media_type is None:
        raise VisionImageError("Unsupported image format. Use a JPEG, PNG, WEBP, or GIF photo.")
    return f"data:{media_type};base64,{raw}"


def _detect_image_type(data: bytes) -> str | None:
    for signature, media_type in _IMAGE_SIGNATURES:
        if data.startswith(signature):
            return media_type
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _require_vision(settings: Settings) -> bool:
    """True when a real model call should be made; False for the development demo result."""
    if settings.openai_api_key:
        return True
    if settings.vision_demo_fallback_allowed:
        return False
    raise VisionNotConfiguredError("Scanning is not set up on this server.")


async def analyze_label_image(image_base64: str, settings: Settings) -> VisionNutritionExtraction:
    image_url = prepare_image_data_url(image_base64, settings)

    if not _require_vision(settings):
        return VisionNutritionExtraction(
            label_text="Demo OCR output",
            product_name="Scanned food product",
            brand_name="Unknown brand",
            serving_size="1 serving",
            calories=120,
            macros=MacroTargets(protein=8, carbs=12, fat=4),
            confidence=0.62,
        )

    payload = await _request_vision_json(
        settings,
        image_url,
        """
Extract the visible nutrition-label metadata from this food package image.
Return JSON only with this exact shape:
{
  "label_text": "full readable nutrition label text",
  "product_name": "best guess product name",
  "brand_name": "best guess brand or null",
  "serving_size": "serving size text",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "multiple_variants_detected": false,
  "variants": [
    {
      "variant_name": "flavor or variety name",
      "serving_size": "serving size text",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ],
  "confidence": 0
}
Rules:
- confidence must be between 0 and 1
- calories, protein, carbs, and fat must be numbers
- use null for unknown brand_name
- carbs must be total carbohydrates from the label, not net carbs
- when the label includes multiple flavors or variants in one panel, set multiple_variants_detected=true and return one entry per variant in variants
- for multi-variant labels, keep top-level product_name and brand_name for the box itself
- if a field is unclear, make a conservative best guess rather than omitting it
""".strip(),
    )

    return VisionNutritionExtraction(
        label_text=_as_string(payload.get("label_text"), "Vision label extraction"),
        product_name=_as_string(payload.get("product_name"), "Scanned food product"),
        brand_name=_as_optional_string(payload.get("brand_name")),
        serving_size=_as_string(payload.get("serving_size"), "1 serving"),
        calories=_as_number(payload.get("calories"), 120),
        macros=MacroTargets(
            protein=_as_number(payload.get("protein"), 8),
            carbs=_as_number(payload.get("carbs"), 12),
            fat=_as_number(payload.get("fat"), 4),
        ),
        multiple_variants_detected=_as_bool(payload.get("multiple_variants_detected"), False),
        variants=_parse_variants(payload.get("variants")),
        confidence=_as_confidence(payload.get("confidence"), 0.62),
    )


async def analyze_package_image(
    image_base64: str,
    repository: SQLiteRepository,
    settings: Settings,
) -> VisionPackageExtraction:
    image_url = prepare_image_data_url(image_base64, settings)
    if not _require_vision(settings):
        product_name = "Rolled oats"
        brand_name = "Pantry staple"
        package_text = "Demo package-front output"
        confidence = 0.71
    else:
        payload = await _request_vision_json(
            settings,
            image_url,
            """
Extract the visible front-of-package product metadata from this food package image.
Return JSON only with this exact shape:
{
  "package_text": "main readable package-front text",
  "product_name": "best guess product name",
  "brand_name": "best guess brand or null",
  "confidence": 0
}
Rules:
- confidence must be between 0 and 1
- use null for unknown brand_name
- focus on the front-of-package identity, not nutrition facts
""".strip(),
        )
        product_name = _as_string(payload.get("product_name"), "Scanned package")
        brand_name = _as_optional_string(payload.get("brand_name"))
        package_text = _as_string(payload.get("package_text"), product_name)
        confidence = _as_confidence(payload.get("confidence"), 0.71)

    candidates = repository.search_foods(product_name)[:3]
    match_candidates = [
        VisionFoodMatchCandidate(
            food_id=food.id,
            name=food.name,
            brand=food.brand,
            source=food.source,
            confidence=round(max(0.35, 0.92 - (index * 0.12)), 2),
        )
        for index, food in enumerate(candidates)
    ]

    return VisionPackageExtraction(
        package_text=package_text,
        product_name=product_name,
        brand_name=brand_name,
        confidence=confidence,
        match_candidates=match_candidates,
    )


def build_vision_request(settings: Settings, image_url: str, instructions: str) -> dict[str, Any]:
    return {
        "model": settings.vision_model,
        "reasoning": {"effort": settings.vision_reasoning_effort},
        "text": {"format": {"type": "json_object"}},
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": instructions},
                    {"type": "input_image", "image_url": image_url, "detail": "high"},
                ],
            }
        ],
    }


async def _request_vision_json(settings: Settings, image_url: str, instructions: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=VISION_TIMEOUT_SECONDS) as client:
        response = await client.post(
            OPENAI_RESPONSES_URL,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json=build_vision_request(settings, image_url, instructions),
        )
    response.raise_for_status()
    payload = response.json()
    output_text = _extract_output_text(payload)
    if not isinstance(output_text, str) or not output_text.strip():
        raise ValueError("Vision response did not include structured text output.")
    parsed = _parse_json_object(output_text)
    if not isinstance(parsed, dict):
        raise ValueError("Vision response JSON was not an object.")
    return parsed


def _extract_output_text(payload: dict[str, Any]) -> str | None:
    direct_output = payload.get("output_text")
    if isinstance(direct_output, str) and direct_output.strip():
        return direct_output.strip()

    output_items = payload.get("output")
    if not isinstance(output_items, list):
        return None

    text_parts: list[str] = []
    for item in output_items:
        if not isinstance(item, dict):
            continue
        content_items = item.get("content")
        if not isinstance(content_items, list):
            continue
        for content in content_items:
            if not isinstance(content, dict):
                continue
            text_value = content.get("text")
            if isinstance(text_value, str) and text_value.strip():
                text_parts.append(text_value.strip())

    if not text_parts:
        return None
    return "\n".join(text_parts)


def _parse_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError(f"Vision response was not valid JSON: {stripped[:240]}") from None
        candidate = stripped[start : end + 1]
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            raise ValueError(f"Vision response was not valid JSON: {stripped[:240]}") from None

    if not isinstance(parsed, dict):
        raise ValueError("Vision response JSON was not an object.")
    return parsed


def _as_string(value: Any, fallback: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _as_optional_string(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _as_number(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _as_confidence(value: Any, fallback: float) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(0.0, min(1.0, confidence))


def _as_bool(value: Any, fallback: bool) -> bool:
    if isinstance(value, bool):
        return value
    return fallback


def _parse_variants(value: Any) -> list[VisionNutritionVariant]:
    if not isinstance(value, list):
        return []

    variants: list[VisionNutritionVariant] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        variant_name = _as_string(item.get("variant_name"), "")
        if not variant_name:
            continue
        variants.append(
            VisionNutritionVariant(
                variant_name=variant_name,
                serving_size=_as_string(item.get("serving_size"), "1 serving"),
                calories=_as_number(item.get("calories"), 0),
                macros=MacroTargets(
                    protein=_as_number(item.get("protein"), 0),
                    carbs=_as_number(item.get("carbs"), 0),
                    fat=_as_number(item.get("fat"), 0),
                ),
            )
        )
    return variants
