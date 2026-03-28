def test_food_search_uses_seed_data(client):
    response = client.get("/api/nutrition/foods/search?q=oats")

    assert response.status_code == 200
    foods = response.json()
    assert foods
    assert foods[0]["name"].lower().startswith("rolled oats")


def test_vision_label_returns_demo_extraction(client):
    response = client.post("/api/vision/label", json={"image_base64": "ZmFrZS1pbWFnZQ=="})

    assert response.status_code == 200
    body = response.json()
    assert body["product_name"] == "Scanned food product"
    assert body["confidence"] == 0.62
