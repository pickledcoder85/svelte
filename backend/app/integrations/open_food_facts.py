"""Open Food Facts product lookup by barcode (https://world.openfoodfacts.org).

Data is ODbL-licensed: show "Data from Open Food Facts" with results. Only the barcode is sent,
with a generic app name in the User-Agent (no personal details).
"""

from typing import Any

import httpx

OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"
OFF_USER_AGENT = "Relish/0.1 (personal nutrition tracker)"
OFF_FIELDS = "code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments"
TIMEOUT_SECONDS = 10


class OpenFoodFactsError(RuntimeError):
    pass


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def product_to_label(product: dict[str, Any], barcode: str) -> dict[str, Any] | None:
    """Turn an OFF product into the label-scan shape the review screen already understands.

    Prefers per-serving values; falls back to per-100 g. Returns None without usable nutrition.
    """
    name = (product.get("product_name") or product.get("product_name_en") or "").strip()
    nutriments = product.get("nutriments") or {}
    if not name or not isinstance(nutriments, dict):
        return None

    def per(suffix: str) -> dict[str, float | None]:
        return {
            "calories": _number(nutriments.get(f"energy-kcal_{suffix}")),
            "protein": _number(nutriments.get(f"proteins_{suffix}")),
            "carbs": _number(nutriments.get(f"carbohydrates_{suffix}")),
            "fat": _number(nutriments.get(f"fat_{suffix}")),
        }

    serving = per("serving")
    serving_text = (product.get("serving_size") or "").strip()
    if serving["calories"] is not None and serving_text:
        values, serving_size = serving, serving_text
    else:
        values, serving_size = per("100g"), "100 g"
    if values["calories"] is None:
        return None

    brand = (product.get("brands") or "").split(",")[0].strip() or None
    return {
        "label_text": f"{name} ({serving_size}) from Open Food Facts",
        "product_name": name,
        "brand_name": brand,
        "serving_size": serving_size,
        "calories": values["calories"],
        "macros": {key: values[key] or 0.0 for key in ("protein", "carbs", "fat")},
        "multiple_variants_detected": False,
        "variants": [],
        "confidence": 0.9,
        "barcode": barcode,
        "data_source": "open_food_facts",
        "attribution": "Data from Open Food Facts (ODbL)",
    }


async def fetch_product(code: str, client: httpx.AsyncClient) -> dict[str, Any] | None:
    """The raw OFF product for a barcode, or None when OFF does not know it."""
    try:
        response = await client.get(
            OFF_PRODUCT_URL.format(code=code),
            params={"fields": OFF_FIELDS},
            headers={"User-Agent": OFF_USER_AGENT},
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.RequestError as error:
        raise OpenFoodFactsError("Open Food Facts could not be reached.") from error
    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise OpenFoodFactsError(f"Open Food Facts returned {response.status_code}.")
    payload = response.json()
    if payload.get("status") != 1 or not isinstance(payload.get("product"), dict):
        return None
    return payload["product"]
