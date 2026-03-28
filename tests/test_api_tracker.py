import pytest


@pytest.mark.asyncio
async def test_tracker_persists_exercise_meal_plan_and_meal_prep(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "tracker@example.com", "display_name": "Tracker"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    exercise_response = await client.post(
        "/api/tracker/exercise",
        headers=headers,
        json={
            "title": "Incline walk",
            "duration_minutes": 35,
            "calories_burned": 240,
            "logged_on": "2026-03-28",
            "logged_at": "07:15",
            "intensity": "Moderate",
        },
    )
    assert exercise_response.status_code == 200
    exercise = exercise_response.json()
    assert exercise["title"] == "Incline walk"

    exercise_list_response = await client.get("/api/tracker/exercise", headers=headers)
    assert exercise_list_response.status_code == 200
    exercise_entries = exercise_list_response.json()
    assert len(exercise_entries) == 1
    assert exercise_entries[0]["id"] == exercise["id"]

    meal_plan_response = await client.post(
        "/api/tracker/meal-plan",
        headers=headers,
        json={
            "plan_date": "2026-03-31",
            "label": "Tue",
            "focus": "Training day",
            "slots": [
                {
                    "meal_label": "Breakfast",
                    "title": "Greek yogurt + berries",
                    "calories": 320,
                    "prep_status": "Prepped",
                },
                {
                    "meal_label": "Lunch",
                    "title": "Chicken rice bowl",
                    "calories": 610,
                    "prep_status": "Needs prep",
                },
            ],
        },
    )
    assert meal_plan_response.status_code == 200
    meal_plan_day = meal_plan_response.json()
    assert len(meal_plan_day["slots"]) == 2

    meal_plan_list_response = await client.get("/api/tracker/meal-plan", headers=headers)
    assert meal_plan_list_response.status_code == 200
    meal_plan_days = meal_plan_list_response.json()
    assert len(meal_plan_days) == 1
    assert meal_plan_days[0]["id"] == meal_plan_day["id"]

    meal_prep_response = await client.post(
        "/api/tracker/meal-prep",
        headers=headers,
        json={
            "title": "Bake chicken breast",
            "category": "Protein",
            "portions": "8 portions",
            "status": "Queued",
            "scheduled_for": "2026-03-30",
        },
    )
    assert meal_prep_response.status_code == 200
    meal_prep_task = meal_prep_response.json()
    assert meal_prep_task["status"] == "Queued"

    update_response = await client.patch(
        f"/api/tracker/meal-prep/{meal_prep_task['id']}",
        headers=headers,
        json={"status": "Done"},
    )
    assert update_response.status_code == 200
    updated_task = update_response.json()
    assert updated_task["status"] == "Done"

    meal_prep_list_response = await client.get("/api/tracker/meal-prep", headers=headers)
    assert meal_prep_list_response.status_code == 200
    meal_prep_tasks = meal_prep_list_response.json()
    assert len(meal_prep_tasks) == 1
    assert meal_prep_tasks[0]["status"] == "Done"
