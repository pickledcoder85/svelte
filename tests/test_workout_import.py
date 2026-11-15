"""Workouts from other apps: original numbers kept, Relish's active calories counted."""

from datetime import date, datetime

import pytest

from backend.app.services.calculations.energy import resting_energy
from backend.app.services.calculations.exercise import (
    relish_bmr_for,
    resting_calories_for,
    workout_active_calories,
)
from backend.app.services.workout_import import ImportedWorkout, intensity_for, save_imported_workout


def test_resting_calories_scale_with_minutes():
    assert resting_calories_for(1440, 3600) == 60  # 1 kcal a minute for an hour
    assert resting_calories_for(1800, 30 * 60) == 38


def test_active_calories_remove_relish_resting_not_the_sources():
    counted = workout_active_calories(
        source_calories_total=700, duration_seconds=3600, relish_bmr_per_day=1800, source_bmr_calories=90
    )
    assert counted.relish_resting_calories == 75
    assert counted.active_calories == 625
    assert counted.basis == "relish_bmr"


def test_falls_back_to_the_sources_resting_then_the_total():
    no_profile = workout_active_calories(
        source_calories_total=700, duration_seconds=3600, relish_bmr_per_day=None, source_bmr_calories=90
    )
    assert (no_profile.active_calories, no_profile.basis) == (610, "source_bmr")
    bare = workout_active_calories(source_calories_total=700, duration_seconds=3600, relish_bmr_per_day=None)
    assert (bare.active_calories, bare.basis) == (700, "total")


def test_never_negative():
    counted = workout_active_calories(source_calories_total=20, duration_seconds=3600, relish_bmr_per_day=1800)
    assert counted.active_calories == 0


def test_relish_bmr_needs_body_details_and_uses_the_days_weight():
    profile = {"sex": "male", "age_years": 41, "height_cm": 170.2, "current_weight_lbs": 180}
    assert relish_bmr_for(profile, None) == pytest.approx(
        resting_energy(sex="male", age_years=41, height_cm=170.2, current_weight_lbs=180)
    )
    assert relish_bmr_for(profile, 170) < relish_bmr_for(profile, None)
    assert relish_bmr_for({"sex": "male"}, 180) is None
    assert relish_bmr_for(None, 180) is None


def test_intensity_from_active_calories_per_minute():
    assert intensity_for(600, 3600) == "High"
    assert intensity_for(300, 3600) == "Moderate"
    assert intensity_for(100, 3600) == "Low"


def _onboard(repository, user_id="u1", weight=180.0):
    repository.ensure_user_identity(user_id=user_id, email=f"{user_id}@example.com")
    repository.save_user_onboarding(
        user_id=user_id, sex="male", age_years=41, height_cm=170.2, current_weight_lbs=weight,
        goal_type="lose", goal_pace="recommended", target_weight_lbs=170, activity_level="sedentary",
        dietary_pattern="omnivore", nutrition_style="balanced", allergy_notes=None, bmr_calories=1700,
        tdee_calories=2040, initial_calorie_target=1540, protein_target_g=150, carbs_target_g=120,
        fat_target_g=50, fiber_target_g=25, calculation_version="v3", target_source="calculated",
    )


def _ride(source_id="111", calories=700.0, bmr=95.0):
    return ImportedWorkout(
        source="garmin", source_id=source_id, title="Indoor Cycling", activity_type="indoor_cycling",
        started_local=datetime(2026, 11, 15, 18, 5), started_at_utc="2026-11-16T00:05:00Z",
        duration_seconds=3600, distance_m=None, calories_total=calories, bmr_calories=bmr,
        raw={"activityId": int(source_id), "calories": calories, "bmrCalories": bmr},
    )


def test_import_freezes_relish_numbers_and_keeps_the_source_record(repository):
    _onboard(repository)
    repository.record_weight_entry(user_id="u1", recorded_at=date(2026, 11, 14), weight_lbs=176)
    repository.record_weight_entry(user_id="u1", recorded_at=date(2026, 11, 20), weight_lbs=170)

    outcome, entry = save_imported_workout(repository, "u1", _ride())
    bmr = resting_energy(sex="male", age_years=41, height_cm=170.2, current_weight_lbs=176)
    assert outcome == "created"
    assert entry.source == "garmin" and entry.source_id == "111"
    assert entry.logged_on == date(2026, 11, 15) and entry.logged_at == "6:05 PM"
    assert entry.source_calories_total == 700 and entry.source_bmr_calories == 95
    assert entry.relish_resting_calories == round(bmr / 24)
    assert entry.calories_burned == 700 - round(bmr / 24)
    assert entry.weight_lbs_at_time == 176  # the weigh-in before the ride, not a later one
    assert entry.calc_version == "w1:relish_bmr"
    record = repository.get_exercise_source_record(user_id="u1", exercise_entry_id=entry.id)
    assert '"bmrCalories":95.0' in record["payload_json"]


def test_resync_does_not_duplicate_or_rewrite(repository):
    _onboard(repository)
    _, first = save_imported_workout(repository, "u1", _ride())
    repository.record_weight_entry(user_id="u1", recorded_at=date(2026, 11, 15), weight_lbs=150)
    outcome, again = save_imported_workout(repository, "u1", _ride(calories=720.0))
    assert outcome == "unchanged"
    assert again.id == first.id and again.calories_burned == first.calories_burned
    assert len(repository.list_exercise_entries("u1")) == 1
    record = repository.get_exercise_source_record(user_id="u1", exercise_entry_id=first.id)
    assert '"calories":720' in record["payload_json"]  # the original record is refreshed


def test_a_deleted_import_stays_deleted(repository):
    _onboard(repository)
    _, entry = save_imported_workout(repository, "u1", _ride())
    assert repository.delete_exercise_entry(user_id="u1", exercise_entry_id=entry.id)
    outcome, again = save_imported_workout(repository, "u1", _ride())
    assert (outcome, again) == ("deleted", None)
    assert repository.list_exercise_entries("u1") == []


def test_without_a_profile_the_sources_resting_estimate_is_used(repository):
    repository.ensure_user_identity(user_id="u2", email="u2@example.com")
    _, entry = save_imported_workout(repository, "u2", _ride())
    assert entry.calories_burned == 605
    assert entry.relish_resting_calories is None and entry.weight_lbs_at_time is None
    assert entry.calc_version == "w1:source_bmr"


def test_same_activity_id_for_two_users_is_two_workouts(repository):
    _onboard(repository, "u1")
    _onboard(repository, "u3")
    save_imported_workout(repository, "u1", _ride())
    outcome, _ = save_imported_workout(repository, "u3", _ride())
    assert outcome == "created"


def test_manual_workouts_default_to_manual(repository):
    _onboard(repository)
    entry_id = repository.create_exercise_entry(
        user_id="u1", title="Walk", duration_minutes=30, calories_burned=120,
        logged_on=date(2026, 11, 15), logged_at="7:00 AM", intensity="Low",
    )
    assert repository.get_exercise_entry(entry_id)["source"] == "manual"
