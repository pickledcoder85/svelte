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
MIN_COVERAGE = 0.5


def _words(text: str) -> set[str]:
    return {word.rstrip("s") if len(word) > 3 else word for word in re.findall(r"[a-z]+", text.lower()) if len(word) > 1}


def pick_generic_food(query: str, foods: list[FoodItem]) -> FoodItem | None:
    """The first USDA result (USDA ranks by relevance) that names most of the query's words and
    has nutrition per known weight."""
    wanted = _words(query)
    for food in foods:
        if not food.serving_grams or food.calories <= 0:
            continue
        have = _words(food.name)
        if wanted and len(wanted & have) / len(wanted) >= MIN_COVERAGE:
            return food
    return None


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
