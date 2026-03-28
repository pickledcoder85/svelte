import pytest


@pytest.mark.asyncio
async def test_persist_meal_template(client):
    response = await client.post(
        "/api/meals/templates",
        json={
            "id": "meal-breakfast-bowl",
            "name": "Blueberry Protein Bowl",
            "serving_count": 2,
            "ingredients": [
                {
                    "id": "ingredient-oats",
                    "food_id": "food-oats",
                    "name": "Rolled oats",
                    "grams": 80,
                    "calories_per_100g": 389,
                    "macros_per_100g": {"protein": 16.9, "carbs": 66.3, "fat": 6.9},
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["calories"] == 311.2

    listing = await client.get("/api/meals/templates")
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    fetched = await client.get("/api/meals/templates/meal-breakfast-bowl")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Blueberry Protein Bowl"


@pytest.mark.asyncio
async def test_persist_recipe_import_and_scale(client):
    response = await client.post(
        "/api/recipes/import",
        json={
            "title": "Overnight Oats",
            "steps": ["Combine", "Chill", "Serve"],
            "assets": [{"kind": "text", "content": "base recipe"}],
        },
    )

    assert response.status_code == 200
    recipe_id = response.json()["id"]

    listing = await client.get("/api/recipes")
    assert listing.status_code == 200
    assert any(recipe["id"] == recipe_id for recipe in listing.json())

    fetched = await client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Overnight Oats"

    scaled = await client.get(f"/api/recipes/{recipe_id}/scale/1.5")
    assert scaled.status_code == 200
    assert scaled.json()["default_yield"] == 3.0
