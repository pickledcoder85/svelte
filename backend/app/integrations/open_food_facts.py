"""Open Food Facts product lookup by barcode (https://world.openfoodfacts.org).

Data is ODbL-licensed: show "Data from Open Food Facts" with results. Only the barcode is sent,
with a generic app name in the User-Agent (no personal details).
"""

from typing import Any

import httpx

OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"
OFF_USER_AGENT = "Relish/0.1 (personal nutrition tracker)"
OFF_FIELDS = "code,product_name,product_name_en,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments"
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
        per_100g_only = False
        # OFF's numeric serving weight; the unit is grams unless it says ml.
        unit = str(product.get("serving_quantity_unit") or "g").lower()
        serving_grams = _number(product.get("serving_quantity")) or None
        serving_basis = "ml" if unit == "ml" else "g"
    else:
        # No per-serving numbers: these are per 100 g, NOT a serving (the app asks for a weight).
        values, serving_size = per("100g"), "100 g"
        serving_grams, serving_basis = 100.0, "g"
        per_100g_only = True
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
        "serving_grams": serving_grams,
        "serving_basis": serving_basis if serving_grams else None,
        "data_source": "open_food_facts",
        "per_100g_only": per_100g_only,
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


# Open Food Facts' search service ("search-a-licious"): ranked, typo-tolerant product search.
OFF_SEARCH_URL = "https://search.openfoodfacts.org/search"
# The older word-for-word search, used only if the newer service fails.
OFF_LEGACY_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OFF_SEARCH_FIELDS = (
    "code,product_name,product_name_en,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments"
)


def _normalise_hit(hit: dict[str, Any]) -> dict[str, Any]:
    """The search service returns brands as a list; the rest of Relish expects the classic
    comma-separated string."""
    brands = hit.get("brands")
    if isinstance(brands, list):
        hit = {**hit, "brands": ", ".join(str(brand) for brand in brands if brand)}
    return hit


async def _search(url: str, params: dict[str, Any], client: httpx.AsyncClient, timeout: float, key: str) -> list[dict[str, Any]]:
    try:
        response = await client.get(url, params=params, headers={"User-Agent": OFF_USER_AGENT}, timeout=timeout)
    except httpx.RequestError as error:
        raise OpenFoodFactsError("Open Food Facts could not be reached.") from error
    if response.status_code != 200:
        raise OpenFoodFactsError(f"Open Food Facts search returned {response.status_code}.")
    try:
        payload = response.json()
    except ValueError as error:
        raise OpenFoodFactsError("Open Food Facts search returned an unexpected response.") from error
    items = payload.get(key) if isinstance(payload, dict) else None
    return [_normalise_hit(item) for item in items or [] if isinstance(item, dict)]


async def search_products(
    query: str, client: httpx.AsyncClient, page_size: int = 15, timeout: float = TIMEOUT_SECONDS
) -> list[dict[str, Any]]:
    """Products whose name or brand matches the text read off a package front, best first. Only
    that text is sent (no photo, no personal details)."""
    try:
        return await _search(
            OFF_SEARCH_URL,
            {"q": query, "page_size": page_size, "langs": "en", "fields": OFF_SEARCH_FIELDS},
            client,
            timeout,
            "hits",
        )
    except OpenFoodFactsError:
        return await _search(
            OFF_LEGACY_SEARCH_URL,
            {"search_terms": query, "search_simple": 1, "action": "process", "json": 1, "page_size": page_size, "fields": OFF_FIELDS},
            client,
            timeout,
            "products",
        )
