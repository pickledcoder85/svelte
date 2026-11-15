"""Barcode lookup: validation, Open Food Facts / USDA mapping, the lookup service, and saving.

Every external call goes through httpx.MockTransport or a monkeypatched fetch, so tests never
reach the real food databases.
"""

import httpx
import pytest

from backend.app.integrations.barcodes import (
    InvalidBarcodeError,
    expand_upc_e,
    gtin_check_digit_ok,
    lookup_forms,
    normalize_barcode,
)
from backend.app.integrations.open_food_facts import OFF_USER_AGENT, product_to_label
from backend.app.integrations.usda import branded_food_to_label
from backend.app.services import barcodes as barcode_service
from backend.app.services.barcodes import NOT_FOUND_MESSAGE, lookup_barcode

UPC_A = "036000291452"
GTIN = "00036000291452"

OFF_PRODUCT = {
    "code": "0036000291452",
    "product_name": "Crunchy Granola Bar",
    "brands": "Trail Co, Trail Co Foods",
    "serving_size": "1 bar (40 g)",
    "nutriments": {
        "energy-kcal_serving": 190,
        "proteins_serving": 4,
        "carbohydrates_serving": 29,
        "fat_serving": 7,
        "energy-kcal_100g": 475,
        "proteins_100g": 10,
        "carbohydrates_100g": 72.5,
        "fat_100g": 17.5,
    },
}


def _client_factory(handler):
    return lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler))


# --- validation -------------------------------------------------------------------------------


def test_check_digits_and_normalisation():
    assert gtin_check_digit_ok(UPC_A)
    assert not gtin_check_digit_ok("036000291453")
    assert normalize_barcode(UPC_A) == GTIN
    assert normalize_barcode("4006381333931") == "04006381333931"  # EAN-13
    assert normalize_barcode("96385074") == "00000096385074"  # EAN-8
    assert normalize_barcode(" 0360-0029 1452 ") == GTIN  # spaces and dashes ignored


def test_upc_e_expands_to_upc_a():
    assert expand_upc_e("04252614") == "042100005264"
    assert normalize_barcode("04252614") == "00042100005264"


@pytest.mark.parametrize("raw", ["", "abc", "12345", "036000291453", "1234567890"])
def test_invalid_codes_are_rejected(raw):
    with pytest.raises(InvalidBarcodeError):
        normalize_barcode(raw)


def test_lookup_forms_try_ean13_then_upc_a():
    assert lookup_forms(GTIN) == ["0036000291452", UPC_A]
    assert lookup_forms("04006381333931") == ["4006381333931"]
    assert lookup_forms("00000096385074") == ["0000096385074", "000096385074", "96385074"]


# --- mapping ----------------------------------------------------------------------------------


def test_open_food_facts_prefers_per_serving_values():
    label = product_to_label(OFF_PRODUCT, GTIN)
    assert label["product_name"] == "Crunchy Granola Bar"
    assert label["brand_name"] == "Trail Co"
    assert label["serving_size"] == "1 bar (40 g)"
    assert label["calories"] == 190
    assert label["macros"] == {"protein": 4, "carbs": 29, "fat": 7}
    assert label["barcode"] == GTIN
    assert label["data_source"] == "open_food_facts"
    assert "Open Food Facts" in label["attribution"]


def test_open_food_facts_falls_back_to_per_100g():
    product = {**OFF_PRODUCT, "serving_size": ""}
    label = product_to_label(product, GTIN)
    assert label["serving_size"] == "100 g"
    assert label["calories"] == 475


def test_open_food_facts_without_nutrition_is_unusable():
    assert product_to_label({"product_name": "Mystery", "nutriments": {}}, GTIN) is None
    assert product_to_label({"nutriments": OFF_PRODUCT["nutriments"]}, GTIN) is None


def test_usda_branded_food_converts_to_per_serving():
    food = {
        "description": "GRANOLA BAR",
        "brandOwner": "Trail Co",
        "servingSize": 40,
        "servingSizeUnit": "g",
        "householdServingFullText": "1 bar",
        "gtinUpc": UPC_A,
        "foodNutrients": [
            {"nutrientName": "Energy", "value": 475},
            {"nutrientName": "Protein", "value": 10},
            {"nutrientName": "Carbohydrate, by difference", "value": 72.5},
            {"nutrientName": "Total lipid (fat)", "value": 17.5},
        ],
    }
    label = branded_food_to_label(food, GTIN)
    assert label["product_name"] == "Granola Bar"
    assert label["serving_size"] == "1 bar (40 g)"
    assert label["calories"] == 190
    assert label["macros"] == {"protein": 4, "carbs": 29, "fat": 7}
    assert label["data_source"] == "usda"


# --- lookup service ---------------------------------------------------------------------------


def _user_id(repository) -> str:
    repository.ensure_user_identity(user_id="user-owner", email="owner@example.com", display_name="Owner")
    return "user-owner"


@pytest.mark.asyncio
async def test_open_food_facts_match_creates_a_barcode_scan(repository):
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"status": 1, "product": OFF_PRODUCT})

    user_id = _user_id(repository)
    result = await lookup_barcode(repository, user_id, UPC_A, client_factory=_client_factory(handler))

    assert result.found and result.source == "open_food_facts"
    assert result.output.structured_json["barcode"] == GTIN
    assert result.output.review_state == "pending"
    # Only the barcode goes out, with the generic app name.
    assert seen[0].url.path == "/api/v2/product/0036000291452.json"
    assert seen[0].headers["User-Agent"] == OFF_USER_AGENT
    job = repository.get_ingestion_job(result.output.ingestion_job_id)
    assert job["source_kind"] == "barcode"


@pytest.mark.asyncio
async def test_unknown_barcode_tries_each_form_then_reports_not_found(repository):
    paths = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        return httpx.Response(404, json={"status": 0})

    result = await lookup_barcode(repository, _user_id(repository), UPC_A, client_factory=_client_factory(handler))

    assert not result.found and result.message == NOT_FOUND_MESSAGE
    assert paths == ["/api/v2/product/0036000291452.json", f"/api/v2/product/{UPC_A}.json"]


@pytest.mark.asyncio
async def test_open_food_facts_outage_says_so(repository):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    result = await lookup_barcode(repository, _user_id(repository), UPC_A, client_factory=_client_factory(handler))

    assert not result.found
    assert "couldn't be reached" in result.message


@pytest.mark.asyncio
async def test_usda_is_tried_when_open_food_facts_misses_and_a_key_is_set(repository):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "world.openfoodfacts.org":
            return httpx.Response(404)
        assert request.url.params["dataType"] == "Branded"
        return httpx.Response(200, json={"foods": [{
            "description": "Granola Bar",
            "gtinUpc": UPC_A,
            "servingSize": 40,
            "servingSizeUnit": "g",
            "foodNutrients": [{"nutrientName": "Energy", "value": 475}],
        }]})

    result = await lookup_barcode(
        repository, _user_id(repository), UPC_A, usda_api_key="test-key", client_factory=_client_factory(handler)
    )

    assert result.found and result.source == "usda"
    assert result.output.structured_json["calories"] == 190


@pytest.mark.asyncio
async def test_saved_barcode_comes_from_the_food_bank_without_network(repository):
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("should not call out for a saved barcode")

    from backend.app.models.nutrition import FoodItem, MacroTargets

    repository.save_food_item(FoodItem(
        id="food-bar", name="Granola Bar", calories=190, serving_size=40, serving_unit="g",
        macros=MacroTargets(protein=4, carbs=29, fat=7), source="OPEN_FOOD_FACTS", barcode=GTIN,
    ))

    result = await lookup_barcode(repository, _user_id(repository), UPC_A, client_factory=_client_factory(handler))

    assert result.found and result.source == "food_bank"
    assert result.food.id == "food-bar"


# --- route and save ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_route_requires_a_session(client):
    response = await client.post("/api/nutrition/barcode-lookups", json={"code": UPC_A})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_route_rejects_a_bad_code(client, auth_headers):
    response = await client.post("/api/nutrition/barcode-lookups", json={"code": "036000291453"}, headers=auth_headers)
    assert response.status_code == 400
    assert "didn't read correctly" in response.json()["detail"]


@pytest.mark.asyncio
async def test_saving_a_barcode_scan_keeps_the_barcode_and_does_not_duplicate(client, auth_headers, monkeypatch):
    async def fake_fetch(code, client):
        return OFF_PRODUCT

    monkeypatch.setattr(barcode_service, "fetch_product", fake_fetch)

    async def scan():
        lookup = await client.post("/api/nutrition/barcode-lookups", json={"code": UPC_A}, headers=auth_headers)
        assert lookup.status_code == 200
        assert lookup.json()["source"] == "open_food_facts"
        return lookup.json()["output"]["id"]

    async def save(output_id):
        accepted = await client.post(f"/api/ingestion/outputs/{output_id}/accept", headers=auth_headers)
        assert accepted.status_code == 200
        saved = await client.post(f"/api/ingestion/outputs/{output_id}/save-food", headers=auth_headers)
        assert saved.status_code == 200
        return saved.json()["saved_foods"][0]

    # Two scans of the same product before either is saved.
    first_scan, second_scan = await scan(), await scan()
    first = await save(first_scan)
    assert first["barcode"] == GTIN
    assert first["source"] == "OPEN_FOOD_FACTS"
    assert first["calories"] == 190

    second = await save(second_scan)
    assert second["id"] == first["id"]

    # Once saved, the same barcode comes straight from the food bank.
    again = await client.post("/api/nutrition/barcode-lookups", json={"code": UPC_A}, headers=auth_headers)
    assert again.json()["source"] == "food_bank"
    assert again.json()["food"]["id"] == first["id"]


# --- quick add from Today --------------------------------------------------------------------


@pytest.mark.asyncio
async def test_quick_add_saves_the_food_to_the_bank_in_one_step(repository):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": 1, "product": OFF_PRODUCT})

    user_id = _user_id(repository)
    result = await barcode_service.food_for_barcode(repository, user_id, UPC_A, client_factory=_client_factory(handler))

    assert result.found and result.source == "open_food_facts"
    [food] = result.foods
    assert food.name == "Crunchy Granola Bar" and food.calories == 190 and food.barcode == GTIN
    assert food.serving_grams == 40
    assert food.id in repository.food_bank_ids(user_id)

    def fail(request: httpx.Request) -> httpx.Response:
        raise AssertionError("a saved barcode must not call Open Food Facts again")

    again = await barcode_service.food_for_barcode(repository, user_id, UPC_A, client_factory=_client_factory(fail))
    assert again.source == "food_bank" and again.foods[0].id == food.id


@pytest.mark.asyncio
async def test_quick_add_not_found_says_to_photograph_the_label(repository):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"status": 0})

    result = await barcode_service.food_for_barcode(
        repository, _user_id(repository), UPC_A, client_factory=_client_factory(handler)
    )
    assert not result.found and result.foods == [] and result.message == NOT_FOUND_MESSAGE


@pytest.mark.asyncio
async def test_quick_add_route_rejects_a_bad_code(client, auth_headers):
    response = await client.post("/api/nutrition/barcode-foods", headers=auth_headers, json={"code": "036000291453"})
    assert response.status_code == 400
