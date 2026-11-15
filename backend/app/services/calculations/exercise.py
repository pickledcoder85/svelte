"""How Relish counts a workout recorded by another app.

Watches report a workout's *total* calories, which include the calories you would have burned
anyway at rest. Each app estimates that resting part with its own BMR, so the same ride counts
differently in different apps. Relish takes the source's total, removes Relish's own resting
calories for the workout's minutes (from the same BMR as your target), and counts the rest as
active calories. That way the resting part is never counted twice: once in your target, once in
the workout.
"""
from __future__ import annotations

from dataclasses import dataclass

from backend.app.services.calculations.energy import resting_energy

WORKOUT_CALC_VERSION = "w1"
MINUTES_PER_DAY = 1440


@dataclass(frozen=True)
class WorkoutCalories:
    active_calories: int
    relish_resting_calories: int | None
    # "relish_bmr" when Relish's own BMR was used; "source_bmr" when the profile is not set up
    # and the source's own resting estimate was the only one available; "total" when neither.
    basis: str


def resting_calories_for(bmr_per_day: float, duration_seconds: float) -> int:
    return round(bmr_per_day * duration_seconds / 60 / MINUTES_PER_DAY)


def workout_active_calories(
    *,
    source_calories_total: float | None,
    duration_seconds: float,
    relish_bmr_per_day: float | None,
    source_bmr_calories: float | None = None,
) -> WorkoutCalories:
    """Active calories Relish counts for one recorded workout. Never negative."""
    total = max(0.0, float(source_calories_total or 0))
    if relish_bmr_per_day:
        resting = resting_calories_for(relish_bmr_per_day, duration_seconds)
        return WorkoutCalories(max(0, round(total - resting)), resting, "relish_bmr")
    if source_bmr_calories is not None:
        return WorkoutCalories(max(0, round(total - float(source_bmr_calories))), None, "source_bmr")
    return WorkoutCalories(round(total), None, "total")


def relish_bmr_for(profile: dict | None, weight_lbs: float | None) -> float | None:
    """Unrounded Mifflin-St Jeor BMR for a set-up profile at the given weight (the weigh-in on
    the workout's day, else the profile weight). None when the profile lacks body details."""
    if not profile:
        return None
    sex, age, height = profile.get("sex"), profile.get("age_years"), profile.get("height_cm")
    weight = weight_lbs or profile.get("current_weight_lbs")
    if not (sex and age and height and weight):
        return None
    return resting_energy(sex=sex, age_years=int(age), height_cm=float(height), current_weight_lbs=float(weight))
