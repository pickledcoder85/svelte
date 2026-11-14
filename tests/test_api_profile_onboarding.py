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
    assert onboarding["bmr_calories"] == 1887
    assert onboarding["tdee_calories"] == 2736
    assert onboarding["initial_calorie_target"] == 2236

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
    assert goals[0]["calorie_goal"] == 2236
    assert goals[0]["protein_goal"] == 163.3
    assert goals[0]["carbs_goal"] == 256.0
    assert goals[0]["fat_goal"] == 62.1
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
async def test_onboarding_seeds_starter_plans_once_and_deletes_stick(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "starter@example.com", "display_name": "Starter User"},
    )
    assert session_response.status_code == 200
    headers = {"Authorization": f"Bearer {session_response.json()['session']['access_token']}"}

    onboarding_response = await client.post(
        "/api/profile/onboarding",
        headers=headers,
        json={
            "sex": "female",
            "age_years": 35,
            "height_cm": 165,
            "current_weight_lbs": 150,
            "goal_type": "maintain",
            "target_weight_lbs": 150,
            "activity_level": "moderate",
            "dietary_pattern": "omnivore",
            "nutrition_style": "balanced",
        },
    )
    assert onboarding_response.status_code == 200

    sessions_response = await client.get("/api/tracker/planned-workout-sessions", headers=headers)
    assert sessions_response.status_code == 200
    starter_sessions = sessions_response.json()
    assert len(starter_sessions) == 4

    for starter_session in starter_sessions:
        delete_response = await client.delete(
            f"/api/tracker/planned-workout-sessions/{starter_session['id']}",
            headers=headers,
        )
        assert delete_response.status_code == 204

    # Later profile loads, profile saves, and list calls must not regenerate starter plans.
    assert (await client.get("/api/profile", headers=headers)).status_code == 200
    assert (
        await client.put(
            "/api/profile",
            headers=headers,
            json={
                "display_name": "Starter User",
                "timezone": "America/Chicago",
                "units": "imperial",
            },
        )
    ).status_code == 200
    assert (await client.get("/api/tracker/planned-exercise", headers=headers)).json() == []
    assert (await client.get("/api/tracker/planned-workout-sessions", headers=headers)).json() == []

    meal_plan_before = (await client.get("/api/tracker/meal-plan", headers=headers)).json()
    assert len(meal_plan_before) >= 1
    assert (await client.get("/api/profile", headers=headers)).status_code == 200
    meal_plan_after = (await client.get("/api/tracker/meal-plan", headers=headers)).json()
    assert [day["id"] for day in meal_plan_after] == [day["id"] for day in meal_plan_before]
