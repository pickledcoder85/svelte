"""Workouts added by hand: MET estimates, or a watch total minus Relish's resting calories."""

from datetime import date

import pytest

from backend.app.services.calculations.met import active_calories, met_for
from backend.app.services.manual_workout import (
    ManualWorkoutRequest,
    WorkoutEstimateRequest,
    estimate_workout,
    save_manual_workout,
)
from tests.test_meal_suggest import _onboard

DAY = date(2026, 11, 16)


@pytest.mark.parametrize(
    "activity, effort, minutes, distance_m, met, basis",
    [
        ("run", "moderate", 30, None, 9.8, "effort"),
        ("run", "easy", 30, 4830, 9.8, "pace"),  # 3 mi in 30 min = 6 mph: the pace wins over the effort
        ("walk", "hard", 60, 4830, 3.5, "pace"),  # 3 mph
        ("bike", "moderate", 60, 24140, 10.0, "pace"),  # 15 mph
        ("bike", "moderate", 10, 50000, 7.5, "effort"),  # 186 mph: a typo, so the effort is used
        ("swim", "hard", 45, 1500, 9.8, "effort"),  # no speed table for swimming
        ("strength", "easy", 40, None, 3.5, "effort"),
        ("other", "moderate", 20, None, 4.5, "effort"),
    ],
)
def test_met_by_effort_or_pace(activity, effort, minutes, distance_m, met, basis):
    assert met_for(activity, effort, minutes, distance_m) == (met, basis)


def test_active_calories_leave_out_resting():
    # (9.8 − 1) × 81.6 kg × 0.5 h ≈ 359
    assert active_calories(9.8, 180, 30) == 359
    assert active_calories(1.0, 180, 60) == 0


def test_estimate_uses_the_weight_on_that_day(repository):
    _onboard(repository)
    repository.record_weight_entry(user_id="u1", recorded_at=DAY, weight_lbs=200)
    estimate = estimate_workout(repository, "u1", WorkoutEstimateRequest(activity="run", duration_minutes=30, effort="moderate", logged_on=DAY))
    assert (estimate.weight_lbs, estimate.weight_known, estimate.active_calories) == (200, True, 399)


def test_estimate_without_any_weight_says_so(repository):
    repository.ensure_user_identity(user_id="u2", email="u2@example.com")
    estimate = estimate_workout(repository, "u2", WorkoutEstimateRequest(activity="walk", duration_minutes=60, logged_on=DAY))
    assert estimate.weight_known is False and estimate.active_calories > 0


def test_saving_an_estimate_records_how_it_was_counted(repository):
    _onboard(repository)
    entry = save_manual_workout(repository, "u1", ManualWorkoutRequest(
        activity="run", duration_minutes=30, effort="hard", distance_m=None, logged_on=DAY, logged_at="7:05 AM"))
    assert entry.title == "Run" and entry.source == "manual" and entry.activity_type == "run"
    assert entry.calories_method == "estimated" and entry.met == 11.5 and entry.intensity == "High"
    assert entry.calories_burned == active_calories(11.5, 180, 30)
    assert entry.calc_version == "met1:effort"


def test_a_watch_total_has_relish_resting_calories_removed(repository):
    _onboard(repository)
    entry = save_manual_workout(repository, "u1", ManualWorkoutRequest(
        activity="bike", duration_minutes=60, title="Hill ride", logged_on=DAY, logged_at="6:00 PM", device_calories_total=700))
    assert entry.title == "Hill ride" and entry.calories_method == "device"
    assert entry.source_calories_total == 700
    assert entry.relish_resting_calories and 60 < entry.relish_resting_calories < 90  # about an hour of BMR
    assert entry.calories_burned == 700 - entry.relish_resting_calories


@pytest.mark.asyncio
async def test_workout_routes(client, auth_headers):
    preview = await client.post("/api/tracker/workouts/estimate", headers=auth_headers,
                                json={"activity": "swim", "duration_minutes": 45, "effort": "moderate", "logged_on": "2026-11-16"})
    assert preview.status_code == 200 and preview.json()["met"] == 8.3
    saved = await client.post("/api/tracker/workouts", headers=auth_headers,
                              json={"activity": "swim", "duration_minutes": 45, "effort": "moderate", "logged_on": "2026-11-16", "logged_at": "12:00 PM"})
    assert saved.status_code == 200 and saved.json()["calories_burned"] == preview.json()["active_calories"]
    listed = (await client.get("/api/tracker/exercise", headers=auth_headers)).json()
    assert any(entry["calories_method"] == "estimated" for entry in listed)
    bad = await client.post("/api/tracker/workouts", headers=auth_headers,
                            json={"activity": "skydive", "duration_minutes": 45, "logged_on": "2026-11-16", "logged_at": "1:00 PM"})
    assert bad.status_code == 422
