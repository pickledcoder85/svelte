"""Foods that are counted, not weighed: 2 eggs, 1 medium sweet potato, 2 slices of bread.

Gus says when an ingredient is counted (a count and a unit, e.g. 2 × "large egg"). The weight of
one comes from the matched food's USDA household measures ("1 egg" = 50 g, "1 medium" = 150 g)
when it has a fitting one, else from Gus's own grams. Meal sizing then keeps counted foods whole
(halves for big ones) and lets the weighed foods make up the difference.
"""
from __future__ import annotations

import math
import re
from typing import Any

from backend.app.models.nutrition import FoodItem

MAX_COUNT = 24
# One of these or heavier can be halved (half a sweet potato or avocado); lighter ones stay whole.
HALVES_FROM_GRAMS = 120
SIZES = ("extra large", "extra small", "medium", "large", "small")
# Words in measures that don't name another food ("1 medium whole", "1 medium or regular slice").
FILLER = {"whole", "or", "regular", "thick", "thin", "very", "piece", "item", "each"}
# Measures that are never "one of" a food (a cup of apple, an inch of banana).
NOT_A_UNIT = re.compile(r"\b(cup|oz|ounce|tbsp|tablespoon|tsp|teaspoon|inch|package|container|serving|snack|fl|ml|lb|pound|mashed|chopped|diced)\b")


def _words(text: str) -> set[str]:
    words = set()
    for word in re.findall(r"[a-z]+", text.lower()):
        words.add(word)
        if len(word) > 3 and word.endswith("es"):
            words.add(word[:-2])
        if len(word) > 3 and word.endswith("s"):
            words.add(word[:-1])
    return words


def _size(text: str) -> str | None:
    """The size a measure or unit names ("extra large" before "large")."""
    return next((size for size in SIZES if re.search(rf"\b{size}\b", text)), None)


def unit_weight(food: FoodItem, unit: str, name: str) -> float | None:
    """Grams in one `unit` of the food from its USDA measures, or None when none fits.

    Preference: the size Gus gave ("1 large" for "large egg"), then a measure naming the food
    ("1 egg", "1 banana"; never another variety such as "1 plum tomato" for a cherry tomato),
    then medium, then large or small. Slices only when Gus counted slices."""
    unit_text = unit.lower()
    unit_words = _words(unit_text)
    unit_size = _size(unit_text)
    known = unit_words | _words(name) | _words(food.name) | FILLER
    whole: list[tuple[int, int, float]] = []
    for order, portion in enumerate(food.portions):
        label = portion.label.lower().strip()
        if not label.startswith("1 ") or NOT_A_UNIT.search(label):
            continue
        rest = re.sub(r"\([^)]*\)", " ", label[2:])  # drop "(2-1/2\" dia)"
        size = _size(rest)
        rest_words = _words(re.sub(rf"\b{size}\b", " ", rest) if size else rest)
        if ("slice" in rest_words) != ("slice" in unit_words):
            continue  # slices only for things counted in slices (bread), never an apple
        if not rest_words <= known:
            continue  # another variety or form ("1 plum tomato", "1 cherry tomato")
        if size is None:
            if not rest_words - FILLER:
                continue
            rank = 1  # "1 egg", "1 banana", "1 slice"
        elif size == unit_size:
            rank = 0  # the size Gus gave
        else:
            rank = {"medium": 2, "large": 3, "small": 3}.get(size, 4)
        whole.append((rank, order, portion.grams))
    return min(whole)[2] if whole else None


def counted_unit(item: dict[str, Any], food: FoodItem) -> tuple[str, float] | None:
    """(unit, grams in one) for an ingredient Gus counted, else None (it's weighed)."""
    unit = str(item.get("unit") or "").strip()
    count = item.get("count")
    if not unit or not count:
        return None
    each = unit_weight(food, unit, item["name"]) or item["grams"] / count
    return (unit, each) if each > 0 else None


def round_count(count: float, each_grams: float) -> float:
    """Whole items, or halves for big ones; never none."""
    if each_grams >= HALVES_FROM_GRAMS:
        return max(0.5, round(count * 2) / 2)
    return max(1.0, float(round(count)))


def plural(unit: str) -> str:
    """"large egg" → "large eggs", "slice of bread" → "slices of bread", "medium potato" → "medium potatoes"."""
    head, of, tail = unit.partition(" of ")
    words = head.split(" ")
    last = words[-1]
    if re.search(r"(s|x|z|ch|sh)$", last) or last.endswith(("potato", "tomato", "mango")):
        last += "es"
    elif re.search(r"[^aeiou]y$", last):
        last = last[:-1] + "ies"
    elif last.endswith("f") and last not in ("beef",):
        last = last[:-1] + "ves"
    else:
        last += "s"
    return " ".join([*words[:-1], last]) + (of + tail if of else "")


def count_text(count: float) -> str:
    whole = math.floor(count)
    half = count - whole >= 0.5
    if half:
        return "½" if whole == 0 else f"{whole}½"
    return str(int(whole))


def quantity_label(grams: float, count: float | None = None, unit: str | None = None, unit_plural: str | None = None) -> str:
    """"2 large eggs (100 g)", "½ medium sweet potato (75 g)", or "150 g". `unit_plural` when
    the unit isn't English ("huevos grandes")."""
    weight = f"{round(grams)} g"
    if not count or not unit:
        return weight
    return f"{count_text(count)} {unit if count <= 1 else (unit_plural or plural(unit))} ({weight})"
