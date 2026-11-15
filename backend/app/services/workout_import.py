"""Saving workouts recorded by other apps (Garmin first).

Each import keeps three layers apart: the original record (as the source sent it), the source's
own numbers (shown as recorded), and Relish's interpretation (the active calories that count
toward the day's allowance). Relish's numbers are worked out once, at import, from the weight on
the workout's day, so later weigh-ins never rewrite past days.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from backend.app.models.tracker import ExerciseEntry
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.calculations.exercise import (
    WORKOUT_CALC_VERSION,
    relish_bmr_for,
    workout_active_calories,
)


@dataclass(frozen=True)
class ImportedWorkout:
    """One workout from a source, in Relish's terms but with the source's numbers untouched."""

    source: str
    source_id: str
    title: str
    activity_type: str | None
    started_local: datetime  # the wall-clock start where it was recorded: sets the diary day
    started_at_utc: str | None
    duration_seconds: float
    distance_m: float | None
    calories_total: float | None
    bmr_calories: float | None
    raw: dict[str, Any]


def intensity_for(active_calories: int, duration_seconds: float) -> str:
    per_minute = active_calories / max(1.0, duration_seconds / 60)
    if per_minute >= 10:
        return "High"
    if per_minute >= 5:
        return "Moderate"
    return "Low"


def _clock(value: datetime) -> str:
    return value.strftime("%I:%M %p").lstrip("0")


def save_imported_workout(
    repository: SQLiteRepository, user_id: str, workout: ImportedWorkout
) -> tuple[str, ExerciseEntry | None]:
    day: date = workout.started_local.date()
    weight = repository.weight_on_or_before(user_id, day)
    profile = repository.get_user_identity(user_id)
    bmr = relish_bmr_for(profile if profile and profile.get("setup_complete") else None, weight)
    counted = workout_active_calories(
        source_calories_total=workout.calories_total,
        duration_seconds=workout.duration_seconds,
        relish_bmr_per_day=bmr,
        source_bmr_calories=workout.bmr_calories,
    )
    entry = {
        "title": workout.title,
        "duration_minutes": max(1, round(workout.duration_seconds / 60)),
        "calories_burned": counted.active_calories,
        "logged_on": day,
        "logged_at": _clock(workout.started_local),
        "intensity": intensity_for(counted.active_calories, workout.duration_seconds),
        "activity_type": workout.activity_type,
        "started_at": workout.started_at_utc,
        "distance_m": workout.distance_m,
        "source_calories_total": round(workout.calories_total) if workout.calories_total is not None else None,
        "source_bmr_calories": round(workout.bmr_calories) if workout.bmr_calories is not None else None,
        "relish_resting_calories": counted.relish_resting_calories,
        "weight_lbs_at_time": (weight or (profile or {}).get("current_weight_lbs")) if bmr else None,
        "calc_version": f"{WORKOUT_CALC_VERSION}:{counted.basis}",
    }
    outcome, row = repository.save_imported_exercise(
        user_id=user_id,
        source=workout.source,
        source_id=workout.source_id,
        payload_json=json.dumps(workout.raw, separators=(",", ":"), sort_keys=True),
        entry=entry,
    )
    return outcome, ExerciseEntry.model_validate(row) if row is not None else None
