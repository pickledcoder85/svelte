from datetime import date

import pytest


@pytest.mark.asyncio
async def test_food_log_create_read_and_weekly_metrics(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "logger@example.com", "display_name": "Logger"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    repository.save_user_goal(
        user_id=session["user_id"],
        effective_at=date(2026, 3, 23),
        calorie_goal=14000,
        protein_goal=900,
        carbs_goal=1200,
        fat_goal=400,
    )

    create_response = await client.post(
        "/api/nutrition/logs",
        headers=headers,
        json={"log_date": "2026-03-24", "notes": "Breakfast log"},
    )
    assert create_response.status_code == 200
    food_log = create_response.json()
    assert food_log["user_id"] == session["user_id"]
    assert food_log["log_date"] == "2026-03-24"
    assert food_log["entries"] == []

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
    updated_log = entry_response.json()
    assert len(updated_log["entries"]) == 1
    assert updated_log["entries"][0]["calories"] == 311.2

    list_response = await client.get(
        "/api/nutrition/logs?week_start=2026-03-23&week_end=2026-03-29",
        headers=headers,
    )
    assert list_response.status_code == 200
    logs = list_response.json()
    assert len(logs) == 1
    assert logs[0]["id"] == food_log["id"]
    assert logs[0]["entries"][0]["food_item_id"] == "food-oats"

    read_response = await client.get(f"/api/nutrition/logs/{food_log['id']}", headers=headers)
    assert read_response.status_code == 200
    read_log = read_response.json()
    assert read_log["entries"][0]["id"] == updated_log["entries"][0]["id"]

    entries_response = await client.get(
        f"/api/nutrition/logs/{food_log['id']}/entries",
        headers=headers,
    )
    assert entries_response.status_code == 200
    entries = entries_response.json()
    assert len(entries) == 1

    weekly_response = await client.get(
        "/api/nutrition/weekly-metrics?week_start=2026-03-23&week_end=2026-03-29",
        headers=headers,
    )
    assert weekly_response.status_code == 200
    weekly = weekly_response.json()
    assert weekly["calories_consumed"] == 311
    assert weekly["calorie_goal"] == 14000
