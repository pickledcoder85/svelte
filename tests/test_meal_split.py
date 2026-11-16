"""Meals a day and how the daily target splits across them."""

import pytest

from backend.app.services.meal_split import (
    DEFAULT_SPLITS,
    MealSplitError,
    meal_blocks,
    resolve_split,
    validate_split,
)
from tests.test_api_profile_reset import ONBOARDING_BODY, _headers


def test_defaults_are_valid_and_add_up():
    for count, split in DEFAULT_SPLITS.items():
        assert validate_split(count, split) == split


@pytest.mark.parametrize(
    "count, split, message",
    [
        (3, [25, 35], "each of the 3"),
        (3, [30, 30, 30], "add up to 100"),
        (3, [5, 45, 50], "Breakfast needs at least 10%"),
        (5, [20, 0, 40, 10, 30], "Morning snack needs at least 5%"),
        (4, [25, 32, 8, 35], "steps of 5"),
        (6, [20, 20, 20, 20, 20], "3, 4, or 5"),
        (3, [True, 50, 49], "whole numbers"),
    ],
)
def test_bad_splits_are_rejected(count, split, message):
    with pytest.raises(MealSplitError, match=message):
        validate_split(count, split)


def test_resolve_falls_back_to_the_default():
    assert resolve_split(None, None) == (3, [30, 35, 35])
    assert resolve_split(5, "[20, 10, 30, 10, 30]") == (5, [20, 10, 30, 10, 30])
    assert resolve_split(4, "not json") == (4, [25, 30, 10, 35])
    assert resolve_split(4, "[30, 35, 35]") == (4, [25, 30, 10, 35])  # wrong length for 4


def test_blocks_are_in_day_order():
    blocks = meal_blocks(5, [20, 10, 30, 10, 30])
    assert [block["label"] for block in blocks] == ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner"]
    assert [block["snack"] for block in blocks] == [False, True, False, True, False]


@pytest.mark.asyncio
async def test_profile_saves_meals_per_day_and_split_without_changing_targets(client):
    headers = await _headers(client, "split@example.com")
    done = (await client.post("/api/profile/onboarding", headers=headers, json=ONBOARDING_BODY)).json()
    assert (done["meals_per_day"], done["meal_split"]) == (3, [30, 35, 35])
    assert done["meal_pattern_chosen"] is False

    base = {"timezone": done["timezone"], "units": done["units"]}
    five = await client.put("/api/profile", headers=headers, json={**base, "meals_per_day": 5})
    assert five.status_code == 200
    assert (five.json()["meals_per_day"], five.json()["meal_split"]) == (5, [20, 10, 30, 10, 30])
    assert five.json()["meal_pattern_chosen"] is True
    assert five.json()["initial_calorie_target"] == done["initial_calorie_target"]

    custom = await client.put("/api/profile", headers=headers, json={**base, "meal_split": [25, 10, 30, 5, 30]})
    assert custom.json()["meal_split"] == [25, 10, 30, 5, 30]

    bad = await client.put("/api/profile", headers=headers, json={**base, "display_name": "Changed", "meal_split": [50, 50, 10, 5, 5]})
    assert bad.status_code == 400
    after = (await client.get("/api/profile", headers=headers)).json()
    assert after["display_name"] != "Changed"  # nothing saved from a rejected update
    assert after["meal_split"] == [25, 10, 30, 5, 30]


@pytest.mark.asyncio
async def test_setup_saves_the_meal_balance(client):
    headers = await _headers(client, "balance@example.com")
    done = (await client.post("/api/profile/onboarding", headers=headers, json={**ONBOARDING_BODY, "meal_split": [25, 30, 45]})).json()
    assert (done["meals_per_day"], done["meal_split"], done["meal_pattern_chosen"]) == (3, [25, 30, 45], True)


@pytest.mark.asyncio
async def test_setup_rejects_a_bad_balance_before_saving(client):
    headers = await _headers(client, "badbalance@example.com")
    bad = await client.post("/api/profile/onboarding", headers=headers, json={**ONBOARDING_BODY, "meal_split": [50, 50, 50]})
    assert bad.status_code in (400, 422)
    profile = (await client.get("/api/profile", headers=headers)).json()
    assert profile["setup_complete"] is False
