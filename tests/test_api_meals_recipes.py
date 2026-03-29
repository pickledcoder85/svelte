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
async def test_meal_template_update_recalculates_totals_and_ingredients(client, repository):
    create_response = await client.post(
        "/api/meals/templates",
        json={
            "id": "meal-protein-bowl",
            "name": "Protein Bowl",
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

    assert create_response.status_code == 200
    assert create_response.json()["calories"] == 311.2
    assert create_response.json()["per_serving_calories"] == 155.6

    update_response = await client.put(
        "/api/meals/templates/meal-protein-bowl",
        json={
            "name": "Protein Bowl Deluxe",
            "serving_count": 4,
            "ingredients": [
                {
                    "id": "ingredient-oats",
                    "food_id": "food-oats",
                    "name": "Rolled oats",
                    "grams": 100,
                    "calories_per_100g": 389,
                    "macros_per_100g": {"protein": 16.9, "carbs": 66.3, "fat": 6.9},
                }
            ],
        },
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["name"] == "Protein Bowl Deluxe"
    assert updated["serving_count"] == 4
    assert updated["calories"] == 389.0
    assert updated["macros"] == {"protein": 16.9, "carbs": 66.3, "fat": 6.9}
    assert updated["per_serving_calories"] == 97.2
    assert updated["per_serving_macros"] == {"protein": 4.2, "carbs": 16.6, "fat": 1.7}
    assert updated["ingredients"][0]["grams"] == 100

    fetched = await client.get("/api/meals/templates/meal-protein-bowl")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Protein Bowl Deluxe"
    assert fetched.json()["ingredients"][0]["grams"] == 100

    missing_update = await client.put(
        "/api/meals/templates/missing-template",
        json={
            "name": "Missing Template",
            "serving_count": 1,
            "ingredients": [],
        },
    )
    assert missing_update.status_code == 404


@pytest.mark.asyncio
async def test_recipe_create_update_read_favorite_and_scale_flow(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "recipe-flow@example.com", "display_name": "Recipe Flow"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    create_response = await client.post(
        "/api/recipes",
        json={
            "title": "Citrus Chicken Bowl",
            "steps": ["Roast chicken.", "Add grains.", "Top with herbs."],
            "assets": [{"kind": "text", "content": "base recipe"}],
            "ingredients": [
                {
                    "id": "ingredient-chicken",
                    "food_id": "food-chicken-breast",
                    "name": "Chicken breast",
                    "grams": 200,
                    "calories_per_100g": 165,
                    "macros_per_100g": {"protein": 31, "carbs": 0, "fat": 3.6},
                }
            ],
            "default_yield": 4,
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["favorite"] is False
    recipe_id = created["id"]

    listing = await client.get("/api/recipes", headers=headers)
    assert listing.status_code == 200
    assert any(recipe["id"] == recipe_id and recipe["favorite"] is False for recipe in listing.json())

    fetched = await client.get(f"/api/recipes/{recipe_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Citrus Chicken Bowl"
    assert fetched.json()["default_yield"] == 4

    scaled = await client.get(f"/api/recipes/{recipe_id}/scale/1.5", headers=headers)
    assert scaled.status_code == 200
    assert scaled.json()["default_yield"] == 6.0
    assert scaled.json()["ingredients"][0]["grams"] == 300.0

    update_response = await client.put(
        f"/api/recipes/{recipe_id}",
        headers=headers,
        json={
            "title": "Citrus Chicken Bowl Deluxe",
            "steps": ["Roast chicken.", "Add grains.", "Finish with citrus."],
            "assets": [{"kind": "text", "content": "updated recipe"}],
            "ingredients": [
                {
                    "id": "ingredient-chicken",
                    "food_id": "food-chicken-breast",
                    "name": "Chicken breast",
                    "grams": 240,
                    "calories_per_100g": 165,
                    "macros_per_100g": {"protein": 31, "carbs": 0, "fat": 3.6},
                }
            ],
            "default_yield": 6,
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Citrus Chicken Bowl Deluxe"
    assert updated["default_yield"] == 6.0
    assert updated["ingredients"][0]["grams"] == 240

    favorite_update = await client.post(f"/api/recipes/{recipe_id}/favorite", headers=headers)
    assert favorite_update.status_code == 200
    assert favorite_update.json()["favorite"] is True
    assert repository.list_saved_favorites(session["user_id"], "recipe")

    favorites = await client.get("/api/recipes/favorites", headers=headers)
    assert favorites.status_code == 200
    assert any(recipe["id"] == recipe_id for recipe in favorites.json())

    unfavorite_update = await client.delete(f"/api/recipes/{recipe_id}/favorite", headers=headers)
    assert unfavorite_update.status_code == 200
    assert unfavorite_update.json()["favorite"] is False
    assert repository.list_saved_favorites(session["user_id"], "recipe") == []


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
    assert response.json()["favorite"] is False

    listing = await client.get("/api/recipes")
    assert listing.status_code == 200
    assert any(recipe["id"] == recipe_id for recipe in listing.json())

    authed_listing = await client.get("/api/recipes", headers=headers)
    assert authed_listing.status_code == 200
    assert any(recipe["id"] == recipe_id and recipe["favorite"] is False for recipe in authed_listing.json())

    fetched = await client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Overnight Oats"

    authed_fetched = await client.get(f"/api/recipes/{recipe_id}", headers=headers)
    assert authed_fetched.status_code == 200
    assert authed_fetched.json()["favorite"] is False

    scaled = await client.get(f"/api/recipes/{recipe_id}/scale/1.5")
    assert scaled.status_code == 200
    assert scaled.json()["default_yield"] == 3.0

    authed_scaled = await client.get(f"/api/recipes/{recipe_id}/scale/1.5", headers=headers)
    assert authed_scaled.status_code == 200
    assert authed_scaled.json()["favorite"] is False

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

    authed_listing = await client.get("/api/recipes", headers=headers)
    assert authed_listing.status_code == 200
    assert any(recipe["id"] == recipe_id and recipe["favorite"] is True for recipe in authed_listing.json())

    authed_fetched = await client.get(f"/api/recipes/{recipe_id}", headers=headers)
    assert authed_fetched.status_code == 200
    assert authed_fetched.json()["favorite"] is True

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

    authed_scaled = await client.get(f"/api/recipes/{recipe_id}/scale/1.5", headers=headers)
    assert authed_scaled.status_code == 200
    assert authed_scaled.json()["favorite"] is False

    favorites = await client.get("/api/recipes/favorites", headers=headers)
    assert favorites.status_code == 200
    assert favorites.json() == []
