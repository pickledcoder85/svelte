from datetime import date

import pytest


@pytest.mark.asyncio
async def test_weekly_metrics_endpoint_uses_persisted_user_activity(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "weekly@example.com", "display_name": "Weekly User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]

    repository.save_user_goal(
        user_id=session["user_id"],
        effective_at=date(2026, 3, 23),
        calorie_goal=14000,
        protein_goal=900,
        carbs_goal=1200,
        fat_goal=400,
        target_weight_lbs=178.5,
    )
    log_id = repository.create_food_log(
        user_id=session["user_id"],
        log_date=date(2026, 3, 24),
        notes="Breakfast log",
    )
    repository.add_food_log_entry(
        food_log_id=log_id,
        calories=311.2,
        protein=13.5,
        carbs=53.0,
        fat=5.5,
        grams=80,
        servings=1,
        food_item_id="food-oats",
        entry_type="food",
    )
    repository.record_weight_entry(user_id=session["user_id"], recorded_at=date(2026, 3, 24), weight_lbs=180)
    repository.record_weight_entry(user_id=session["user_id"], recorded_at=date(2026, 3, 27), weight_lbs=178.8)

    response = await client.get(
        "/api/nutrition/weekly-metrics",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["calorie_goal"] == 14000
    assert body["calories_consumed"] == 311
    assert body["macro_consumed"] == {"protein": 13.5, "carbs": 53.0, "fat": 5.5}
    assert body["weekly_weight_change"] == -1.2
    assert body["adherence_score"] == 2


@pytest.mark.asyncio
async def test_weekly_metrics_uses_persisted_user_context(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "context@example.com", "display_name": "Context User"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    user_id = session["user_id"]

    repository.save_user_goal(
        user_id=user_id,
        effective_at=date(2026, 3, 23),
        calorie_goal=14000,
        protein_goal=900,
        carbs_goal=1200,
        fat_goal=400,
    )

    log_id = repository.create_food_log(
        user_id=user_id,
        log_date=date(2026, 3, 24),
        notes="Breakfast log",
    )
    repository.add_food_log_entry(
        food_log_id=log_id,
        calories=311.2,
        protein=13.5,
        carbs=53.0,
        fat=5.5,
        grams=80,
        servings=1,
        food_item_id="food-oats",
    )
    repository.record_weight_entry(user_id=user_id, recorded_at=date(2026, 3, 24), weight_lbs=180)
    repository.record_weight_entry(user_id=user_id, recorded_at=date(2026, 3, 27), weight_lbs=178.8)

    response = await client.get(
        "/api/nutrition/weekly-metrics?week_start=2026-03-23&week_end=2026-03-29",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["calorie_goal"] == 14000
    assert body["calories_consumed"] == 311
    assert body["macro_consumed"] == {"protein": 13.5, "carbs": 53.0, "fat": 5.5}
    assert body["weekly_weight_change"] == -1.2
