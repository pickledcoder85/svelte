"""Profile > Reset profile: setup runs again, nothing else is lost."""

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
