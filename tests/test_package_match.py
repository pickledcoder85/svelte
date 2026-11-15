"""Package-front scans: find the product's nutrition by name. No real network calls."""

import httpx
import pytest

from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.services.package_match import (
    find_package_matches,
    match_score,
    package_structured_json,
)

OATS = {
    "code": "0030000010204",
    "product_name": "Old Fashioned Oats",
    "brands": "Quaker",
    "serving_size": "1/2 cup (40 g)",
    "serving_quantity": 40,
    "nutriments": {"energy-kcal_serving": 150, "proteins_serving": 5, "carbohydrates_serving": 27, "fat_serving": 3},
}
STORE_OATS = {**OATS, "code": "1", "brands": "Great Value", "product_name": "Old Fashioned Oats"}
GRANOLA = {**OATS, "code": "2", "product_name": "Oats & Honey Granola Clusters Bar", "brands": "Nature Valley"}


def _factory(off_products, usda_foods=None, calls=None):
    def handle(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(request)
        if request.url.host == "world.openfoodfacts.org":
            return httpx.Response(200, json={"products": off_products})
        return httpx.Response(200, json={"foods": usda_foods or []})

    return lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))


def test_score_prefers_the_same_brand_and_name():
    assert match_score("Old Fashioned Oats", "Quaker", "Old Fashioned Oats", "Quaker") == 1.0
    assert match_score("Old Fashioned Oats", "Quaker", "Old Fashioned Oats", "Great Value") < 1.0
    assert match_score("Old Fashioned Oats", "Quaker", "Oats & Honey Granola Clusters Bar", "Nature Valley") < 0.4
    assert match_score("", None, "Anything", None) == 0.0


@pytest.mark.asyncio
async def test_best_match_first_and_only_the_name_is_sent(repository):
    calls = []
    matches = await find_package_matches(
        repository, "Old Fashioned Oats", "Quaker", client_factory=_factory([GRANOLA, STORE_OATS, OATS], calls=calls)
    )
    assert [m["brand_name"] for m in matches] == ["Quaker", "Great Value"]  # granola filtered out
    assert matches[0]["calories"] == 150 and matches[0]["serving_grams"] == 40
    assert matches[0]["barcode"] is None  # a name match never claims the product's barcode
    [search] = calls
    assert search.url.params["search_terms"] == "Quaker Old Fashioned Oats"
    assert "Relish" in search.headers["User-Agent"]


@pytest.mark.asyncio
async def test_usda_is_searched_with_a_key(repository):
    usda = [{
        "fdcId": 9,
        "description": "OLD FASHIONED OATS",
        "brandOwner": "Quaker",
        "servingSize": 40,
        "servingSizeUnit": "g",
        "foodNutrients": [{"nutrientName": "Energy", "value": 375}],
    }]
    matches = await find_package_matches(
        repository, "Old Fashioned Oats", "Quaker", usda_api_key="k", client_factory=_factory([], usda)
    )
    assert matches[0]["data_source"] == "usda" and matches[0]["calories"] == 150


@pytest.mark.asyncio
async def test_your_food_bank_wins_a_tie(repository):
    repository.save_food_item(FoodItem(
        id="mine", name="Old Fashioned Oats", brand="Quaker", calories=140, serving_size=40, serving_unit="g",
        macros=MacroTargets(protein=5, carbs=27, fat=3), source="LABEL_SCAN",
    ))
    matches = await find_package_matches(repository, "Old Fashioned Oats", "Quaker", client_factory=_factory([OATS]))
    assert matches[0]["data_source"] == "food_bank" and matches[0]["calories"] == 140


@pytest.mark.asyncio
async def test_an_outage_means_no_matches_not_an_error(repository):
    def fail(request):
        raise httpx.ConnectError("offline", request=request)

    matches = await find_package_matches(
        repository, "Old Fashioned Oats", "Quaker", client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(fail))
    )
    assert matches == []


def test_structured_json_marks_the_match_and_the_miss():
    extraction = {"package_text": "QUAKER OLD FASHIONED OATS", "product_name": "Old Fashioned Oats", "brand_name": "Quaker", "confidence": 0.9}
    missing = package_structured_json(extraction, [])
    assert missing["nutrition_found"] is False and "calories" not in missing
    found = package_structured_json(extraction, [
        {"product_name": "Old Fashioned Oats", "brand_name": "Quaker", "calories": 150, "serving_size": "1/2 cup (40 g)",
         "macros": {"protein": 5, "carbs": 27, "fat": 3}, "data_source": "open_food_facts", "match_score": 1.0},
        {"product_name": "Old Fashioned Oats", "brand_name": "Great Value", "calories": 150, "data_source": "open_food_facts"},
    ])
    assert found["nutrition_from"] == "match" and found["calories"] == 150
    assert found["match_note"].startswith("Matched to Old Fashioned Oats from Open Food Facts")
    assert [alt["brand_name"] for alt in found["alternatives"]] == ["Great Value"]
    assert found["package_text"] == "QUAKER OLD FASHIONED OATS"


def test_possessive_brands_are_not_the_same_brand():
    lays = match_score("Classic Potato Chips", "Lay's", "Classic Potato Chips", "Lay's")
    herrs = match_score("Classic Potato Chips", "Lay's", "Classic Potato Chips", "Herr's")
    assert lays == 1.0 and herrs < lays and herrs < 0.75


@pytest.mark.parametrize(
    "package, brand, candidate, candidate_brand",
    [
        ("Greek Yogurt", "Chobani", "Plain Greek Yogurt", "Fage"),
        ("Chips", "Lay's", "Kale Chips", None),
        ("Strawberry Greek Yogurt", "Chobani", "Blueberry Greek Yogurt", "Chobani"),
    ],
)
def test_other_foods_and_flavours_do_not_pass(package, brand, candidate, candidate_brand):
    from backend.app.services.package_match import MIN_MATCH_SCORE

    assert match_score(package, brand, candidate, candidate_brand) < MIN_MATCH_SCORE


@pytest.mark.asyncio
async def test_a_broken_usda_reply_still_returns_open_food_facts_matches(repository):
    def handle(request):
        if request.url.host == "world.openfoodfacts.org":
            return httpx.Response(200, json={"products": [OATS]})
        return httpx.Response(200, text="<html>oops</html>")

    matches = await find_package_matches(
        repository, "Old Fashioned Oats", "Quaker", usda_api_key="k",
        client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle)),
    )
    assert matches and matches[0]["food_id"] == "off-0030000010204"


@pytest.mark.asyncio
async def test_saving_an_unchanged_bank_match_reuses_the_food(client, auth_headers, repository):
    repository.save_food_item(FoodItem(
        id="mine", name="Old Fashioned Oats", brand="Quaker", calories=140, serving_size=40, serving_unit="g",
        macros=MacroTargets(protein=5, carbs=27, fat=3), source="LABEL_SCAN",
    ))
    from backend.app.services.ingestion import create_scan_output, save_food_from_output, transition_output

    session = (await client.get("/api/auth/session", headers=auth_headers)).json()
    user_id = session["session"]["user_id"] if "session" in session else session["user_id"]
    structured = package_structured_json(
        {"package_text": "Quaker", "product_name": "Old Fashioned Oats", "brand_name": "Quaker", "confidence": 0.9},
        [{"product_name": "Old Fashioned Oats", "brand_name": "Quaker", "calories": 140, "serving_size": "40 g",
          "macros": {"protein": 5, "carbs": 27, "fat": 3}, "data_source": "food_bank", "food_id": "mine"}],
    )
    output = create_scan_output(repository, user_id, source_kind="camera_package", source_name="package-scan",
                                extracted_text="Quaker", structured_json=structured, confidence=0.9)
    transition_output(repository, user_id, output.id, "accepted")
    saved = await save_food_from_output(repository, user_id, output.id)
    assert [food.id for food in saved.saved_foods] == ["mine"]
    assert "mine" in repository.food_bank_ids(user_id)


def test_a_wordy_package_matches_the_short_database_name():
    package = "Zero Sugar Chocolate Instant Reduced Calorie Pudding & Pie Filling"
    assert match_score(package, "Jell-O", "Sugar Free Chocolate Instant Pudding", "Jell-O") >= 0.9
    assert match_score(package, "Jell-O", "Vanilla Instant Pudding", "Jell-O") < 0.6
