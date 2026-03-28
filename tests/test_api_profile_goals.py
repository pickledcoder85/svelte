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
