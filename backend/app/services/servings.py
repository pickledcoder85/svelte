"""Serving sizes as printed on labels, and the weight of one serving.

Foods keep their label serving exactly as printed ("2 tbsp (32 g)") with nutrition per that
serving. When the weight of the serving is known (grams, or millilitres for liquids), it is
stored too, so any food can be logged or planned in grams. Nothing is guessed: a household
measure with no weight on the label ("1 packet") stays unknown until the user weighs it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

GRAMS_PER_OUNCE = 28.3495
ML_PER_FLUID_OUNCE = 29.5735

# Mixed numbers ("1 1/2") first, so they aren't read as "1" plus a unit of "1/2 cups".
_NUMBER = r"(\d+\s+\d+\s*/\s*\d+|\d+(?:\.\d+)?(?:\s*/\s*\d+)?)"
_WEIGHT_UNITS = {
    "g": ("g", 1.0),
    "gr": ("g", 1.0),
    "gram": ("g", 1.0),
    "grams": ("g", 1.0),
    "grm": ("g", 1.0),
    "kg": ("g", 1000.0),
    "mg": ("g", 0.001),
    "oz": ("g", GRAMS_PER_OUNCE),
    "ounce": ("g", GRAMS_PER_OUNCE),
    "ounces": ("g", GRAMS_PER_OUNCE),
    "lb": ("g", 453.592),
    "ml": ("ml", 1.0),
    "mlt": ("ml", 1.0),
    "millilitre": ("ml", 1.0),
    "milliliter": ("ml", 1.0),
    "l": ("ml", 1000.0),
    "fl oz": ("ml", ML_PER_FLUID_OUNCE),
    "floz": ("ml", ML_PER_FLUID_OUNCE),
}


@dataclass(frozen=True)
class ParsedServing:
    """A label serving: how many of what, and its weight when the label gives one."""

    amount: float
    unit: str
    grams: float | None
    basis: str | None  # "g" or "ml" when grams is known


def _to_number(text: str) -> float | None:
    text = text.strip()
    mixed = re.fullmatch(r"(\d+)\s+(\d+)\s*/\s*(\d+)", text)
    if mixed:
        whole, num, den = (int(part) for part in mixed.groups())
        return whole + num / den if den else None
    fraction = re.fullmatch(r"(\d+(?:\.\d+)?)\s*/\s*(\d+)", text)
    if fraction:
        num, den = float(fraction.group(1)), int(fraction.group(2))
        return num / den if den else None
    try:
        return float(text)
    except ValueError:
        return None


def _weight(amount_text: str, unit_text: str) -> tuple[float, str] | None:
    unit = re.sub(r"\s+", " ", unit_text.strip().lower().rstrip("."))
    if unit not in _WEIGHT_UNITS:
        return None
    amount = _to_number(amount_text)
    if amount is None or amount <= 0:
        return None
    basis, factor = _WEIGHT_UNITS[unit]
    return round(amount * factor, 2), basis


_UNIT_WORDS = r"(fl\.?\s*oz|floz|kg|mg|grams?|grm|gr|g|ounces?|oz|lb|millilit(?:er|re)s?|mlt|ml|l)\b"


def parse_serving_text(text: str | None) -> ParsedServing | None:
    """Parse label serving text such as "2 tbsp (32 g)", "30g", "1 cup (240 ml)", or "1 packet".

    Returns None when there is no usable amount. The weight comes from a metric or ounce
    measure in the text (brackets first); household measures alone leave grams unknown.
    """
    if not text or not text.strip():
        return None
    raw = re.sub(r"\s+", " ", text.strip())

    # A weight in brackets is the label's metric equivalent: "2 tbsp (32 g)".
    grams: float | None = None
    basis: str | None = None
    for inner in re.findall(r"\(([^)]*)\)", raw):
        match = re.search(rf"{_NUMBER}\s*{_UNIT_WORDS}", inner, re.IGNORECASE)
        if match:
            weight = _weight(match.group(1), match.group(2).replace(".", ""))
            if weight:
                grams, basis = weight
                break

    outside = re.sub(r"\([^)]*\)", "", raw).strip()
    lead = re.match(rf"^{_NUMBER}\s*(.*)$", outside)
    if not lead:
        # No leading amount ("Serving", "one bar"): only the bracketed weight is usable.
        if grams is not None:
            return ParsedServing(amount=grams, unit=basis or "g", grams=grams, basis=basis)
        return None
    amount = _to_number(lead.group(1))
    unit = lead.group(2).strip() or "serving"
    if amount is None or amount <= 0:
        return None

    if grams is None:
        # The serving itself may be a weight: "30g", "100 g", "8 fl oz", "1 oz".
        weight = _weight(lead.group(1), unit.replace(".", ""))
        if weight:
            grams, basis = weight

    return ParsedServing(amount=round(amount, 3), unit=unit, grams=grams, basis=basis)


def serving_grams_for_package(
    serving_grams: float | None,
    servings_per_container: float | None,
    net_weight_grams: float | None,
) -> float | None:
    """For a single-serve package ("1 packet", 1 serving per container), the net weight is the
    serving weight."""
    if serving_grams:
        return serving_grams
    if net_weight_grams and servings_per_container and abs(servings_per_container - 1) < 0.01:
        return net_weight_grams
    return None
