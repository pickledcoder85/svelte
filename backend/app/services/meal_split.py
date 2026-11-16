"""How the daily target is shared across the day's meals and snacks.

3 a day: breakfast, lunch, dinner. 4: an afternoon snack before dinner. 5: a morning snack too.
Percents are in steps of 5; each meal gets at least 10, each snack at least 5; they add to 100.
Macros follow the same percents, so every block has the day's balance.
"""
from __future__ import annotations

import json
from typing import Any

MEAL_PATTERNS: dict[int, list[str]] = {
    3: ["breakfast", "lunch", "dinner"],
    4: ["breakfast", "lunch", "afternoon_snack", "dinner"],
    5: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"],
}
DEFAULT_SPLITS: dict[int, list[int]] = {
    3: [30, 35, 35],
    4: [25, 30, 10, 35],
    5: [20, 10, 30, 10, 30],
}
LABELS = {
    "breakfast": "Breakfast",
    "morning_snack": "Morning snack",
    "lunch": "Lunch",
    "afternoon_snack": "Afternoon snack",
    "dinner": "Dinner",
}
MIN_MEAL = 10
MIN_SNACK = 5


class MealSplitError(ValueError):
    pass


def is_snack(key: str) -> bool:
    return key.endswith("snack")


def validate_split(meals_per_day: int, split: list[int]) -> list[int]:
    keys = MEAL_PATTERNS.get(meals_per_day)
    if keys is None:
        raise MealSplitError("Meals per day must be 3, 4, or 5.")
    if not isinstance(split, list) or len(split) != len(keys):
        raise MealSplitError(f"Give one percent for each of the {len(keys)} meals.")
    if any(isinstance(part, bool) or not isinstance(part, int) for part in split):
        raise MealSplitError("Meal split values must be whole numbers.")
    for key, part in zip(keys, split):
        floor = MIN_SNACK if is_snack(key) else MIN_MEAL
        if part < floor or part % 5:
            raise MealSplitError(f"{LABELS[key]} needs at least {floor}%, in steps of 5%.")
    if sum(split) != 100:
        raise MealSplitError("The meal split must add up to 100%.")
    return list(split)


def resolve_split(meals_per_day: Any, stored: Any) -> tuple[int, list[int]]:
    """The saved count and split, or the defaults when nothing valid is stored."""
    count = meals_per_day if meals_per_day in MEAL_PATTERNS else 3
    try:
        split = json.loads(stored) if isinstance(stored, str) else stored
        return count, validate_split(count, split)
    except (MealSplitError, ValueError, TypeError):
        return count, list(DEFAULT_SPLITS[count])


def meal_blocks(meals_per_day: int, split: list[int]) -> list[dict[str, Any]]:
    """The day's blocks in order: key, label, whether it's a snack, and its percent."""
    return [
        {"key": key, "label": LABELS[key], "snack": is_snack(key), "percent": percent}
        for key, percent in zip(MEAL_PATTERNS[meals_per_day], split)
    ]
