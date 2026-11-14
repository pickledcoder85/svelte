import pytest


async def _session(client, email: str) -> dict[str, str]:
    response = await client.post("/api/auth/session", json={"email": email, "display_name": email.split("@")[0]})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['session']['access_token']}"}


async def _log_with_entry(client, headers, log_date: str = "2026-04-01") -> tuple[str, str]:
    log = (await client.post("/api/nutrition/logs", headers=headers, json={"log_date": log_date, "notes": None})).json()
    updated = await client.post(
        f"/api/nutrition/logs/{log['id']}/entries",
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
    assert updated.status_code == 200
    return log["id"], updated.json()["entries"][0]["id"]


@pytest.mark.asyncio
async def test_food_log_entries_can_be_edited_and_deleted(client):
    headers = await _session(client, "owner@example.com")
    log_id, entry_id = await _log_with_entry(client, headers)

    edited = await client.patch(
        f"/api/nutrition/logs/{log_id}/entries/{entry_id}",
        headers=headers,
        json={"grams": 40, "servings": 0.5, "calories": 155.6, "protein": 6.75, "carbs": 26.5, "fat": 2.75},
    )
    assert edited.status_code == 200
    entry = edited.json()["entries"][0]
    assert (entry["grams"], entry["servings"], entry["calories"]) == (40, 0.5, 155.6)

    deleted = await client.delete(f"/api/nutrition/logs/{log_id}/entries/{entry_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["entries"] == []
    again = await client.delete(f"/api/nutrition/logs/{log_id}/entries/{entry_id}", headers=headers)
    assert again.status_code == 404


@pytest.mark.asyncio
async def test_food_log_entries_of_other_users_are_not_found(client):
    owner = await _session(client, "owner@example.com")
    other = await _session(client, "other@example.com")
    log_id, entry_id = await _log_with_entry(client, owner)
    other_log_id, _ = await _log_with_entry(client, other)

    body = {"grams": 1, "servings": 1, "calories": 1, "protein": 0, "carbs": 0, "fat": 0}
    assert (await client.patch(f"/api/nutrition/logs/{log_id}/entries/{entry_id}", headers=other, json=body)).status_code == 404
    assert (await client.delete(f"/api/nutrition/logs/{log_id}/entries/{entry_id}", headers=other)).status_code == 404
    # The entry id under someone else's (or the wrong) log is also not found.
    assert (await client.delete(f"/api/nutrition/logs/{other_log_id}/entries/{entry_id}", headers=other)).status_code == 404
    assert (await client.delete(f"/api/nutrition/logs/{log_id}/entries/{entry_id}", headers=owner)).status_code == 200


@pytest.mark.asyncio
async def test_deleting_a_meal_plan_entry_unticks_the_slot_so_it_is_not_recreated(client):
    headers = await _session(client, "planner@example.com")
    day = (
        await client.post(
            "/api/tracker/meal-plan",
            headers=headers,
            json={
                "plan_date": "2026-04-01",
                "label": "Wed",
                "focus": "Daily plan",
                "slots": [
                    {
                        "meal_label": "Breakfast",
                        "title": "Greek yogurt bowl",
                        "calories": 320,
                        "prep_status": "Prepped",
                        "items": [
                            {
                                "name": "Greek yogurt",
                                "quantity_label": "300 g",
                                "calories": 320,
                                "macros": {"protein": 25, "carbs": 30, "fat": 8},
                            }
                        ],
                    }
                ],
            },
        )
    ).json()
    slot_id = day["slots"][0]["id"]
    eaten = await client.patch(
        f"/api/tracker/meal-plan/slots/{slot_id}",
        headers=headers,
        json={"eaten_at": "2026-04-01T08:00:00Z"},
    )
    assert eaten.status_code == 200

    logs = (await client.get("/api/nutrition/logs", headers=headers)).json()
    log = next(item for item in logs if item["log_date"] == "2026-04-01")
    slot_entry = next(entry for entry in log["entries"] if entry["meal_plan_slot_id"] == slot_id)

    deleted = await client.delete(f"/api/nutrition/logs/{log['id']}/entries/{slot_entry['id']}", headers=headers)
    assert deleted.status_code == 200

    days = (await client.get("/api/tracker/meal-plan", headers=headers)).json()
    slot = next(item for d in days for item in d["slots"] if item["id"] == slot_id)
    assert slot["eaten_at"] is None
    logs_after = (await client.get("/api/nutrition/logs", headers=headers)).json()
    assert all(entry["meal_plan_slot_id"] != slot_id for item in logs_after for entry in item["entries"])


@pytest.mark.asyncio
async def test_exercise_entries_can_be_edited_and_deleted_by_their_owner_only(client):
    owner = await _session(client, "owner@example.com")
    other = await _session(client, "other@example.com")
    created = (
        await client.post(
            "/api/tracker/exercise",
            headers=owner,
            json={
                "title": "Walk",
                "duration_minutes": 20,
                "calories_burned": 90,
                "logged_on": "2026-04-01",
                "logged_at": "07:00",
                "intensity": "Low",
            },
        )
    ).json()
    update = {
        "title": "Brisk walk",
        "duration_minutes": 35,
        "calories_burned": 160,
        "logged_on": "2026-04-01",
        "logged_at": "07:15",
        "intensity": "Moderate",
    }
    assert (await client.put(f"/api/tracker/exercise/{created['id']}", headers=other, json=update)).status_code == 404
    edited = await client.put(f"/api/tracker/exercise/{created['id']}", headers=owner, json=update)
    assert edited.status_code == 200
    assert (edited.json()["title"], edited.json()["duration_minutes"]) == ("Brisk walk", 35)

    assert (await client.delete(f"/api/tracker/exercise/{created['id']}", headers=other)).status_code == 404
    assert (await client.delete(f"/api/tracker/exercise/{created['id']}", headers=owner)).status_code == 204
    assert (await client.get("/api/tracker/exercise", headers=owner)).json() == []
    assert (await client.delete(f"/api/tracker/exercise/{created['id']}", headers=owner)).status_code == 404


@pytest.mark.asyncio
async def test_deleting_a_completed_workouts_exercise_returns_the_plan_to_planned(client):
    headers = await _session(client, "athlete@example.com")
    session = (
        await client.post(
            "/api/tracker/planned-workout-sessions",
            headers=headers,
            json={
                "title": "Run",
                "workout_type": "run",
                "planned_on": "2026-04-01",
                "planned_at": "06:00",
                "notes": None,
                "estimated_calories_burned": 300,
                "blocks": [
                    {
                        "block_kind": "activity",
                        "title": "Main set",
                        "notes": None,
                        "segments": [
                            {
                                "segment_type": "time",
                                "title": "Run",
                                "activity_type": "run",
                                "duration_minutes": 30,
                                "intensity": "Moderate",
                                "calories_estimate": 300,
                            }
                        ],
                    }
                ],
            },
        )
    ).json()
    completed = (
        await client.patch(
            f"/api/tracker/planned-workout-sessions/{session['id']}/completion",
            headers=headers,
            json={"completed_at": "2026-04-01T06:40:00Z"},
        )
    ).json()
    exercise_id = completed["completed_exercise_entry_id"]
    assert exercise_id

    assert (await client.delete(f"/api/tracker/exercise/{exercise_id}", headers=headers)).status_code == 204

    sessions = (await client.get("/api/tracker/planned-workout-sessions", headers=headers)).json()
    plan = next(item for item in sessions if item["id"] == session["id"])
    assert plan["status"] == "planned"
    assert plan["completed_at"] is None
    assert plan["completed_exercise_entry_id"] is None


@pytest.mark.asyncio
async def test_exercise_logged_from_a_plan_must_be_edited_through_the_plan(client):
    headers = await _session(client, "planned@example.com")
    planned = (
        await client.post(
            "/api/tracker/planned-exercise",
            headers=headers,
            json={
                "title": "Recovery walk",
                "duration_minutes": 30,
                "calories_burned": 250,
                "planned_on": "2026-04-01",
                "planned_at": "07:00",
                "intensity": "Moderate",
            },
        )
    ).json()
    completed = (
        await client.patch(
            f"/api/tracker/planned-exercise/{planned['id']}/completion",
            headers=headers,
            json={"completed_at": "2026-04-01T07:40:00Z"},
        )
    ).json()
    exercise_id = completed["completed_exercise_entry_id"]

    edit = await client.put(
        f"/api/tracker/exercise/{exercise_id}",
        headers=headers,
        json={
            "title": "Recovery walk",
            "duration_minutes": 55,
            "calories_burned": 500,
            "logged_on": "2026-04-01",
            "logged_at": "07:40",
            "intensity": "Moderate",
        },
    )
    assert edit.status_code == 409
    assert "planned workout" in edit.json()["detail"]
    exercise = next(item for item in (await client.get("/api/tracker/exercise", headers=headers)).json() if item["id"] == exercise_id)
    assert (exercise["duration_minutes"], exercise["calories_burned"]) == (30, 250)


@pytest.mark.asyncio
async def test_food_entry_edits_need_a_positive_amount(client):
    headers = await _session(client, "owner@example.com")
    log_id, entry_id = await _log_with_entry(client, headers)
    response = await client.patch(
        f"/api/nutrition/logs/{log_id}/entries/{entry_id}",
        headers=headers,
        json={"grams": 0, "servings": 1, "calories": 0, "protein": 0, "carbs": 0, "fat": 0},
    )
    assert response.status_code == 422
