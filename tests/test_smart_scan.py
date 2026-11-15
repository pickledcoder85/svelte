"""The auto-capture scanner's one AI read: label, package front, or unreadable. The model call
is monkeypatched; nothing leaves the machine."""

import pytest

from backend.app.services import vision
from backend.app.services.vision import UNREADABLE_MESSAGE, analyze_scan_image
from tests.conftest import TINY_PNG_BASE64, isolated_test_settings

LABEL = {
    "kind": "nutrition_label", "label_text": "Nutrition Facts", "product_name": "Granola", "brand_name": "Trail",
    "serving_size": "1/2 cup (50 g)", "serving_grams": 50, "calories": 210, "protein": 5, "carbs": 30, "fat": 8,
    "confidence": 0.9,
}


def _with_model(monkeypatch, reply):
    async def fake(settings, image_url, instructions):
        assert "First decide what it shows" in instructions
        return reply

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    return isolated_test_settings().model_copy(update={"openai_api_key": "test"})


@pytest.mark.asyncio
async def test_a_label_is_read_exactly(monkeypatch, repository):
    settings = _with_model(monkeypatch, LABEL)
    kind, extraction, message = await analyze_scan_image(TINY_PNG_BASE64, repository, settings)
    assert kind == "nutrition_label" and message is None
    assert extraction.calories == 210 and extraction.serving_grams == 50


@pytest.mark.asyncio
async def test_a_label_without_numbers_is_unreadable_not_a_guess(monkeypatch, repository):
    settings = _with_model(monkeypatch, {**LABEL, "calories": None})
    kind, extraction, message = await analyze_scan_image(TINY_PNG_BASE64, repository, settings)
    assert (kind, extraction) == ("unreadable", None) and message == UNREADABLE_MESSAGE


@pytest.mark.asyncio
async def test_a_package_front_and_an_unreadable_frame(monkeypatch, repository):
    settings = _with_model(monkeypatch, {"kind": "package_front", "package_text": "QUAKER OATS", "product_name": "Old Fashioned Oats", "brand_name": "Quaker", "confidence": 0.8})
    kind, extraction, _ = await analyze_scan_image(TINY_PNG_BASE64, repository, settings)
    assert kind == "package_front" and extraction.brand_name == "Quaker"

    settings = _with_model(monkeypatch, {"kind": "unreadable", "problem": "label too small to read"})
    kind, _, message = await analyze_scan_image(TINY_PNG_BASE64, repository, settings)
    assert kind == "unreadable" and message.startswith("Label too small to read. Couldn't read")

    settings = _with_model(monkeypatch, {"kind": "something else"})
    assert (await analyze_scan_image(TINY_PNG_BASE64, repository, settings))[0] == "unreadable"


@pytest.mark.asyncio
async def test_scan_route_label_replaces_a_package_scan(app, client, auth_headers, monkeypatch):
    replies = iter([
        {"kind": "package_front", "package_text": "TRAIL GRANOLA", "product_name": "Granola", "brand_name": "Trail", "confidence": 0.8},
        LABEL,
    ])

    async def fake(settings, image_url, instructions):
        return next(replies)

    async def no_matches(*args, **kwargs):
        return []

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    monkeypatch.setattr("backend.app.routes.vision.find_package_matches", no_matches)
    app.state.settings = app.state.settings.model_copy(update={"openai_api_key": "test"})

    package = (await client.post("/api/vision/scan", headers=auth_headers, json={"image_base64": TINY_PNG_BASE64})).json()
    assert package["kind"] == "package_front" and package["output_id"]
    label = (
        await client.post(
            "/api/vision/scan",
            headers=auth_headers,
            json={"image_base64": TINY_PNG_BASE64, "replace_output_id": package["output_id"]},
        )
    ).json()
    assert label["kind"] == "nutrition_label" and label["replaced"] is True
    queue = (await client.get("/api/ingestion/queue", headers=auth_headers)).json()
    assert [item["id"] for item in queue if item["review_state"] == "pending"] == [label["output_id"]]


@pytest.mark.asyncio
async def test_scan_route_unreadable_saves_nothing(app, client, auth_headers, monkeypatch):
    async def fake(settings, image_url, instructions):
        return {"kind": "unreadable", "problem": "too blurry"}

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    app.state.settings = app.state.settings.model_copy(update={"openai_api_key": "test"})
    body = (await client.post("/api/vision/scan", headers=auth_headers, json={"image_base64": TINY_PNG_BASE64})).json()
    assert body["kind"] == "unreadable" and body["output_id"] is None and "Too blurry" in body["message"]


@pytest.mark.asyncio
async def test_a_label_missing_macros_is_unreadable(monkeypatch, repository):
    settings = _with_model(monkeypatch, {**LABEL, "protein": None})
    assert (await analyze_scan_image(TINY_PNG_BASE64, repository, settings))[0] == "unreadable"


@pytest.mark.asyncio
async def test_replacing_with_a_package_front_adds_nothing(app, client, auth_headers, monkeypatch):
    async def fake(settings, image_url, instructions):
        return {"kind": "package_front", "package_text": "TRAIL", "product_name": "Granola", "brand_name": "Trail", "confidence": 0.8}

    async def no_matches(*args, **kwargs):
        return []

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    monkeypatch.setattr("backend.app.routes.vision.find_package_matches", no_matches)
    app.state.settings = app.state.settings.model_copy(update={"openai_api_key": "test"})
    first = (await client.post("/api/vision/scan", headers=auth_headers, json={"image_base64": TINY_PNG_BASE64})).json()
    again = (
        await client.post(
            "/api/vision/scan", headers=auth_headers,
            json={"image_base64": TINY_PNG_BASE64, "replace_output_id": first["output_id"]},
        )
    ).json()
    assert again["kind"] == "unreadable" and "Nutrition Facts" in again["message"]
    queue = (await client.get("/api/ingestion/queue", headers=auth_headers)).json()
    assert [item["id"] for item in queue if item["review_state"] == "pending"] == [first["output_id"]]
