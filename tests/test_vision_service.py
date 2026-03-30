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
