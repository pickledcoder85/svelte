from datetime import date

import pytest


@pytest.mark.asyncio
async def test_profile_dashboard_summary_combines_progress_and_weight_history(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "dashboard@example.com", "display_name": "Dashboard User"},
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

    await client.post(
        "/api/profile/weights",
        headers=headers,
        json={"recorded_at": "2026-03-24", "weight_lbs": 180.0},
    )
    await client.post(
        "/api/profile/weights",
        headers=headers,
        json={"recorded_at": "2026-03-27", "weight_lbs": 178.8},
    )

    log_id = repository.create_food_log(
        user_id=session["user_id"],
        log_date=date(2026, 3, 24),
        notes="Breakfast",
    )
    repository.add_food_log_entry(
        food_log_id=log_id,
        entry_type="food",
        food_item_id="food-oats",
        calories=311.2,
        protein=13.5,
        carbs=53.0,
        fat=5.5,
        grams=80,
    )

    response = await client.get(
        "/api/profile/dashboard?week_start=2026-03-23&week_end=2026-03-29",
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["progress"]["user_id"] == session["user_id"]
    assert body["progress"]["display_name"] == "Dashboard User"
    assert body["progress"]["current_weight_lbs"] == 178.8
    assert body["progress"]["start_weight_lbs"] == 180.0
    assert body["progress"]["target_weight_lbs"] == 178.5
    assert body["progress"]["weekly_weight_change"] == -1.2
    assert body["progress"]["weight_entries"] == 2
    assert body["progress"]["calorie_goal"] == 2100
    assert body["progress"]["calories_consumed"] == 311
    assert body["progress"]["adherence_score"] == 15

    assert body["weekly_metrics"]["calorie_goal"] == 2100
    assert body["weekly_metrics"]["calories_consumed"] == 311
    assert body["weekly_metrics"]["macro_targets"] == {"protein": 180.0, "carbs": 190.0, "fat": 60.0}
    assert body["weekly_metrics"]["macro_consumed"] == {"protein": 13.5, "carbs": 53.0, "fat": 5.5}

    weight_history = body["weight_history"]
    assert weight_history["entry_count"] == 2
    assert weight_history["current_weight_lbs"] == 178.8
    assert weight_history["start_weight_lbs"] == 180.0
    assert weight_history["change_from_start_lbs"] == -1.2
    assert weight_history["latest_recorded_at"] == "2026-03-27"
    assert [entry["recorded_at"] for entry in weight_history["recent_entries"]] == [
        "2026-03-24",
        "2026-03-27",
    ]
