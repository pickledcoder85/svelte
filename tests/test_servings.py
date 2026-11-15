import pytest

from backend.app.services.servings import ParsedServing, parse_serving_text, serving_grams_for_package


@pytest.mark.parametrize(
    "text, expected",
    [
        ("2 tbsp (32 g)", ParsedServing(2, "tbsp", 32, "g")),
        ("2 Tbsp (32g)", ParsedServing(2, "Tbsp", 32, "g")),
        ("1 cup (240 ml)", ParsedServing(1, "cup", 240, "ml")),
        ("1 cup (240mL)", ParsedServing(1, "cup", 240, "ml")),
        ("1 packet (28 g)", ParsedServing(1, "packet", 28, "g")),
        ("30g", ParsedServing(30, "g", 30, "g")),
        ("100 g", ParsedServing(100, "g", 100, "g")),
        ("1 oz", ParsedServing(1, "oz", 28.35, "g")),
        ("1 oz (28g)", ParsedServing(1, "oz", 28, "g")),
        ("8 fl oz (240 mL)", ParsedServing(8, "fl oz", 240, "ml")),
        ("8 fl oz", ParsedServing(8, "fl oz", 236.59, "ml")),
        ("1/2 cup (120 ml)", ParsedServing(0.5, "cup", 120, "ml")),
        ("2/3 cup (55g)", ParsedServing(0.667, "cup", 55, "g")),
        ("1 1/2 cups (360 ml)", ParsedServing(1.5, "cups", 360, "ml")),
        ("1 packet", ParsedServing(1, "packet", None, None)),
        ("1 serving", ParsedServing(1, "serving", None, None)),
        ("3 pieces (about 40 g)", ParsedServing(3, "pieces", 40, "g")),
    ],
)
def test_parses_label_servings(text, expected):
    assert parse_serving_text(text) == expected


def test_unusable_text_is_none():
    assert parse_serving_text("") is None
    assert parse_serving_text(None) is None
    assert parse_serving_text("one bar") is None
    # Only a bracketed weight: keep the weight as the serving.
    assert parse_serving_text("Serving (28 g)") == ParsedServing(28, "g", 28, "g")


def test_single_serve_package_uses_the_net_weight():
    assert serving_grams_for_package(None, 1, 28) == 28
    assert serving_grams_for_package(None, 2, 56) is None
    assert serving_grams_for_package(30, 1, 28) == 30
    assert serving_grams_for_package(None, None, 28) is None
