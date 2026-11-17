"""Add a workout by hand (Today → Workouts ＋).

Relish estimates the calories from the activity, minutes, effort (or pace, with a distance),
and the weight on that day: see calculations/met.py. Or the user gives their watch's total, and
Relish removes its own resting calories for those minutes, exactly as for imported workouts.
Either way the workout records how its calories were counted.
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.models.tracker import ExerciseEntry
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.calculations.exercise import WORKOUT_CALC_VERSION, relish_bmr_for, workout_active_calories
from backend.app.services.calculations.met import MET_VERSION, Activity, Effort, active_calories, met_for

# Used only when the user has no weigh-in and no profile weight yet (the estimate says so).
FALLBACK_WEIGHT_LBS = 154.0
ACTIVITY_LABELS = {"walk": "Walk", "run": "Run", "bike": "Bike", "swim": "Swim", "strength": "Strength", "other": "Workout"}
INTENSITY = {"easy": "Low", "moderate": "Moderate", "hard": "High"}


class WorkoutEstimateRequest(BaseModel):
    activity: Activity
    duration_minutes: int = Field(gt=0, le=1440)
    effort: Effort = "moderate"
    distance_m: float | None = Field(default=None, gt=0, le=1_000_000)
    logged_on: date | None = None


class WorkoutEstimate(BaseModel):
    met: float
    active_calories: int
    basis: Literal["pace", "effort"]
    weight_lbs: float
    # False when no weight is known yet and a typical weight was used.
    weight_known: bool


class ManualWorkoutRequest(WorkoutEstimateRequest):
    logged_on: date
    logged_at: str = Field(min_length=1, max_length=20)
    title: str | None = Field(default=None, max_length=60)
    # "My watch says": the device's total calories. Relish removes its resting calories.
    device_calories_total: int | None = Field(default=None, ge=0, le=20000)


def _weight(repository: SQLiteRepository, user_id: str, day: date) -> tuple[float, bool]:
    weight = repository.weight_on_or_before(user_id, day)
    if not weight:
        weight = (repository.get_user_identity(user_id) or {}).get("current_weight_lbs")
    return (float(weight), True) if weight else (FALLBACK_WEIGHT_LBS, False)


def estimate_workout(repository: SQLiteRepository, user_id: str, payload: WorkoutEstimateRequest) -> WorkoutEstimate:
    weight, known = _weight(repository, user_id, payload.logged_on or date.today())
    met, basis = met_for(payload.activity, payload.effort, payload.duration_minutes, payload.distance_m)
    return WorkoutEstimate(
        met=met,
        active_calories=active_calories(met, weight, payload.duration_minutes),
        basis=basis,
        weight_lbs=round(weight, 1),
        weight_known=known,
    )


def save_manual_workout(repository: SQLiteRepository, user_id: str, payload: ManualWorkoutRequest) -> ExerciseEntry:
    estimate = estimate_workout(repository, user_id, payload)
    title = (payload.title or "").strip() or ACTIVITY_LABELS[payload.activity]
    entry = {
        "title": title,
        "duration_minutes": payload.duration_minutes,
        "logged_on": payload.logged_on,
        "logged_at": payload.logged_at,
        "intensity": INTENSITY[payload.effort],
        "activity_type": payload.activity,
        "distance_m": payload.distance_m,
        "met": estimate.met,
        "weight_lbs_at_time": estimate.weight_lbs if estimate.weight_known else None,
    }
    if payload.device_calories_total is not None:
        profile = repository.get_user_identity(user_id)
        bmr = relish_bmr_for(profile if profile and profile.get("setup_complete") else None, estimate.weight_lbs if estimate.weight_known else None)
        counted = workout_active_calories(
            source_calories_total=payload.device_calories_total,
            duration_seconds=payload.duration_minutes * 60,
            relish_bmr_per_day=bmr,
        )
        entry |= {
            "calories_burned": counted.active_calories,
            "source_calories_total": payload.device_calories_total,
            "relish_resting_calories": counted.relish_resting_calories,
            "calories_method": "device",
            "calc_version": f"{WORKOUT_CALC_VERSION}:{counted.basis}",
        }
    else:
        entry |= {
            "calories_burned": estimate.active_calories,
            "calories_method": "estimated",
            "calc_version": f"{MET_VERSION}:{estimate.basis}",
        }
    row = repository.save_manual_exercise(user_id=user_id, entry=entry)
    return ExerciseEntry.model_validate(row)
