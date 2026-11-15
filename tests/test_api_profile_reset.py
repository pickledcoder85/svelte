"""Profile > Reset profile: setup runs again, nothing else is lost."""

from datetime import date

import pytest

from tests.test_api_profile_onboarding import ONBOARDING_BODY, _headers


@pytest.mark.asyncio
async def test_reset_profile_reopens_setup_and_keeps_history(client):
    headers = await _headers(client, "reset@example.com")
    first = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={**ONBOARDING_BODY, "units": "metric", "timezone": "Europe/Berlin"},
    )
    assert first.status_code == 200
    weight = await client.post(
        "/api/profile/weights", headers=headers, json={"recorded_at": "2026-11-14", "weight_lbs": 199.5}
    )
    assert weight.status_code == 200

    reset = await client.post("/api/profile/setup/reset", headers=headers)
    assert reset.status_code == 200
    profile = reset.json()
    assert profile["setup_complete"] is False
    assert profile["setup_completed_at"] is None
    for field in ("sex", "age_years", "height_cm", "current_weight_lbs", "goal_type", "goal_pace",
                  "target_weight_lbs", "activity_level", "bmr_calories", "initial_calorie_target"):
        assert profile[field] is None, field
    # Preferences and everything outside the setup answers stay.
    assert (profile["units"], profile["timezone"]) == ("metric", "Europe/Berlin")
    assert len((await client.get("/api/profile/weights", headers=headers)).json()) == 1
    assert len((await client.get("/api/profile/goals", headers=headers)).json()) == 1

    # Setup can be completed again, which adds a new dated goal.
    again = await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)
    assert again.status_code == 200
    assert again.json()["setup_complete"] is True
    assert len((await client.get("/api/profile/goals", headers=headers)).json()) == 2


@pytest.mark.asyncio
async def test_reset_profile_needs_a_session(client):
    response = await client.post("/api/profile/setup/reset")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_settings_save_changes_preferences_without_recalculating_targets(client):
    headers = await _headers(client, "settings@example.com")
    assert (await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)).status_code == 200
    before = (await client.get("/api/profile", headers=headers)).json()

    response = await client.put(
        "/api/profile",
        headers=headers,
        json={"display_name": "Pickle Fan", "timezone": "America/Chicago", "units": "metric"},
    )

    assert response.status_code == 200
    after = response.json()
    assert (after["display_name"], after["timezone"], after["units"]) == ("Pickle Fan", "America/Chicago", "metric")
    assert after["initial_calorie_target"] == before["initial_calorie_target"]
    assert after["current_weight_lbs"] == before["current_weight_lbs"]
    assert len((await client.get("/api/profile/goals", headers=headers)).json()) == 1


@pytest.mark.asyncio
async def test_workout_calories_share_defaults_to_75_and_saves_without_recalculating(client):
    headers = await _headers(client, "share@example.com")
    done = (await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)).json()
    assert done["workout_calories_share"] == 75

    saved = await client.put(
        "/api/profile",
        headers=headers,
        json={"timezone": done["timezone"], "units": done["units"], "workout_calories_share": 50},
    )
    assert saved.status_code == 200
    assert saved.json()["workout_calories_share"] == 50
    assert saved.json()["initial_calorie_target"] == done["initial_calorie_target"]
    assert len((await client.get("/api/profile/goals", headers=headers)).json()) == 1

    bad = await client.put(
        "/api/profile",
        headers=headers,
        json={"timezone": done["timezone"], "units": done["units"], "workout_calories_share": 60},
    )
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_workout_calories_share_rejects_booleans(client):
    headers = await _headers(client, "strict@example.com")
    done = (await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)).json()
    response = await client.put(
        "/api/profile",
        headers=headers,
        json={"timezone": done["timezone"], "units": done["units"], "workout_calories_share": False},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_eating_preferences_save_without_recalculating_or_replacing_a_custom_goal(client):
    headers = await _headers(client, "eating@example.com")
    done = (await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)).json()
    custom = await client.post(
        "/api/profile/goals",
        headers=headers,
        json={"effective_at": date.today().isoformat(), "calorie_goal": 2000, "protein_goal": 150, "carbs_goal": 200, "fat_goal": 60},
    )
    assert custom.status_code in (200, 201)

    saved = await client.put(
        "/api/profile",
        headers=headers,
        json={
            "timezone": done["timezone"],
            "units": done["units"],
            "dietary_pattern": "vegetarian",
            "nutrition_style": "mediterranean",
            "allergy_notes": "peanut, sesame",
        },
    )
    assert saved.status_code == 200
    profile = saved.json()
    assert (profile["dietary_pattern"], profile["nutrition_style"], profile["allergy_notes"]) == (
        "vegetarian",
        "mediterranean",
        "peanut, sesame",
    )
    goals = (await client.get("/api/profile/goals", headers=headers)).json()
    assert len(goals) == 2
    assert goals[0]["calorie_goal"] == 2000
    assert goals[0]["target_source"] == "user_custom"
