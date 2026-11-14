import pytest

from backend.app.config import get_settings
from backend.app.models.nutrition import FoodItem, MacroTargets


@pytest.fixture(autouse=True)
def disable_openai_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_food_search_uses_seed_data(client, auth_headers):
    response = await client.get("/api/nutrition/foods/search?q=oats", headers=auth_headers)

    assert response.status_code == 200
    foods = response.json()
    assert foods
    assert foods[0]["name"].lower().startswith("rolled oats")
    assert foods[0]["source"] == "CUSTOM"


@pytest.mark.asyncio
async def test_vision_label_returns_demo_extraction(client, auth_headers):
    response = await client.post(
        "/api/vision/label",
        headers=auth_headers,
        json={"image_base64": "ZmFrZS1pbWFnZQ=="},
    )

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
    food = save_response.json()["saved_foods"][0]
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


@pytest.mark.asyncio
async def test_package_only_save_food_uses_usda_lookup(client, monkeypatch):
    async def fake_search_usda_foods(query: str, api_key: str):
        assert query == "Fresh Farms Granny Smith Apples"
        assert api_key == "test-usda-key"
        return [
            FoodItem(
                id="usda-apple-1",
                name="Granny Smith Apples",
                brand="Fresh Farms",
                calories=52,
                serving_size=100,
                serving_unit="g",
                macros=MacroTargets(protein=0.3, carbs=13.8, fat=0.2),
                source="USDA",
            )
        ]

    monkeypatch.setenv("USDA_API_KEY", "test-usda-key")
    get_settings.cache_clear()
    monkeypatch.setattr(
        "backend.app.services.ingestion.search_usda_foods",
        fake_search_usda_foods,
    )

    session_response = await client.post(
        "/api/auth/session",
        json={"email": "package-save@example.com", "display_name": "Package Save User"},
    )
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    scan_response = await client.post(
        "/api/vision/package",
        headers=headers,
        json={"image_base64": "ZmFrZS1wYWNrYWdl"},
    )
    assert scan_response.status_code == 200
    output_id = scan_response.json()["output_id"]

    accept_response = await client.post(
        f"/api/ingestion/outputs/{output_id}/accept",
        headers=headers,
        json={
            "structured_json": {
                "package_text": "Fresh Farms Granny Smith Apples",
                "product_name": "Granny Smith Apples",
                "brand_name": "Fresh Farms",
                "confidence": 0.84,
                "match_candidates": [],
            }
        },
    )
    assert accept_response.status_code == 200

    save_response = await client.post(
        f"/api/ingestion/outputs/{output_id}/save-food",
        headers=headers,
    )
    assert save_response.status_code == 200
    food = save_response.json()["saved_foods"][0]
    assert food["id"] == "usda-apple-1"
    assert food["name"] == "Granny Smith Apples"
    assert food["brand"] == "Fresh Farms"
    assert food["source"] == "USDA"
    assert food["calories"] == 52


@pytest.mark.asyncio
async def test_multi_variant_label_save_persists_each_variant(client):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "variants@example.com", "display_name": "Variants User"},
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
                "product_name": "Quaker Instant Oatmeal Variety Pack",
                "brand_name": "Quaker",
                "serving_size": "1 packet",
                "calories": 160,
                "macros": {"protein": 4, "carbs": 33, "fat": 2.5},
                "multiple_variants_detected": True,
                "variants": [
                    {
                        "variant_name": "Apples & Cinnamon",
                        "serving_size": "1 packet",
                        "calories": 160,
                        "macros": {"protein": 4, "carbs": 33, "fat": 2.5},
                    },
                    {
                        "variant_name": "Maple & Brown Sugar",
                        "serving_size": "1 packet",
                        "calories": 160,
                        "macros": {"protein": 4, "carbs": 33, "fat": 2.5},
                    },
                ],
            }
        },
    )
    assert accept_response.status_code == 200

    save_response = await client.post(
        f"/api/ingestion/outputs/{output_id}/save-food",
        headers=headers,
    )
    assert save_response.status_code == 200
    foods = save_response.json()["saved_foods"]
    assert len(foods) == 2
    assert foods[0]["name"] == "Quaker Instant Oatmeal Variety Pack - Apples & Cinnamon"
    assert foods[1]["name"] == "Quaker Instant Oatmeal Variety Pack - Maple & Brown Sugar"
    assert all(food["source"] == "LABEL_SCAN" for food in foods)
