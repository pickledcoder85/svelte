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
        },
    )
    assert onboarding_response.status_code == 200
    onboarding = onboarding_response.json()
    assert onboarding["setup_complete"] is True
    assert onboarding["setup_completed_at"] is not None
    assert onboarding["sex"] == "male"
    assert onboarding["goal_type"] == "lose"
    assert onboarding["bmr_calories"] == 1887
    assert onboarding["tdee_calories"] == 2925
    assert onboarding["initial_calorie_target"] == 2425

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
    assert goals[0]["calorie_goal"] == 2425
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
        },
    )
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "User onboarding is already complete."
