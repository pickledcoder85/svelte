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
