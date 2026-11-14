from backend.app.services.vision import _extract_output_text, _parse_json_object


def test_extract_output_text_prefers_top_level_field() -> None:
    payload = {"output_text": '{"product_name":"Rolled oats"}'}

    assert _extract_output_text(payload) == '{"product_name":"Rolled oats"}'


def test_extract_output_text_falls_back_to_output_content_text() -> None:
    payload = {
        "output": [
            {
                "content": [
                    {"type": "output_text", "text": '{"product_name":"Rolled oats","confidence":0.9}'}
                ]
            }
        ]
    }

    assert _extract_output_text(payload) == '{"product_name":"Rolled oats","confidence":0.9}'


def test_parse_json_object_accepts_plain_json() -> None:
    parsed = _parse_json_object('{"product_name":"Rolled oats","confidence":0.9}')

    assert parsed == {"product_name": "Rolled oats", "confidence": 0.9}


def test_parse_json_object_extracts_json_from_wrapped_text() -> None:
    parsed = _parse_json_object(
        '```json\n{"product_name":"Rolled oats","brand_name":"Quaker","confidence":0.9}\n```'
    )

    assert parsed == {"product_name": "Rolled oats", "brand_name": "Quaker", "confidence": 0.9}


import base64

import pytest

from backend.app.config import Settings
from backend.app.services.vision import (
    VisionImageError,
    build_vision_request,
    prepare_image_data_url,
)

PNG_1X1 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, app_env="test", openai_api_key="", **overrides)


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


@pytest.mark.parametrize(
    "data, media_type",
    [
        (b"\xff\xd8\xff\xe0" + b"\x00" * 16, "image/jpeg"),
        (base64.b64decode(PNG_1X1), "image/png"),
        (b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 8, "image/webp"),
        (b"GIF89a" + b"\x00" * 8, "image/gif"),
    ],
)
def test_prepare_image_data_url_uses_the_real_media_type(data, media_type) -> None:
    url = prepare_image_data_url(_b64(data), _settings())
    assert url.startswith(f"data:{media_type};base64,")


def test_prepare_image_data_url_accepts_data_urls_and_whitespace() -> None:
    url = prepare_image_data_url(f"data:image/jpeg;base64,{PNG_1X1[:20]}\n{PNG_1X1[20:]}", _settings())
    assert url == f"data:image/png;base64,{PNG_1X1}"


@pytest.mark.parametrize(
    "payload, message",
    [
        ("", "empty"),
        ("not base64 !!", "could not be read"),
        (_b64(b"\x00\x00\x00\x18ftypheic" + b"\x00" * 16), "Unsupported image format"),
        (_b64(b"plain text, not an image"), "Unsupported image format"),
    ],
)
def test_prepare_image_data_url_rejects_bad_images(payload, message) -> None:
    with pytest.raises(VisionImageError, match=message):
        prepare_image_data_url(payload, _settings())


def test_prepare_image_data_url_rejects_oversized_uploads_before_decoding() -> None:
    with pytest.raises(VisionImageError, match="too large"):
        prepare_image_data_url("A" * 101, _settings(vision_max_image_base64_chars=100))


def test_vision_request_uses_configured_model_and_reasoning_effort() -> None:
    request = build_vision_request(
        _settings(vision_model="gpt-6-luna", vision_reasoning_effort="none"),
        "data:image/png;base64,xyz",
        "Extract the label.",
    )
    assert request["model"] == "gpt-6-luna"
    assert request["reasoning"] == {"effort": "none"}
    assert request["text"] == {"format": {"type": "json_object"}}
    image_part = request["input"][0]["content"][1]
    assert image_part == {"type": "input_image", "image_url": "data:image/png;base64,xyz", "detail": "high"}


def test_vision_defaults_to_the_cheapest_current_model() -> None:
    settings = _settings()
    assert settings.vision_model == "gpt-6-luna"
    assert settings.vision_reasoning_effort == "none"
