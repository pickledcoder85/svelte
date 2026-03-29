import pytest


@pytest.mark.asyncio
async def test_food_search_uses_seed_data(client):
    response = await client.get("/api/nutrition/foods/search?q=oats")

    assert response.status_code == 200
    foods = response.json()
    assert foods
    assert foods[0]["name"].lower().startswith("rolled oats")
    assert foods[0]["source"] == "CUSTOM"


@pytest.mark.asyncio
async def test_vision_label_returns_demo_extraction(client):
    response = await client.post("/api/vision/label", json={"image_base64": "ZmFrZS1pbWFnZQ=="})

    assert response.status_code == 200
    body = response.json()
    assert body["product_name"] == "Scanned food product"
    assert body["confidence"] == 0.62


@pytest.mark.asyncio
async def test_package_scan_creates_ingestion_output_with_candidates(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "package@example.com", "display_name": "Package User"},
    )
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    response = await client.post(
        "/api/vision/package",
        headers=headers,
        json={"image_base64": "ZmFrZS1wYWNrYWdl"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source_kind"] == "camera_package"
    assert body["extraction"]["product_name"] == "Rolled oats"
    assert body["extraction"]["match_candidates"]
    assert body["extraction"]["match_candidates"][0]["name"].lower().startswith("rolled oats")


@pytest.mark.asyncio
async def test_label_ingest_and_save_food_flow(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "label@example.com", "display_name": "Label User"},
    )
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    ingest_response = await client.post(
        "/api/vision/label/ingest",
        headers=headers,
        json={"image_base64": "ZmFrZS1sYWJlbA=="},
    )
    assert ingest_response.status_code == 200
    output_id = ingest_response.json()["output_id"]

    accept_response = await client.post(
        f"/api/ingestion/outputs/{output_id}/accept",
        headers=headers,
        json={
            "structured_json": {
                "product_name": "Test protein bar",
                "brand_name": "Codex Foods",
                "serving_size": "1 bar",
                "calories": 220,
                "macros": {"protein": 20, "carbs": 24, "fat": 7},
            }
        },
    )
    assert accept_response.status_code == 200

    save_response = await client.post(
        f"/api/ingestion/outputs/{output_id}/save-food",
        headers=headers,
    )
    assert save_response.status_code == 200
    food = save_response.json()
    assert food["name"] == "Test protein bar"
    assert food["brand"] == "Codex Foods"
    assert food["source"] == "LABEL_SCAN"
    assert food["serving_size"] == 1
    assert food["serving_unit"] == "bar"
    assert food["macros"] == {"protein": 20.0, "carbs": 24.0, "fat": 7.0}

    search_response = await client.get(
        "/api/nutrition/foods/search?q=protein",
        headers=headers,
    )
    assert search_response.status_code == 200
    foods = search_response.json()
    assert any(item["id"] == food["id"] for item in foods)
