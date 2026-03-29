import json
from typing import Any

import httpx

from backend.app.config import get_settings
from backend.app.models.nutrition import (
    MacroTargets,
    VisionFoodMatchCandidate,
    VisionNutritionExtraction,
    VisionPackageExtraction,
)
from backend.app.repositories.sqlite import SQLiteRepository


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
VISION_MODEL = "gpt-4.1-mini"


async def analyze_label_image(image_base64: str) -> VisionNutritionExtraction:
    settings = get_settings()

    if not settings.openai_api_key:
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
        settings.openai_api_key,
        image_base64,
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
  "confidence": 0
}
Rules:
- confidence must be between 0 and 1
- calories, protein, carbs, and fat must be numbers
- use null for unknown brand_name
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
        confidence=_as_confidence(payload.get("confidence"), 0.62),
    )


async def analyze_package_image(
    image_base64: str,
    repository: SQLiteRepository,
) -> VisionPackageExtraction:
    settings = get_settings()
    if not settings.openai_api_key:
        product_name = "Rolled oats"
        brand_name = "Pantry staple"
        package_text = "Demo package-front output"
        confidence = 0.71
    else:
        payload = await _request_vision_json(
            settings.openai_api_key,
            image_base64,
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


async def _request_vision_json(api_key: str, image_base64: str, instructions: str) -> dict[str, Any]:
    image_url = image_base64 if image_base64.startswith("data:") else f"data:image/jpeg;base64,{image_base64}"
    response = await httpx.AsyncClient(timeout=45).post(
        OPENAI_RESPONSES_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": VISION_MODEL,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": instructions},
                        {"type": "input_image", "image_url": image_url},
                    ],
                }
            ],
        },
    )
    response.raise_for_status()
    payload = response.json()
    output_text = payload.get("output_text")
    if not isinstance(output_text, str) or not output_text.strip():
        raise ValueError("Vision response did not include structured text output.")
    parsed = json.loads(output_text)
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
