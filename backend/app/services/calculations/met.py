"""Calories for a workout logged by hand, from MET values.

A MET is a multiple of resting energy (1 MET ≈ 1 kcal per kg per hour). Values are from the
Compendium of Physical Activities (2024 adult update), by activity and effort, or by speed when
a distance is given for walking, running, or cycling.

Active calories = (MET − 1) × kg × hours. The 1 MET at rest is taken off because the daily
target already counts resting calories (the same reason imported watch workouts have Relish's
resting calories removed), so nothing is counted twice.
"""
from __future__ import annotations

from typing import Literal

Activity = Literal["walk", "run", "bike", "swim", "strength", "other"]
Effort = Literal["easy", "moderate", "hard"]
MET_VERSION = "met1"
LBS_PER_KG = 2.20462
METERS_PER_MILE = 1609.344

# Effort → MET when there's no distance (or for activities without a speed table).
EFFORT_METS: dict[str, dict[str, float]] = {
    "walk": {"easy": 2.8, "moderate": 3.5, "hard": 4.3},  # ~2.5, 3, 3.5 mph
    "run": {"easy": 8.3, "moderate": 9.8, "hard": 11.5},  # ~5, 6, 7.5 mph
    "bike": {"easy": 5.8, "moderate": 7.5, "hard": 10.0},  # leisure, general, fast
    "swim": {"easy": 6.0, "moderate": 8.3, "hard": 9.8},  # leisurely, moderate laps, vigorous laps
    "strength": {"easy": 3.5, "moderate": 5.0, "hard": 6.0},  # light, moderate, vigorous lifting
    "other": {"easy": 3.0, "moderate": 4.5, "hard": 7.0},  # light, moderate, vigorous activity
}

# Speed (mph, at least) → MET, ascending.
SPEED_METS: dict[str, list[tuple[float, float]]] = {
    "walk": [(0, 2.0), (2.0, 2.8), (2.5, 3.0), (3.0, 3.5), (3.5, 4.3), (4.0, 5.0), (4.5, 7.0)],
    "run": [(0, 6.0), (4.5, 7.0), (5.0, 8.3), (5.5, 9.0), (6.0, 9.8), (6.5, 10.5), (7.0, 11.0), (7.5, 11.5),
            (8.0, 11.8), (8.5, 12.3), (9.0, 12.8), (10.0, 14.5), (11.0, 16.0), (12.0, 19.0)],
    "bike": [(0, 4.0), (10.0, 6.8), (12.0, 8.0), (14.0, 10.0), (16.0, 12.0), (20.0, 15.8)],
}
# Beyond these, the distance is probably a typo (or a car): fall back to the effort.
MAX_MPH = {"walk": 6.0, "run": 15.0, "bike": 35.0}


def speed_mph(distance_m: float | None, minutes: float) -> float | None:
    if not distance_m or distance_m <= 0 or minutes <= 0:
        return None
    return distance_m / METERS_PER_MILE / (minutes / 60)


def met_for(activity: str, effort: str, minutes: float, distance_m: float | None = None) -> tuple[float, str]:
    """(MET, basis): basis is "pace" when the speed set it, else "effort"."""
    speed = speed_mph(distance_m, minutes)
    table = SPEED_METS.get(activity)
    if table and speed is not None and speed <= MAX_MPH[activity]:
        met = table[0][1]
        for floor, value in table:
            if speed >= floor:
                met = value
        return met, "pace"
    efforts = EFFORT_METS.get(activity, EFFORT_METS["other"])
    return efforts.get(effort, efforts["moderate"]), "effort"


def active_calories(met: float, weight_lbs: float, minutes: float) -> int:
    """(MET − 1) × kg × hours; never negative."""
    return max(0, round((met - 1) * (weight_lbs / LBS_PER_KG) * (minutes / 60)))
