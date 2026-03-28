import pytest


@pytest.mark.asyncio
async def test_weight_history_and_progress_are_persisted(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "weight@example.com", "display_name": "Weight User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    goal_response = await client.post(
        "/api/profile/goals",
        headers=headers,
        json={
            "effective_at": "2026-03-23",
            "calorie_goal": 2100,
            "protein_goal": 180,
            "carbs_goal": 190,
            "fat_goal": 60,
            "target_weight_lbs": 178.5,
        },
    )
    assert goal_response.status_code == 200

    first_weight_response = await client.post(
        "/api/profile/weights",
        headers=headers,
        json={"recorded_at": "2026-03-24", "weight_lbs": 180},
    )
    assert first_weight_response.status_code == 200
    assert first_weight_response.json()["weight_lbs"] == 180

    second_weight_response = await client.post(
        "/api/profile/weights",
        headers=headers,
        json={"recorded_at": "2026-03-27", "weight_lbs": 178.8},
    )
    assert second_weight_response.status_code == 200
    assert second_weight_response.json()["weight_lbs"] == 178.8

    weights_response = await client.get("/api/profile/weights", headers=headers)
    assert weights_response.status_code == 200
    weights = weights_response.json()
    assert len(weights) == 2
    assert weights[0]["recorded_at"] == "2026-03-24"
    assert weights[1]["recorded_at"] == "2026-03-27"

    log_response = await client.post(
        "/api/nutrition/logs",
        headers=headers,
        json={"log_date": "2026-03-24", "notes": "Breakfast"},
    )
    assert log_response.status_code == 200
    food_log = log_response.json()

    entry_response = await client.post(
        f"/api/nutrition/logs/{food_log['id']}/entries",
        headers=headers,
        json={
            "entry_type": "food",
            "food_item_id": "food-oats",
            "grams": 80,
            "servings": 1,
            "calories": 311.2,
            "protein": 13.5,
            "carbs": 53.0,
            "fat": 5.5,
        },
    )
    assert entry_response.status_code == 200

    progress_response = await client.get("/api/profile/progress", headers=headers)
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["current_weight_lbs"] == 178.8
    assert progress["start_weight_lbs"] == 180.0
    assert progress["target_weight_lbs"] == 178.5
    assert progress["weekly_weight_change"] == -1.2
    assert progress["weight_entries"] == 2
    assert progress["calorie_goal"] == 2100
    assert progress["calories_consumed"] == 311
    assert progress["adherence_score"] == 15
