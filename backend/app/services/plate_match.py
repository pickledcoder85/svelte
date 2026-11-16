"""Nutrition for a photo of food (a plate, bowl, or whole foods).

The AI is good at seeing *what* is on a plate and roughly how much, and much less reliable at
knowing its nutrition. So each item it names is looked up in USDA FoodData Central's generic
foods (per 100 g) and scaled by the estimated weight. The AI's own guess is kept only as a
fallback when USDA has no usable match (or no key is set), and the app says so.
"""
from __future__ import annotations

import asyncio
import logging
import re
from collections.abc import Callable
from typing import Any

import httpx

from backend.app.integrations.usda import GENERIC_DATA_TYPES, search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository

logger = logging.getLogger(__name__)
SEARCH_TIMEOUT_SECONDS = 6

# Preparation states that change calories a lot per gram (dry rice ~365 kcal/100 g, cooked ~130).
COOKED_WORDS = {
    "cooked", "boiled", "roasted", "roast", "grilled", "baked", "fried", "steamed", "broiled", "braised",
    "sauteed", "stewed", "poached", "scrambled", "toasted", "mashed",
}
RAW_WORDS = {"raw", "dry", "dried", "dehydrated", "powder", "uncooked", "unprepared", "concentrate"}
# Words that make a different food from the same ingredient (rice cakes, chicken nuggets).
DIFFERENT_FOOD_WORDS = {
    "cake", "nugget", "chip", "cracker", "snack", "bar", "flour", "juice", "sauce", "soup", "baby",
    "babyfood", "formula", "candy", "pudding", "pie", "bread", "noodle", "frozen", "canned", "imitation",
    "substitute", "spread", "dressing", "gravy", "dip", "beverage", "drink", "mix",
    # Coatings and added sugar change the calories a lot (breaded chicken is not chicken breast).
    "breaded", "battered", "glazed", "candied", "sweetened", "stuffed", "coated",
    # Processed or different products from the same food (a deli roll is not a chicken breast,
    # oat bran and oat milk are not oats).
    "roll", "loaf", "patty", "sausage", "bran", "milk", "flour", "powdered",
    # A different vegetable that shares a name (broccoli raab and Chinese broccoli are not broccoli).
    "raab", "chinese",
}
# Fried or cooked with added fat: far more calories than steamed or baked (fried broccoli ~223
# kcal/100 g, steamed ~35), and Gus lists any oil as its own ingredient. Matched when the
# ingredient asks for it, otherwise only when no plain food is found.
ADDED_FAT = re.compile(r"\bfried\b|\b(fat|oil|butter|margarine) added\b|\bwith (fat|oil|butter|margarine)\b")
ADDED_FAT_ASKS = {"fried", "fry", "oil", "butter", "margarine", "fat"}
ADDED_FAT_PENALTY = 0.5
# Deli-style meat ("Chicken breast, oven-roasted, fat-free, sliced") is a fine food, but not what
# "chicken breast" means: it's matched when the ingredient asks for it (a sandwich), and otherwise
# only when no plain match is found.
DELI_MARKERS = {"deli", "sliced", "luncheon", "lunchmeat", "prepackaged"}
DELI_ASKS = DELI_MARKERS | {"sandwich"}
DELI_PENALTY = 0.5
# Other names for the same food, so a query and USDA's name meet.
SYNONYMS = {"rabe": "raab", "rapini": "raab"}


def _stem(word: str) -> str:
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 4 and word.endswith(("oes", "ches", "shes", "xes", "sses")):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _words(text: str) -> set[str]:
    words = {_stem(word) for word in re.findall(r"[a-z]+", text.lower()) if len(word) > 1}
    return {SYNONYMS.get(word, word) for word in words}


def food_score(query: str, food_name: str) -> float | None:
    """How well a USDA generic food fits a plate item; None when it's the wrong food or state."""
    wanted = _words(query)
    have = _words(food_name)
    if not wanted:
        return None
    if (wanted & COOKED_WORDS and have & RAW_WORDS) or (wanted & RAW_WORDS and have & COOKED_WORDS):
        return None
    if (have & DIFFERENT_FOOD_WORDS) - wanted:
        return None
    # Skin is a different food ("Chicken, skin (drumsticks and thighs)"), but "flesh and skin"
    # or "with skin" is the whole food (baked potatoes, apples).
    lowered = food_name.lower()
    # Breakfast cereal is a different food from the grain ("Cereals, oats, … cooked" is oats).
    if "ready-to-eat" in lowered and "cereal" not in wanted:
        return None
    if "skin" in have and "skin" not in wanted and not re.search(r"\b(and|with)\s+skin\b", lowered):
        return None
    # Preparation words are qualifiers: USDA often says "roasted" where the photo says "grilled".
    deli_asked = bool(wanted & DELI_ASKS)
    deli_food = bool(have & DELI_MARKERS)
    # Asking for deli counts as matched by any deli word ("deli turkey" → "Turkey, sliced").
    matched = wanted & have | (wanted & DELI_ASKS if deli_asked and deli_food else set())
    core = wanted - COOKED_WORDS - RAW_WORDS or wanted
    matched_core = len(core & matched)
    needed = len(core) if len(core) <= 2 else max(2, round(len(core) * 0.67))
    if matched_core < needed:
        return None
    coverage = len(matched) / len(wanted)
    extra = len(have - wanted - DELI_MARKERS)
    score = coverage - 0.03 * extra
    if deli_food and not deli_asked:
        score -= DELI_PENALTY
    if ADDED_FAT.search(lowered) and not wanted & ADDED_FAT_ASKS:
        score -= ADDED_FAT_PENALTY
    return score


def pick_generic_food(query: str, foods: list[FoodItem]) -> FoodItem | None:
    """The best-fitting USDA result with nutrition per known weight (ties: USDA's own ranking)."""
    best: tuple[float, int, FoodItem] | None = None
    for rank, food in enumerate(foods):
        if not food.serving_grams or food.calories <= 0:
            continue
        score = food_score(query, food.name)
        if score is None:
            continue
        key = (score, -rank)
        if best is None or key > (best[0], -best[1]):
            best = (score, rank, food)
    return best[2] if best else None


async def resolve_plate_items(
    repository: SQLiteRepository,
    items: list[dict[str, Any]],
    *,
    usda_api_key: str = "",
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
) -> list[dict[str, Any]]:
    """Each item with `food` (a saved USDA food to log by weight) or None (use the estimate)."""
    if not usda_api_key:
        return [{**item, "food": None} for item in items]
    factory = client_factory or (lambda: httpx.AsyncClient(timeout=SEARCH_TIMEOUT_SECONDS))
    async with factory() as client:

        async def lookup(item: dict[str, Any]) -> FoodItem | None:
            foods = await search_usda_foods(item["usda_query"], usda_api_key, client=client, data_types=GENERIC_DATA_TYPES)
            return pick_generic_food(item["usda_query"], foods) or pick_generic_food(item["name"], foods)

        found = await asyncio.gather(*(lookup(item) for item in items), return_exceptions=True)
    resolved = []
    for item, food in zip(items, found):
        if isinstance(food, BaseException):
            logger.warning("USDA plate lookup failed: %s", type(food).__name__)
            food = None
        resolved.append({**item, "food": repository.save_food_item(food) if food is not None else None})
    return resolved
