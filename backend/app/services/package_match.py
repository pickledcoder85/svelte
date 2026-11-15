"""Nutrition for a package-front scan.

A package front shows the product's name and brand, not its nutrition. Relish searches your food
bank, then Open Food Facts, then USDA branded foods for that name and brand, scores each result
by how well it matches, and pre-fills the best one, with up to three others to switch to. It is
a guess and says so: a nutrition label scan replaces it with the real numbers.
"""
from __future__ import annotations

import asyncio
import logging
import re
from collections.abc import Callable
from typing import Any

import httpx

from backend.app.integrations.open_food_facts import product_to_label, search_products
from backend.app.integrations.usda import search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository

logger = logging.getLogger(__name__)

MIN_MATCH_SCORE = 0.6
SEARCH_TIMEOUT_SECONDS = 5
# Each word the candidate has that the package doesn't ("blueberry" vs "strawberry", "kale")
# usually means a different flavour or food.
EXTRA_WORD_PENALTY = 0.25
BRAND_MATCH_BONUS = 0.15
BRAND_MISMATCH_PENALTY = 0.3
BRAND_MISSING_PENALTY = 0.25
MAX_ALTERNATIVES = 3
# Words packages use interchangeably ("Zero Sugar" and "Sugar Free").
_SYNONYMS = {"zero": "free", "lite": "light", "lowfat": "low", "nonfat": "free", "fatfree": "free"}
_STOPWORDS = {"the", "and", "with", "of", "a", "an", "&", "in", "for", "by", "co", "inc", "foods", "food", "brand"}
_SOURCE_NAMES = {"food_bank": "your food bank", "open_food_facts": "Open Food Facts", "usda": "USDA"}


def _words(text: str | None) -> set[str]:
    # "Lay's" is one word: drop the possessive before splitting, and ignore single letters.
    cleaned = re.sub(r"['’]s\b", "", (text or "").lower())
    words = re.findall(r"[a-z0-9]+", cleaned)
    return {
        _SYNONYMS.get(word, word.rstrip("s") if len(word) > 3 else word)
        for word in words
        if len(word) > 1 and word not in _STOPWORDS
    }


def match_score(product_name: str, brand: str | None, candidate_name: str, candidate_brand: str | None) -> float:
    """0–1: how well a candidate's name fits the package's, with a brand bonus or penalty.

    Package fronts are wordy ("Zero Sugar Chocolate Instant Reduced Calorie Pudding & Pie
    Filling") while database names are short ("Sugar Free Chocolate Instant Pudding"), so the
    candidate's words being on the package counts most (60%), and covering the package's words
    less (40%). A candidate word the package doesn't have usually means another flavour or food.
    """
    wanted = _words(product_name)
    package_brand = _words(brand)
    candidate = _words(candidate_name) - package_brand
    if not wanted or not candidate:
        return 0.0
    matched = len(wanted & candidate)
    precision = matched / len(candidate)
    recall = matched / len(wanted)
    extra = len(candidate - wanted)
    score = 0.6 * precision + 0.4 * recall - min(0.75, EXTRA_WORD_PENALTY * extra)
    if package_brand:
        if package_brand & (_words(candidate_brand) | _words(candidate_name)):
            score += BRAND_MATCH_BONUS
        elif candidate_brand:
            score -= BRAND_MISMATCH_PENALTY
        else:
            score -= BRAND_MISSING_PENALTY
    return round(max(0.0, min(1.0, score)), 3)


def _food_label(food: FoodItem, source: str) -> dict[str, Any]:
    serving = food.serving_text or f"{food.serving_size:g} {food.serving_unit}"
    return {
        "product_name": food.name,
        "brand_name": food.brand,
        "serving_size": serving,
        "calories": food.calories,
        "macros": {"protein": food.macros.protein, "carbs": food.macros.carbs, "fat": food.macros.fat},
        "serving_grams": food.serving_grams,
        "serving_basis": food.serving_basis,
        "data_source": source,
        "attribution": "Data from USDA FoodData Central" if source == "usda" else None,
        # Saving reuses this food instead of making a copy.
        "food_id": food.id,
    }


async def find_package_matches(
    repository: SQLiteRepository,
    product_name: str,
    brand_name: str | None,
    *,
    usda_api_key: str = "",
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
) -> list[dict[str, Any]]:
    """Likely foods for a package front, best first: label-shaped dicts with match_score."""
    query = " ".join(part for part in (brand_name, product_name) if part).strip()
    if not query:
        return []
    key_words = [word for word in re.findall(r"[A-Za-z0-9'-]+", product_name) if word.lower() not in _STOPWORDS][:4]
    short_query = " ".join(part for part in (brand_name, " ".join(key_words)) if part).strip()
    found: list[dict[str, Any]] = []

    for food in repository.search_foods(product_name)[:10]:
        if food.calories:
            found.append(_food_label(food, "food_bank"))

    async def off_labels(client: httpx.AsyncClient) -> list[dict[str, Any]]:
        labels = []
        products = await search_products(query, client, timeout=SEARCH_TIMEOUT_SECONDS)
        if len(products) < 3 and short_query != query:
            # A long package name can match nothing word for word; try the brand and key words.
            products += await search_products(short_query, client, timeout=SEARCH_TIMEOUT_SECONDS)
        for product in products:
            label = product_to_label(product, barcode="")
            if label:
                code = str(product.get("code") or "").strip()
                labels.append({**label, "food_id": f"off-{code}" if code else None})
        return labels

    async def usda_labels(client: httpx.AsyncClient) -> list[dict[str, Any]]:
        if not usda_api_key:
            return []
        return [_food_label(food, "usda") for food in (await search_usda_foods(query, usda_api_key, client=client))[:10]]

    # Both searches at once, each best-effort: a slow or broken source just adds nothing.
    factory = client_factory or (lambda: httpx.AsyncClient(timeout=SEARCH_TIMEOUT_SECONDS))
    async with factory() as client:
        results = await asyncio.gather(off_labels(client), usda_labels(client), return_exceptions=True)
    for name, result in zip(("Open Food Facts", "USDA"), results):
        if isinstance(result, BaseException):
            logger.warning("%s search failed: %s", name, type(result).__name__)
        else:
            found.extend(result)

    seen: set[tuple[str, str]] = set()
    scored = []
    for label in found:
        key = (str(label.get("product_name", "")).lower(), str(label.get("brand_name") or "").lower())
        if key in seen:
            continue
        seen.add(key)
        score = match_score(product_name, brand_name, label.get("product_name", ""), label.get("brand_name"))
        if score >= MIN_MATCH_SCORE:
            scored.append({**label, "barcode": None, "match_score": score})
    # Best score first; on a tie prefer your own bank, then Open Food Facts, then USDA.
    order = {"food_bank": 0, "open_food_facts": 1, "usda": 2}
    scored.sort(key=lambda item: (-item["match_score"], order.get(item.get("data_source"), 3)))
    return scored[: 1 + MAX_ALTERNATIVES]


def package_structured_json(extraction: dict[str, Any], matches: list[dict[str, Any]]) -> dict[str, Any]:
    """The package scan for review: what was read off the package, plus the best match's
    nutrition (marked as a match) and the alternatives, or nutrition_found = False."""
    base = {
        **extraction,
        # The name and brand as read off the front: a label scan that replaces this match keeps
        # them (labels often name the distributor, e.g. Kraft for Jell-O).
        "read_product_name": extraction.get("product_name"),
        "read_brand_name": extraction.get("brand_name"),
        "nutrition_from": None,
        "nutrition_found": False,
        "alternatives": [],
    }
    if not matches:
        return base
    best, others = matches[0], matches[1:]
    source = _SOURCE_NAMES.get(best.get("data_source"), "a food database")
    return {
        **base,
        "product_name": best["product_name"],
        "brand_name": best.get("brand_name") or extraction.get("brand_name"),
        "serving_size": best.get("serving_size"),
        "calories": best.get("calories"),
        "macros": best.get("macros"),
        "serving_grams": best.get("serving_grams"),
        "serving_basis": best.get("serving_basis"),
        "data_source": best.get("data_source") if best.get("data_source") in ("open_food_facts", "usda") else None,
        "attribution": best.get("attribution"),
        "nutrition_from": "match",
        "matched_food_id": best.get("food_id"),
        "nutrition_found": True,
        "match_note": f"Matched to {best['product_name']} from {source}. Check it against the label, or scan the nutrition label for the exact numbers.",
        "alternatives": others,
        "variants": [],
        "multiple_variants_detected": False,
    }
