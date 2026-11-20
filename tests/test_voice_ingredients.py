"""Tell Gus what you have: speech to text (no real calls) and meals from only the foods listed."""

import base64

import httpx
import pytest

from backend.app.routes import coach
from backend.app.services.meal_suggest import Nutrition, _photo_filter, listed_foods, suggestion_prompt
from backend.app.services.transcribe import TranscribeError, decode_audio, transcribe_audio
from tests.conftest import isolated_test_settings

AUDIO = base64.b64encode(b"\x00\x00\x00\x18ftypM4A fake audio").decode()


def test_decode_checks_format_and_size():
    audio, extension = decode_audio(AUDIO, "audio/mp4")
    assert extension == "m4a" and audio.startswith(b"\x00")
    assert decode_audio(f"data:audio/webm;base64,{AUDIO}", "audio/webm;codecs=opus")[1] == "webm"
    with pytest.raises(TranscribeError):
        decode_audio(AUDIO, "video/quicktime")
    with pytest.raises(TranscribeError):
        decode_audio("not base64 !!!", "audio/mp4")
    with pytest.raises(TranscribeError):
        decode_audio(base64.b64encode(b"x" * (6 * 1024 * 1024)).decode(), "audio/mp4")


@pytest.mark.asyncio
async def test_transcription_sends_the_audio_with_language_and_hint():
    seen = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"text": " Tengo pollo, arroz y espinaca. "})

    settings = isolated_test_settings().model_copy(update={"openai_api_key": "test"})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        text = await transcribe_audio(settings, b"audio", "m4a", "audio/mp4", "es", client=client)
    assert text == "Tengo pollo, arroz y espinaca."
    body = seen[0].content
    assert seen[0].url.path == "/v1/audio/transcriptions"
    assert b'name="model"' in body and b"gpt-transcribe" in body
    assert b'name="language"' in body and b"\r\n\r\nes\r\n" in body
    assert b'filename="speech.m4a"' in body


@pytest.mark.asyncio
async def test_transcribe_route(client, auth_headers, monkeypatch):
    async def fake(settings, audio, extension, mime_type, language="en", client=None):
        assert extension == "m4a" and language == "es"
        return "pollo, arroz"

    monkeypatch.setattr(coach, "transcribe_audio", fake)
    response = await client.post(
        "/api/coach/transcribe",
        headers={**auth_headers, "Accept-Language": "es-CO"},
        json={"audio_base64": AUDIO, "mime_type": "audio/mp4"},
    )
    assert response.status_code == 200 and response.json() == {"text": "pollo, arroz"}
    bad = await client.post("/api/coach/transcribe", headers={**auth_headers, "Accept-Language": "es-CO"},
                            json={"audio_base64": AUDIO, "mime_type": "image/png"})
    assert bad.status_code == 400 and bad.json()["detail"].startswith("Ese formato de grabación")


def test_listed_foods_and_only_those():
    foods = listed_foods("I've got chicken thighs, rice, half a bag of spinach, eggs and some feta.")
    assert foods == ["chicken thighs", "rice", "spinach", "eggs", "feta"]
    prompt = suggestion_prompt(block_label="Dinner", budget=Nutrition(calories=600), profile={}, ingredients="x", listed=foods)
    assert "ONLY from these (any subset is fine)" in prompt and "chicken thighs, rice, spinach, eggs, feta" in prompt
    options = [
        {"name": "Thighs and rice", "why": "", "items": [{"name": "chicken thigh"}, {"name": "rice"}, {"name": "olive oil"}]},
        {"name": "Salmon bowl", "why": "", "items": [{"name": "salmon"}, {"name": "quinoa"}]},
    ]
    kept = _photo_filter(options, foods)
    assert [option["name"] for option in kept] == ["Thighs and rice"]
