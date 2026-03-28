def test_create_meal_template(client):
    response = client.post(
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
    body = response.json()
    assert body["name"] == "Blueberry Protein Bowl"
    assert body["calories"] > 0
    assert body["per_serving_calories"] > 0


def test_import_and_list_recipe(client):
    response = client.post(
        "/api/recipes/import",
        json={
            "title": "Overnight Oats",
            "steps": ["Combine", "Chill", "Serve"],
            "assets": [{"kind": "text", "content": "base recipe"}],
        },
    )

    assert response.status_code == 200
    recipe_id = response.json()["id"]

    listing = client.get("/api/recipes")
    assert listing.status_code == 200
    assert any(recipe["id"] == recipe_id for recipe in listing.json())

    fetched = client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Overnight Oats"


def test_scale_recipe_route(client):
    response = client.post(
        "/api/recipes/import",
        json={
            "title": "Simple Bowl",
            "steps": ["Mix", "Serve"],
            "assets": [],
        },
    )
    recipe_id = response.json()["id"]

    scaled = client.get(f"/api/recipes/{recipe_id}/scale/1.5")
    assert scaled.status_code == 200
    assert scaled.json()["id"] == recipe_id
    assert scaled.json()["default_yield"] == 3.0
