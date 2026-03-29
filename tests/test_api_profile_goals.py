from datetime import date

import pytest


@pytest.mark.asyncio
async def test_profile_read_update_and_goal_lifecycle(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "profile@example.com", "display_name": "Profile User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    profile_response = await client.get("/api/profile", headers=headers)
    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["email"] == "profile@example.com"
    assert profile["display_name"] == "Profile User"
    assert profile["setup_completed_at"] is None

    update_response = await client.put(
        "/api/profile",
        headers=headers,
        json={
            "display_name": "Cut Phase",
            "timezone": "America/New_York",
            "units": "imperial",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["display_name"] == "Cut Phase"
    assert updated["timezone"] == "America/New_York"
    assert updated["setup_completed_at"] is not None

    goal_response = await client.post(
        "/api/profile/goals",
        headers=headers,
        json={
            "effective_at": "2026-03-30",
            "calorie_goal": 2100,
            "protein_goal": 180,
            "carbs_goal": 190,
            "fat_goal": 60,
            "target_weight_lbs": 178.5,
        },
    )
    assert goal_response.status_code == 200
    goal = goal_response.json()
    assert goal["calorie_goal"] == 2100
    assert goal["target_weight_lbs"] == 178.5

    list_response = await client.get("/api/profile/goals", headers=headers)
    assert list_response.status_code == 200
    goals = list_response.json()
    assert len(goals) == 1
    assert goals[0]["id"] == goal["id"]


@pytest.mark.asyncio
async def test_profile_update_recalculates_targets_and_appends_goal_history(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "editable@example.com", "display_name": "Editable User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

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

    update_response = await client.put(
        "/api/profile",
        headers=headers,
        json={
            "display_name": "Lean Bulk",
            "timezone": "America/New_York",
            "units": "imperial",
            "sex": "male",
            "age_years": 30,
            "height_cm": 180,
            "current_weight_lbs": 195,
            "goal_type": "gain",
            "target_weight_lbs": 205,
            "activity_level": "light",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["display_name"] == "Lean Bulk"
    assert updated["goal_type"] == "gain"
    assert updated["current_weight_lbs"] == 195
    assert updated["target_weight_lbs"] == 205
    assert updated["activity_level"] == "light"
    assert updated["bmr_calories"] == 1865
    assert updated["tdee_calories"] == 2424
    assert updated["initial_calorie_target"] == 2624

    goals_response = await client.get("/api/profile/goals", headers=headers)
    assert goals_response.status_code == 200
    goals = goals_response.json()
    assert len(goals) == 2
    assert goals[0]["calorie_goal"] == 2624
    assert goals[0]["protein_goal"] == 159.2
    assert goals[0]["carbs_goal"] == 332.8
    assert goals[0]["fat_goal"] == 72.9
    assert goals[0]["target_weight_lbs"] == 205
    assert goals[1]["calorie_goal"] == 2236


@pytest.mark.asyncio
async def test_profile_update_rejects_incomplete_recalculation_payload(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "incomplete@example.com", "display_name": "Incomplete User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    update_response = await client.put(
        "/api/profile",
        headers=headers,
        json={
            "display_name": "Incomplete User",
            "timezone": "UTC",
            "units": "imperial",
            "goal_type": "lose",
        },
    )
    assert update_response.status_code == 400
    assert "Profile recalculation requires" in update_response.json()["detail"]


@pytest.mark.asyncio
async def test_weight_history_and_progress(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "weight@example.com", "display_name": "Weight User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    repository.save_user_goal(
        user_id=session["user_id"],
        effective_at=date(2026, 3, 23),
        calorie_goal=2100,
        protein_goal=180,
        carbs_goal=190,
        fat_goal=60,
        target_weight_lbs=178.5,
    )

    first_response = await client.post(
        "/api/profile/weights",
        headers=headers,
        json={"recorded_at": "2026-03-24", "weight_lbs": 180.0},
    )
    assert first_response.status_code == 200
    second_response = await client.post(
        "/api/profile/weights",
        headers=headers,
        json={"recorded_at": "2026-03-27", "weight_lbs": 178.8},
    )
    assert second_response.status_code == 200

    list_response = await client.get("/api/profile/weights", headers=headers)
    assert list_response.status_code == 200
    weights = list_response.json()
    assert len(weights) == 2
    assert weights[0]["weight_lbs"] == 180.0

    progress_response = await client.get(
        "/api/profile/progress?week_start=2026-03-23&week_end=2026-03-29",
        headers=headers,
    )
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["current_weight_lbs"] == 178.8
    assert progress["start_weight_lbs"] == 180.0
    assert progress["target_weight_lbs"] == 178.5
    assert progress["weekly_weight_change"] == -1.2
    assert progress["weight_entries"] == 2
    assert progress["calorie_goal"] == 2100
