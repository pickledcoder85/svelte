import pytest


@pytest.mark.asyncio
async def test_meal_template_favorites_are_session_scoped(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "meal-favorites@example.com", "display_name": "Meal Favorites"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

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

    favorites = await client.get("/api/meals/favorites")
    assert favorites.status_code == 401

    favorites = await client.get("/api/meals/favorites", headers=headers)
    assert favorites.status_code == 200
    assert favorites.json() == []

    favorite_update = await client.post(
        "/api/meals/templates/meal-breakfast-bowl/favorite",
        headers=headers,
    )
    assert favorite_update.status_code == 200
    assert favorite_update.json()["favorite"] is True
    assert repository.list_saved_favorites(session["user_id"], "meal_template")

    favorites = await client.get("/api/meals/favorites", headers=headers)
    assert favorites.status_code == 200
    assert len(favorites.json()) == 1

    unfavorite_update = await client.delete(
        "/api/meals/templates/meal-breakfast-bowl/favorite",
        headers=headers,
    )
    assert unfavorite_update.status_code == 200
    assert unfavorite_update.json()["favorite"] is False
    assert repository.list_saved_favorites(session["user_id"], "meal_template") == []

    favorites = await client.get("/api/meals/favorites", headers=headers)
    assert favorites.status_code == 200
    assert favorites.json() == []


@pytest.mark.asyncio
async def test_recipe_favorites_are_session_scoped(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "recipe-favorites@example.com", "display_name": "Recipe Favorites"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

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

    favorites = await client.get("/api/recipes/favorites")
    assert favorites.status_code == 401

    favorites = await client.get("/api/recipes/favorites", headers=headers)
    assert favorites.status_code == 200
    assert favorites.json() == []

    favorite_update = await client.post(
        f"/api/recipes/{recipe_id}/favorite",
        headers=headers,
    )
    assert favorite_update.status_code == 200
    assert favorite_update.json()["favorite"] is True
    assert repository.list_saved_favorites(session["user_id"], "recipe")

    favorites = await client.get("/api/recipes/favorites", headers=headers)
    assert favorites.status_code == 200
    assert len(favorites.json()) == 1

    unfavorite_update = await client.delete(
        f"/api/recipes/{recipe_id}/favorite",
        headers=headers,
    )
    assert unfavorite_update.status_code == 200
    assert unfavorite_update.json()["favorite"] is False
    assert repository.list_saved_favorites(session["user_id"], "recipe") == []

    favorites = await client.get("/api/recipes/favorites", headers=headers)
    assert favorites.status_code == 200
    assert favorites.json() == []
