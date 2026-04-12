from datetime import date, timedelta

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
    assert goal["fiber_goal"] == 29.4
    assert goal["target_source"] == "user_custom"
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
            "goal_pace": "recommended",
            "target_weight_lbs": 185,
            "activity_level": "moderate",
            "dietary_pattern": "omnivore",
            "nutrition_style": "balanced",
            "allergy_notes": "peanuts",
        },
    )
    assert onboarding_response.status_code == 200
    onboarding_profile = onboarding_response.json()
    assert onboarding_profile["nutrition_style"] == "balanced"

    meal_plan_response = await client.get("/api/tracker/meal-plan", headers=headers)
    assert meal_plan_response.status_code == 200
    meal_plan_days = meal_plan_response.json()
    assert len(meal_plan_days) == 4
    assert [day["plan_date"] for day in meal_plan_days] == [
        (date.today() + timedelta(days=offset)).isoformat()
        for offset in range(4)
    ]
    assert meal_plan_days[0]["focus"] == "Daily plan"
    assert [slot["meal_label"] for slot in meal_plan_days[0]["slots"]] == [
        "Breakfast",
        "Snack",
        "Lunch",
        "Snack",
        "Dinner",
    ]
    assert sum(slot["calories"] for slot in meal_plan_days[0]["slots"]) == onboarding_profile["initial_calorie_target"]
    assert meal_plan_days[0]["slots"][0]["items"][0]["name"] == "Greek yogurt"
    assert "quantity_label" in meal_plan_days[0]["slots"][0]["items"][0]

    planned_exercise_response = await client.get("/api/tracker/planned-exercise", headers=headers)
    assert planned_exercise_response.status_code == 200
    planned_exercises = planned_exercise_response.json()
    assert len(planned_exercises) == 4
    assert planned_exercises[0]["planned_on"] == date.today().isoformat()

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
            "goal_pace": "lean",
            "target_weight_lbs": 205,
            "activity_level": "light",
            "dietary_pattern": "pescatarian",
            "nutrition_style": "mediterranean",
            "allergy_notes": "shellfish",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["display_name"] == "Lean Bulk"
    assert updated["goal_type"] == "gain"
    assert updated["goal_pace"] == "lean"
    assert updated["current_weight_lbs"] == 195
    assert updated["target_weight_lbs"] == 205
    assert updated["activity_level"] == "light"
    assert updated["dietary_pattern"] == "pescatarian"
    assert updated["nutrition_style"] == "mediterranean"
    assert updated["allergy_notes"] == "shellfish"
    assert updated["bmr_calories"] == 1865
    assert updated["tdee_calories"] == 2424
    assert updated["initial_calorie_target"] == 2624
    assert updated["protein_target_g"] == 159.2
    assert updated["carbs_target_g"] == 332.8
    assert updated["fat_target_g"] == 72.9
    assert updated["fiber_target_g"] == 36.7
    assert updated["calculation_version"] == "v1"
    assert updated["target_source"] == "system_default"

    goals_response = await client.get("/api/profile/goals", headers=headers)
    assert goals_response.status_code == 200
    goals = goals_response.json()
    assert len(goals) == 2
    assert goals[0]["calorie_goal"] == 2624
    assert goals[0]["protein_goal"] == 159.2
    assert goals[0]["carbs_goal"] == 332.8
    assert goals[0]["fat_goal"] == 72.9
    assert goals[0]["fiber_goal"] == 36.7
    assert goals[0]["goal_type"] == "gain"
    assert goals[0]["goal_pace"] == "lean"
    assert goals[0]["calculation_version"] == "v1"
    assert goals[0]["target_source"] == "system_default"
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
