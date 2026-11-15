"""Nutrition for a package-front scan.

A package front shows the product's name and brand, not its nutrition. Relish searches your food
bank, then Open Food Facts, then USDA branded foods for that name and brand, scores each result
by how well it matches, and pre-fills the best one, with up to three others to switch to. It is
a guess and says so: a nutrition label scan replaces it with the real numbers.
"""
from __future__ import annotations

import logging
import re
from collections.abc import Callable
from typing import Any

import httpx

from backend.app.integrations.open_food_facts import OpenFoodFactsError, product_to_label, search_products
from backend.app.integrations.usda import UsdaSearchError, search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository

logger = logging.getLogger(__name__)

MIN_MATCH_SCORE = 0.4
MAX_ALTERNATIVES = 3
_STOPWORDS = {"the", "and", "with", "of", "a", "an", "&", "in", "for", "by", "co", "inc", "foods", "food", "brand"}
_SOURCE_NAMES = {"food_bank": "your food bank", "open_food_facts": "Open Food Facts", "usda": "USDA"}


def _words(text: str | None) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {word.rstrip("s") if len(word) > 3 else word for word in words if word not in _STOPWORDS}


def match_score(product_name: str, brand: str | None, candidate_name: str, candidate_brand: str | None) -> float:
    """0–1: how much of the package's name the candidate covers, with a brand bonus or penalty."""
    wanted = _words(product_name)
    if not wanted:
        return 0.0
    have = _words(candidate_name) | _words(candidate_brand)
    coverage = len(wanted & have) / len(wanted)
    extra = len(_words(candidate_name) - wanted - _words(brand))
    score = coverage - min(0.3, 0.05 * extra)
    package_brand = _words(brand)
    if package_brand:
        if package_brand & (_words(candidate_brand) | _words(candidate_name)):
            score += 0.2
        elif candidate_brand:
            score -= 0.2
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
    found: list[dict[str, Any]] = []

    for food in repository.search_foods(product_name)[:10]:
        if food.calories:
            found.append(_food_label(food, "food_bank"))

    async with (client_factory or httpx.AsyncClient)() as client:
        try:
            for product in await search_products(query, client):
                label = product_to_label(product, barcode="")
                if label:
                    found.append(label)
        except OpenFoodFactsError as error:
            logger.warning("Open Food Facts search failed: %s", error)
        if usda_api_key:
            try:
                for food in (await search_usda_foods(query, usda_api_key, client=client))[:10]:
                    found.append(_food_label(food, "usda"))
            except UsdaSearchError as error:
                logger.warning("USDA search failed: %s", error)

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
    base = {**extraction, "nutrition_from": None, "nutrition_found": False, "alternatives": []}
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
        "nutrition_found": True,
        "match_note": f"Matched to {best['product_name']} from {source}. Check it against the label, or scan the nutrition label for the exact numbers.",
        "alternatives": others,
        "variants": [],
        "multiple_variants_detected": False,
    }
