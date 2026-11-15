"""Logged food carries its meal (breakfast, lunch, dinner, snack), and quick calories."""

import pytest


async def _food(client, headers):
    # A food in the catalog to log: save one through the food-bank route's search fallback.
    from backend.app.models.nutrition import FoodItem, MacroTargets

    return FoodItem(
        id="bar", name="Granola Bar", calories=190, serving_size=1, serving_unit="bar", serving_grams=40,
        macros=MacroTargets(protein=4, carbs=29, fat=7), source="LABEL_SCAN",
    )


@pytest.mark.asyncio
async def test_log_food_keeps_the_meal(client, auth_headers, repository):
    repository.save_food_item(await _food(client, auth_headers))
    response = await client.post(
        "/api/nutrition/log-food",
        headers=auth_headers,
        json={"food_id": "bar", "log_date": "2026-11-15", "servings": 1, "meal_slot": "snack"},
    )
    assert response.status_code == 200
    assert response.json()["entries"][0]["meal_slot"] == "snack"
    bad = await client.post(
        "/api/nutrition/log-food",
        headers=auth_headers,
        json={"food_id": "bar", "log_date": "2026-11-15", "servings": 1, "meal_slot": "brunch"},
    )
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_quick_calories(client, auth_headers):
    response = await client.post(
        "/api/nutrition/quick-calories",
        headers=auth_headers,
        json={"log_date": "2026-11-15", "calories": 350, "meal_slot": "lunch", "protein": 20},
    )
    assert response.status_code == 200
    [entry] = response.json()["entries"]
    assert entry["display_name"] == "Quick calories" and entry["calories"] == 350 and entry["protein"] == 20
    assert entry["meal_slot"] == "lunch" and entry["entry_type"] == "meal"
    named = await client.post(
        "/api/nutrition/quick-calories",
        headers=auth_headers,
        json={"log_date": "2026-11-15", "calories": 120, "name": "Office cookie"},
    )
    assert named.json()["entries"][-1]["display_name"] == "Office cookie"
    assert (await client.post("/api/nutrition/quick-calories", headers=auth_headers, json={"log_date": "2026-11-15", "calories": 0})).status_code == 422


@pytest.mark.asyncio
async def test_ticking_a_planned_meal_tags_it(client, auth_headers):
    day = (
        await client.post(
            "/api/tracker/meal-plan",
            headers=auth_headers,
            json={"plan_date": "2026-11-15", "label": "Sun", "focus": "Easy", "slots": [
                {"meal_label": "Dinner", "title": "Salmon", "calories": 600, "prep_status": "Flexible", "items": []}
            ]},
        )
    ).json()
    await client.patch(
        f"/api/tracker/meal-plan/slots/{day['slots'][0]['id']}", headers=auth_headers, json={"eaten_at": "2026-11-15T19:00:00"}
    )
    logs = (await client.get("/api/nutrition/logs", headers=auth_headers)).json()
    assert logs[0]["entries"][0]["meal_slot"] == "dinner"
