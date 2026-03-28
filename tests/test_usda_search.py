from types import SimpleNamespace

import pytest

from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.integrations.usda import UsdaSearchError


@pytest.mark.asyncio
async def test_food_search_uses_usda_adapter_when_configured(client, monkeypatch):
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
        "backend.app.services.usda.get_settings",
        lambda: SimpleNamespace(usda_api_key="test-key"),
    )
    monkeypatch.setattr(
        "backend.app.services.usda.search_usda_foods",
        fake_search_usda_foods,
    )

    response = await client.get("/api/nutrition/foods/search?q=quinoa")

    assert response.status_code == 200
    foods = response.json()
    assert len(foods) == 1
    assert foods[0]["id"] == "usda-123"
    assert foods[0]["source"] == "USDA"
    assert foods[0]["favorite"] is False


@pytest.mark.asyncio
async def test_food_search_falls_back_to_sqlite_when_usda_errors(client, monkeypatch):
    async def failing_search_usda_foods(query: str, api_key: str):
        raise UsdaSearchError("USDA unavailable.")

    monkeypatch.setattr(
        "backend.app.services.usda.get_settings",
        lambda: SimpleNamespace(usda_api_key="test-key"),
    )
    monkeypatch.setattr(
        "backend.app.services.usda.search_usda_foods",
        failing_search_usda_foods,
    )

    response = await client.get("/api/nutrition/foods/search?q=oats")

    assert response.status_code == 200
    foods = response.json()
    assert foods
    assert foods[0]["name"].lower().startswith("rolled oats")
    assert foods[0]["source"] == "CUSTOM"
