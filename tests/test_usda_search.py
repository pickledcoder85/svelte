from types import SimpleNamespace

import pytest

from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.integrations.usda import UsdaSearchError


@pytest.mark.asyncio
async def test_food_search_uses_usda_adapter_when_configured(client, monkeypatch, auth_headers):
    async def fake_search_usda_foods(query: str, api_key: str):
        assert query == "quinoa"
        assert api_key == "test-key"
        return [
            FoodItem(
                id="usda-123",
                name="Greek yogurt",
                brand="USDA demo",
                calories=59,
                serving_size=100,
                serving_unit="g",
                macros=MacroTargets(protein=10.3, carbs=3.6, fat=0.4),
                source="USDA",
            )
        ]

    monkeypatch.setattr(
        "backend.app.services.food_bank.get_settings",
        lambda: SimpleNamespace(usda_api_key="test-key"),
    )
    monkeypatch.setattr(
        "backend.app.services.food_bank.search_usda_foods",
        fake_search_usda_foods,
    )

    response = await client.get("/api/nutrition/foods/search?q=quinoa", headers=auth_headers)

    assert response.status_code == 200
    foods = response.json()
    assert len(foods) == 1
    assert foods[0]["id"] == "usda-123"
    assert foods[0]["source"] == "USDA"
    assert foods[0]["favorite"] is False


@pytest.mark.asyncio
async def test_food_search_falls_back_to_sqlite_when_usda_errors(client, monkeypatch, auth_headers):
    async def failing_search_usda_foods(query: str, api_key: str):
        raise UsdaSearchError("USDA unavailable.")

    monkeypatch.setattr(
        "backend.app.services.food_bank.get_settings",
        lambda: SimpleNamespace(usda_api_key="test-key"),
    )
    monkeypatch.setattr(
        "backend.app.services.food_bank.search_usda_foods",
        failing_search_usda_foods,
    )

    response = await client.get("/api/nutrition/foods/search?q=oats", headers=auth_headers)

    assert response.status_code == 200
    foods = response.json()
    assert foods
    assert foods[0]["name"].lower().startswith("rolled oats")
    assert foods[0]["source"] == "CUSTOM"


def test_energy_is_kcal_even_when_kj_comes_first():
    from backend.app.integrations.usda import _nutrient_value

    quinoa = [
        {"nutrientName": "Energy", "nutrientNumber": "268", "unitName": "kJ", "value": 503},
        {"nutrientName": "Energy", "nutrientNumber": "208", "unitName": "KCAL", "value": 120},
    ]
    assert _nutrient_value(quinoa, "Energy") == 120
    only_kj = [{"nutrientName": "Energy", "nutrientNumber": "268", "unitName": "kJ", "value": 418.4}]
    assert round(_nutrient_value(only_kj, "Energy")) == 100
    atwater = [{"nutrientName": "Energy (Atwater General Factors)", "nutrientNumber": "957", "unitName": "KCAL", "value": 115}]
    assert _nutrient_value(atwater, "Energy") == 115
    assert _nutrient_value([{"nutrientName": "Energy", "value": 190}], "Energy") == 190  # no unit: kcal


def test_energy_that_can_only_be_kj_is_converted():
    from backend.app.integrations.usda import kcal_guard, parse_usda_search_response

    assert round(kcal_guard(503, 4.4, 21.3, 1.9)) == 120  # quinoa stored as kJ
    assert kcal_guard(120, 4.4, 21.3, 1.9) == 120  # correct values untouched
    assert kcal_guard(30, 0, 0, 0) == 30  # nothing to compare against
    [food] = parse_usda_search_response({"foods": [{"fdcId": 1, "description": "Quinoa, cooked", "foodNutrients": [
        {"nutrientName": "Energy", "value": 503}, {"nutrientName": "Protein", "value": 4.4},
        {"nutrientName": "Carbohydrate, by difference", "value": 21.3}, {"nutrientName": "Total lipid (fat)", "value": 1.9}]}]})
    assert round(food.calories) == 120
