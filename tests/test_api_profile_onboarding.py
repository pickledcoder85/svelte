import pytest


@pytest.mark.asyncio
async def test_profile_onboarding_completes_first_run_profile(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "onboarding@example.com", "display_name": "Onboard User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    initial_profile = await client.get("/api/profile", headers=headers)
    assert initial_profile.status_code == 200
    assert initial_profile.json()["setup_complete"] is False

    onboarding_response = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={
            "sex": "male",
            "age_years": 30,
            "height_cm": 180,
            "current_weight_lbs": 200,
            "goal_type": "lose",
            "target_weight_lbs": 185,
            "activity_level": "moderate",
            "dietary_pattern": "omnivore",
            "nutrition_style": "balanced",
        },
    )
    assert onboarding_response.status_code == 200
    onboarding = onboarding_response.json()
    assert onboarding["setup_complete"] is True
    assert onboarding["setup_completed_at"] is not None
    assert onboarding["sex"] == "male"
    assert onboarding["goal_type"] == "lose"
    assert onboarding["bmr_calories"] == 1890
    assert onboarding["tdee_calories"] == 2740
    assert onboarding["initial_calorie_target"] == 2240

    profile_response = await client.get("/api/profile", headers=headers)
    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["setup_complete"] is True
    assert profile["current_weight_lbs"] == 200
    assert profile["activity_level"] == "moderate"

    goals_response = await client.get("/api/profile/goals", headers=headers)
    assert goals_response.status_code == 200
    goals = goals_response.json()
    assert len(goals) == 1
    assert goals[0]["calorie_goal"] == 2240
    assert goals[0]["protein_goal"] == 163.0
    assert goals[0]["carbs_goal"] == 257.0
    assert goals[0]["fat_goal"] == 62.0
    assert goals[0]["target_weight_lbs"] == 185


@pytest.mark.asyncio
async def test_completed_profile_cannot_onboard_again(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "repeat@example.com", "display_name": "Repeat User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    first_response = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={
            "sex": "female",
            "age_years": 32,
            "height_cm": 168,
            "current_weight_lbs": 150,
            "goal_type": "maintain",
            "target_weight_lbs": 150,
            "activity_level": "light",
            "dietary_pattern": "omnivore",
            "nutrition_style": "balanced",
        },
    )
    assert first_response.status_code == 200

    second_response = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={
            "sex": "female",
            "age_years": 32,
            "height_cm": 168,
            "current_weight_lbs": 150,
            "goal_type": "maintain",
            "target_weight_lbs": 150,
            "activity_level": "light",
            "dietary_pattern": "omnivore",
            "nutrition_style": "balanced",
        },
    )
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "User onboarding is already complete."


@pytest.mark.asyncio
async def test_onboarding_creates_no_sample_plans(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "starter@example.com", "display_name": "Starter User"},
    )
    headers = {"Authorization": f"Bearer {session_response.json()['session']['access_token']}"}
    onboarding_response = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={
            "sex": "female", "age_years": 35, "height_cm": 165, "current_weight_lbs": 150,
            "goal_type": "maintain", "target_weight_lbs": 150, "activity_level": "moderate",
            "dietary_pattern": "omnivore", "nutrition_style": "balanced",
        },
    )
    assert onboarding_response.status_code == 200
    assert (await client.get("/api/tracker/planned-workout-sessions", headers=headers)).json() == []
    assert (await client.get("/api/tracker/planned-exercise", headers=headers)).json() == []
    assert (await client.get("/api/tracker/meal-plan", headers=headers)).json() == []
    # Later loads don't create them either.
    assert (await client.get("/api/profile", headers=headers)).status_code == 200
    assert (await client.get("/api/tracker/meal-plan", headers=headers)).json() == []


ONBOARDING_BODY = {
    "sex": "female",
    "age_years": 35,
    "height_cm": 165,
    "current_weight_lbs": 150,
    "goal_type": "maintain",
    "target_weight_lbs": 150,
    "activity_level": "moderate",
    "dietary_pattern": "omnivore",
    "nutrition_style": "balanced",
}


async def _headers(client, email: str) -> dict[str, str]:
    response = await client.post("/api/auth/session", json={"email": email, "display_name": "Setup"})
    return {"Authorization": f"Bearer {response.json()['session']['access_token']}"}


@pytest.mark.asyncio
async def test_onboarding_saves_unit_and_timezone_preferences(client):
    headers = await _headers(client, "metric@example.com")
    response = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={**ONBOARDING_BODY, "units": "metric", "timezone": "Europe/Berlin"},
    )
    assert response.status_code == 200
    assert (response.json()["units"], response.json()["timezone"]) == ("metric", "Europe/Berlin")
    profile = (await client.get("/api/profile", headers=headers)).json()
    assert (profile["units"], profile["timezone"]) == ("metric", "Europe/Berlin")


@pytest.mark.asyncio
async def test_onboarding_without_preferences_keeps_defaults(client):
    headers = await _headers(client, "defaults@example.com")
    response = await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)
    assert response.status_code == 200
    assert (response.json()["units"], response.json()["timezone"]) == ("imperial", "UTC")


@pytest.mark.asyncio
async def test_onboarding_rejects_unknown_units_but_ignores_unknown_timezones(client):
    headers = await _headers(client, "bad@example.com")
    bad_units = await client.post(
        "/api/profile/onboarding", headers=headers, json={**ONBOARDING_BODY, "units": "stones"}
    )
    assert bad_units.status_code == 422
    # An odd device timezone must not block setup; the profile keeps UTC.
    odd_zone = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={**ONBOARDING_BODY, "units": "metric", "timezone": "Mars/Olympus"},
    )
    assert odd_zone.status_code == 200
    assert (odd_zone.json()["units"], odd_zone.json()["timezone"]) == ("metric", "UTC")


@pytest.mark.asyncio
async def test_onboarding_saves_the_name_from_setup(client):
    headers = await _headers(client, "named@example.com")
    response = await client.post(
        "/api/profile/onboarding", headers=headers, json={**ONBOARDING_BODY, "display_name": "  Brian  "}
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Brian"
    # Blank keeps the signed-in name.
    other = await _headers(client, "blank@example.com")
    kept = await client.post("/api/profile/onboarding", headers=other, json={**ONBOARDING_BODY, "display_name": " "})
    assert kept.json()["display_name"] == "Setup"


@pytest.mark.asyncio
@pytest.mark.parametrize("style", ["high_protein", "low_carb", "paleo"])
async def test_onboarding_accepts_the_newer_nutrition_styles(client, style):
    headers = await _headers(client, f"{style}@example.com")
    response = await client.post("/api/profile/onboarding", headers=headers, json={**ONBOARDING_BODY, "nutrition_style": style})
    assert response.status_code == 200
    assert response.json()["nutrition_style"] == style
