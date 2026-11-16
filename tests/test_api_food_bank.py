"""Food bank routes, logging by servings or grams, and search order."""

from types import SimpleNamespace

import pytest

from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.services import food_bank as food_bank_service

DAY = "2026-11-15"


def _save(repository, food_id, **extra):
    base = dict(
        id=food_id, name=extra.pop("name", f"Food {food_id}"), calories=200, serving_size=2, serving_unit="tbsp",
        macros=MacroTargets(protein=8, carbs=6, fat=16), source="LABEL_SCAN",
    )
    return repository.save_food_item(FoodItem(**{**base, **extra}))


async def _user_id(client, headers):
    return (await client.get("/api/profile", headers=headers)).json()["user_id"]


@pytest.mark.asyncio
async def test_log_by_servings_and_by_grams(client, repository, auth_headers):
    _save(repository, "pb", serving_text="2 tbsp (32 g)", serving_grams=32, serving_basis="g")

    by_servings = await client.post(
        "/api/nutrition/log-food", headers=auth_headers, json={"food_id": "pb", "log_date": DAY, "servings": 1.5}
    )
    assert by_servings.status_code == 200
    entry = by_servings.json()["entries"][-1]
    assert (entry["servings"], entry["grams"], entry["calories"], entry["fat"]) == (1.5, 48, 300, 24)

    by_grams = await client.post(
        "/api/nutrition/log-food", headers=auth_headers, json={"food_id": "pb", "log_date": DAY, "grams": 16}
    )
    entry = by_grams.json()["entries"][-1]
    assert (entry["servings"], entry["grams"], entry["calories"]) == (0.5, 16, 100)
    assert len(by_grams.json()["entries"]) == 2

    # Logged foods go into the bank, and each use is counted.
    user_id = await _user_id(client, auth_headers)
    assert repository.food_bank_use_counts(user_id)["pb"] == 2


@pytest.mark.asyncio
async def test_grams_need_a_serving_weight_which_can_be_added(client, repository, auth_headers):
    _save(repository, "packet", serving_size=1, serving_unit="packet")
    refused = await client.post(
        "/api/nutrition/log-food", headers=auth_headers, json={"food_id": "packet", "log_date": DAY, "grams": 20}
    )
    assert refused.status_code == 400
    assert "weigh" in refused.json()["detail"]

    # Only a food in the user's own bank can have its weight set.
    outside = await client.put(
        "/api/nutrition/foods/packet/serving-weight", headers=auth_headers, json={"serving_grams": 28}
    )
    assert outside.status_code == 400
    await client.post("/api/nutrition/bank/packet", headers=auth_headers)

    weighed = await client.put(
        "/api/nutrition/foods/packet/serving-weight", headers=auth_headers, json={"serving_grams": 28}
    )
    assert weighed.status_code == 200
    assert (weighed.json()["serving_grams"], weighed.json()["serving_basis"]) == (28, "g")

    logged = await client.post(
        "/api/nutrition/log-food", headers=auth_headers, json={"food_id": "packet", "log_date": DAY, "grams": 14}
    )
    assert logged.json()["entries"][-1]["calories"] == 100


@pytest.mark.asyncio
async def test_log_food_validates_the_amount_and_the_food(client, auth_headers):
    both = await client.post(
        "/api/nutrition/log-food", headers=auth_headers,
        json={"food_id": "x", "log_date": DAY, "servings": 1, "grams": 10},
    )
    assert both.status_code == 422
    neither = await client.post("/api/nutrition/log-food", headers=auth_headers, json={"food_id": "x", "log_date": DAY})
    assert neither.status_code == 422
    missing = await client.post(
        "/api/nutrition/log-food", headers=auth_headers, json={"food_id": "nope", "log_date": DAY, "servings": 1}
    )
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_bank_routes(client, repository, auth_headers):
    _save(repository, "oats", name="Rolled oats")
    added = await client.post("/api/nutrition/bank/oats", headers=auth_headers)
    assert added.status_code == 200 and added.json()["in_bank"] is True
    assert [food["id"] for food in (await client.get("/api/nutrition/bank", headers=auth_headers)).json()] == ["oats"]
    assert (await client.get("/api/nutrition/bank?q=rolled", headers=auth_headers)).json()[0]["id"] == "oats"
    assert (await client.get("/api/nutrition/bank?q=rice", headers=auth_headers)).json() == []

    assert (await client.delete("/api/nutrition/bank/oats", headers=auth_headers)).status_code == 204
    assert (await client.delete("/api/nutrition/bank/oats", headers=auth_headers)).status_code == 404
    assert (await client.post("/api/nutrition/bank/nope", headers=auth_headers)).status_code == 404
    assert (await client.get("/api/nutrition/bank")).status_code == 401


@pytest.mark.asyncio
async def test_search_lists_the_bank_first_then_saved_foods_then_usda(client, repository, auth_headers, monkeypatch):
    _save(repository, "apple-bank", name="Green apple slices")
    _save(repository, "apple-catalog", name="Apple juice")
    await client.post("/api/nutrition/bank/apple-bank", headers=auth_headers)

    async def fake_usda(query, api_key):
        return [FoodItem(
            id="usda-1", name="Apples, raw, granny smith", calories=58, serving_size=100, serving_unit="g",
            macros=MacroTargets(protein=0.4, carbs=13.6, fat=0.2), source="USDA", serving_grams=100, serving_basis="g",
        )]

    monkeypatch.setattr(food_bank_service, "get_settings", lambda: SimpleNamespace(usda_api_key="test-key"))
    monkeypatch.setattr(food_bank_service, "search_usda_foods", fake_usda)

    results = (await client.get("/api/nutrition/foods/search?q=apple", headers=auth_headers)).json()
    ids = [food["id"] for food in results]
    assert ids.index("apple-bank") < ids.index("apple-catalog") < ids.index("usda-1")
    assert next(food for food in results if food["id"] == "apple-bank")["in_bank"] is True
    usda = next(food for food in results if food["id"] == "usda-1")
    assert usda["in_bank"] is False  # searching USDA doesn't add to the bank
    assert repository.get_food_by_id("usda-1") is not None  # but it can be logged


@pytest.mark.asyncio
async def test_the_older_entry_route_also_adds_to_the_bank(client, repository, auth_headers):
    _save(repository, "rice")
    log = (await client.post("/api/nutrition/logs", headers=auth_headers, json={"log_date": DAY})).json()
    response = await client.post(
        f"/api/nutrition/logs/{log['id']}/entries",
        headers=auth_headers,
        json={"entry_type": "food", "food_item_id": "rice", "grams": 0, "servings": 1, "calories": 200, "protein": 8, "carbs": 6, "fat": 16},
    )
    assert response.status_code in (200, 201)
    user_id = await _user_id(client, auth_headers)
    assert repository.food_bank_use_counts(user_id) == {"rice": 1}


@pytest.mark.asyncio
async def test_bank_foods_keep_their_favorite_flag(client, repository, auth_headers):
    _save(repository, "fav", name="Favorite oats")
    await client.post("/api/nutrition/bank/fav", headers=auth_headers)
    await client.post("/api/nutrition/favorites/foods/fav", headers=auth_headers)
    bank = (await client.get("/api/nutrition/bank", headers=auth_headers)).json()
    assert bank[0]["favorite"] is True
    results = (await client.get("/api/nutrition/foods/search?q=favorite", headers=auth_headers)).json()
    assert results[0]["id"] == "fav" and results[0]["favorite"] is True


@pytest.mark.asyncio
async def test_a_counted_food_keeps_its_label_until_the_amount_changes(client, repository, auth_headers):
    _save(repository, "egg", name="Egg, boiled", serving_text="100 g", serving_grams=100, serving_basis="g")
    logged = await client.post(
        "/api/nutrition/log-food", headers=auth_headers,
        json={"food_id": "egg", "log_date": DAY, "grams": 100, "quantity_label": "2 large eggs (100 g)"},
    )
    log = logged.json()
    assert log["entries"][-1]["quantity_label"] == "2 large eggs (100 g)"
    # Editing the amount drops the label (it would no longer be true).
    entry = log["entries"][-1]
    user_id = await _user_id(client, auth_headers)
    assert repository.update_food_log_entry(
        user_id=user_id, food_log_id=log["id"], entry_id=entry["id"], grams=150, servings=1.5, calories=300, protein=12, carbs=9, fat=24
    )
    assert repository.list_food_log_entries(log["id"])[-1]["quantity_label"] is None
