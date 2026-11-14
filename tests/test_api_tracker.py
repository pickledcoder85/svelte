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

    planned_exercise_response = await client.get("/api/tracker/planned-exercise", headers=headers)
    assert planned_exercise_response.status_code == 200
    planned_exercise_entries = planned_exercise_response.json()
    assert len(planned_exercise_entries) == 4
    assert planned_exercise_entries[0]["planned_on"] <= planned_exercise_entries[-1]["planned_on"]

    planned_workout_response = await client.get("/api/tracker/planned-workout-sessions", headers=headers)
    assert planned_workout_response.status_code == 200
    planned_workout_sessions = planned_workout_response.json()
    assert len(planned_workout_sessions) == 4
    assert planned_workout_sessions[0]["blocks"][0]["block_kind"] == "activity"

    create_planned_response = await client.post(
        "/api/tracker/planned-exercise",
        headers=headers,
        json={
            "title": "Lift",
            "duration_minutes": 45,
            "calories_burned": 300,
            "planned_on": "2026-04-05",
            "planned_at": "17:30",
            "intensity": "High",
        },
    )
    assert create_planned_response.status_code == 200
    created_planned = create_planned_response.json()
    assert created_planned["planned_on"] == "2026-04-05"

    update_planned_response = await client.put(
        f"/api/tracker/planned-exercise/{created_planned['id']}",
        headers=headers,
        json={
            "title": "Heavy lift",
            "duration_minutes": 50,
            "calories_burned": 340,
            "planned_on": "2026-04-06",
            "planned_at": "06:30",
            "intensity": "High",
        },
    )
    assert update_planned_response.status_code == 200
    updated_planned = update_planned_response.json()
    assert updated_planned["title"] == "Heavy lift"
    assert updated_planned["planned_on"] == "2026-04-06"

    complete_planned_response = await client.patch(
        f"/api/tracker/planned-exercise/{created_planned['id']}/completion",
        headers=headers,
        json={"completed_at": "2026-04-06T11:30:00Z"},
    )
    assert complete_planned_response.status_code == 200
    completed_planned = complete_planned_response.json()
    assert completed_planned["completed_at"] in {"2026-04-06T11:30:00Z", "2026-04-06T11:30:00+00:00"}
    assert completed_planned["completed_exercise_entry_id"] is not None

    completed_exercise_list_response = await client.get("/api/tracker/exercise", headers=headers)
    assert completed_exercise_list_response.status_code == 200
    completed_exercise_entries = completed_exercise_list_response.json()
    completed_entry = next(
        entry for entry in completed_exercise_entries if entry["id"] == completed_planned["completed_exercise_entry_id"]
    )
    assert completed_entry["title"] == "Heavy lift"
    assert completed_entry["logged_on"] == "2026-04-06"

    undo_complete_response = await client.patch(
        f"/api/tracker/planned-exercise/{created_planned['id']}/completion",
        headers=headers,
        json={"completed_at": None},
    )
    assert undo_complete_response.status_code == 200
    undone_planned = undo_complete_response.json()
    assert undone_planned["completed_at"] is None
    assert undone_planned["completed_exercise_entry_id"] is None

    delete_planned_response = await client.delete(
        f"/api/tracker/planned-exercise/{created_planned['id']}",
        headers=headers,
    )
    assert delete_planned_response.status_code == 204

    updated_planned_exercise_response = await client.get("/api/tracker/planned-exercise", headers=headers)
    assert updated_planned_exercise_response.status_code == 200
    updated_planned_entries = updated_planned_exercise_response.json()
    assert not any(entry["id"] == created_planned["id"] for entry in updated_planned_entries)

    create_structured_response = await client.post(
        "/api/tracker/planned-workout-sessions",
        headers=headers,
        json={
            "title": "Run workout",
            "workout_type": "run",
            "planned_on": "2026-04-07",
            "planned_at": "06:00",
            "notes": "Threshold focus",
            "estimated_calories_burned": 430,
            "blocks": [
                {
                    "block_kind": "warmup",
                    "title": "Warmup",
                    "segments": [
                        {
                            "segment_type": "time",
                            "title": "Easy jog",
                            "activity_type": "run",
                            "duration_minutes": 10,
                            "intensity": "Low",
                            "calories_estimate": 80,
                        }
                    ],
                },
                {
                    "block_kind": "activity",
                    "title": "Main set",
                    "segments": [
                        {
                            "segment_type": "distance",
                            "title": "Tempo interval",
                            "activity_type": "run",
                            "distance_value": 1.0,
                            "distance_unit": "mi",
                            "intensity": "High",
                            "calories_estimate": 250,
                        }
                    ],
                },
            ],
        },
    )
    assert create_structured_response.status_code == 200
    created_structured = create_structured_response.json()
    assert created_structured["workout_type"] == "run"
    assert len(created_structured["blocks"]) == 2

    update_structured_response = await client.put(
        f"/api/tracker/planned-workout-sessions/{created_structured['id']}",
        headers=headers,
        json={
            "title": "Run workout updated",
            "workout_type": "run",
            "planned_on": "2026-04-07",
            "planned_at": "06:15",
            "notes": "Threshold plus strides",
            "estimated_calories_burned": 460,
            "blocks": [
                {
                    "block_kind": "warmup",
                    "title": "Warmup",
                    "segments": [
                        {
                            "segment_type": "time",
                            "title": "Easy jog",
                            "activity_type": "run",
                            "duration_minutes": 12,
                            "intensity": "Low",
                            "calories_estimate": 90,
                        }
                    ],
                },
                {
                    "block_kind": "activity",
                    "title": "Main set",
                    "segments": [
                        {
                            "segment_type": "distance",
                            "title": "Tempo interval",
                            "activity_type": "run",
                            "distance_value": 1.2,
                            "distance_unit": "mi",
                            "intensity": "High",
                            "calories_estimate": 280,
                        },
                        {
                            "segment_type": "reps",
                            "title": "Strides",
                            "activity_type": "run",
                            "reps": 4,
                            "intensity": "Moderate",
                            "calories_estimate": 40,
                        }
                    ],
                },
                {
                    "block_kind": "cooldown",
                    "title": "Cooldown",
                    "segments": [
                        {
                            "segment_type": "time",
                            "title": "Walk",
                            "activity_type": "run",
                            "duration_minutes": 8,
                            "intensity": "Low",
                            "calories_estimate": 50,
                        }
                    ],
                },
            ],
        },
    )
    assert update_structured_response.status_code == 200
    updated_structured = update_structured_response.json()
    assert updated_structured["planned_at"] == "06:15"
    assert len(updated_structured["blocks"]) == 3

    complete_structured_response = await client.patch(
        f"/api/tracker/planned-workout-sessions/{created_structured['id']}/completion",
        headers=headers,
        json={"completed_at": "2026-04-07T11:45:00Z"},
    )
    assert complete_structured_response.status_code == 200
    completed_structured = complete_structured_response.json()
    assert completed_structured["status"] == "completed"
    assert completed_structured["completed_exercise_entry_id"] is not None

    exercise_entries_response = await client.get("/api/tracker/exercise", headers=headers)
    assert exercise_entries_response.status_code == 200
    exercise_entries_after_structured = exercise_entries_response.json()
    assert any(entry["id"] == completed_structured["completed_exercise_entry_id"] for entry in exercise_entries_after_structured)

    delete_structured_response = await client.delete(
        f"/api/tracker/planned-workout-sessions/{created_structured['id']}",
        headers=headers,
    )
    assert delete_structured_response.status_code == 204

    sessions_after_delete_response = await client.get(
        "/api/tracker/planned-workout-sessions",
        headers=headers,
    )
    assert sessions_after_delete_response.status_code == 200
    assert not any(
        session["id"] == created_structured["id"]
        for session in sessions_after_delete_response.json()
    )
    exercise_after_delete_response = await client.get("/api/tracker/exercise", headers=headers)
    assert any(
        entry["id"] == completed_structured["completed_exercise_entry_id"]
        for entry in exercise_after_delete_response.json()
    )
    repeat_delete_response = await client.delete(
        f"/api/tracker/planned-workout-sessions/{created_structured['id']}",
        headers=headers,
    )
    assert repeat_delete_response.status_code == 404

    create_legacy_response = await client.post(
        "/api/tracker/planned-exercise",
        headers=headers,
        json={
            "title": "Recovery walk",
            "duration_minutes": 25,
            "calories_burned": 140,
            "planned_on": "2026-04-09",
            "planned_at": "18:00",
            "intensity": "Low",
        },
    )
    assert create_legacy_response.status_code == 200
    legacy_session_id = create_legacy_response.json()["id"]
    delete_legacy_response = await client.delete(
        f"/api/tracker/planned-workout-sessions/{legacy_session_id}",
        headers=headers,
    )
    assert delete_legacy_response.status_code == 204
    sessions_after_legacy_delete = await client.get(
        "/api/tracker/planned-workout-sessions",
        headers=headers,
    )
    assert not any(
        session["id"] == legacy_session_id for session in sessions_after_legacy_delete.json()
    )
    planned_after_legacy_delete = await client.get("/api/tracker/planned-exercise", headers=headers)
    assert not any(entry["id"] == legacy_session_id for entry in planned_after_legacy_delete.json())

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
                    "items": [
                        {
                            "name": "Greek yogurt",
                            "quantity_label": "300 g",
                            "calories": 177,
                            "macros": {"protein": 31, "carbs": 11, "fat": 1},
                        }
                    ],
                },
                {
                    "meal_label": "Lunch",
                    "title": "Chicken rice bowl",
                    "calories": 610,
                    "prep_status": "Needs prep",
                    "items": [
                        {
                            "name": "Chicken breast",
                            "quantity_label": "170 g",
                            "calories": 281,
                            "macros": {"protein": 53, "carbs": 0, "fat": 6},
                        }
                    ],
                },
            ],
        },
    )
    assert meal_plan_response.status_code == 200
    meal_plan_day = meal_plan_response.json()
    assert len(meal_plan_day["slots"]) == 2
    assert meal_plan_day["slots"][0]["items"][0]["name"] == "Greek yogurt"

    meal_plan_list_response = await client.get("/api/tracker/meal-plan", headers=headers)
    assert meal_plan_list_response.status_code == 200
    meal_plan_days = meal_plan_list_response.json()
    assert len(meal_plan_days) == 1
    assert meal_plan_days[0]["id"] == meal_plan_day["id"]

    slot_update_response = await client.patch(
        f"/api/tracker/meal-plan/slots/{meal_plan_day['slots'][0]['id']}",
        headers=headers,
        json={"eaten_at": "2026-03-31T07:30:00"},
    )
    assert slot_update_response.status_code == 200
    updated_day = slot_update_response.json()
    assert updated_day["slots"][0]["eaten_at"] == "2026-03-31T07:30:00"

    food_logs_response = await client.get("/api/nutrition/logs", headers=headers)
    assert food_logs_response.status_code == 200
    food_logs = food_logs_response.json()
    assert len(food_logs) == 1
    assert food_logs[0]["log_date"] == "2026-03-31"
    assert len(food_logs[0]["entries"]) == 1
    assert food_logs[0]["entries"][0]["entry_type"] == "meal"
    assert food_logs[0]["entries"][0]["display_name_override"] == "Breakfast: Greek yogurt + berries"
    assert food_logs[0]["entries"][0]["meal_plan_slot_id"] == meal_plan_day["slots"][0]["id"]

    clear_slot_response = await client.patch(
        f"/api/tracker/meal-plan/slots/{meal_plan_day['slots'][0]['id']}",
        headers=headers,
        json={"eaten_at": None},
    )
    assert clear_slot_response.status_code == 200
    cleared_day = clear_slot_response.json()
    assert cleared_day["slots"][0]["eaten_at"] is None

    cleared_food_logs_response = await client.get("/api/nutrition/logs", headers=headers)
    assert cleared_food_logs_response.status_code == 200
    cleared_food_logs = cleared_food_logs_response.json()
    assert len(cleared_food_logs) == 1
    assert cleared_food_logs[0]["entries"] == []

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
