"""Photos of food: the AI names items and portions; USDA gives the nutrition. No real calls."""

import httpx
import pytest

from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.services import vision
from backend.app.services.plate_match import pick_generic_food, resolve_plate_items
from backend.app.services.vision import analyze_scan_image
from tests.conftest import TINY_PNG_BASE64, isolated_test_settings

PLATE = {
    "kind": "meal_plate",
    "items": [
        {"name": "grilled chicken breast", "usda_query": "chicken breast roasted", "estimated_grams": 150,
         "calories": 250, "protein": 45, "carbs": 0, "fat": 6},
        {"name": "white rice", "usda_query": "rice white cooked", "estimated_grams": 180,
         "calories": 230, "protein": 4, "carbs": 50, "fat": 0.5},
        {"name": "", "estimated_grams": 10},
        {"name": "a sauce", "estimated_grams": 0},
    ],
}


def _food(name, calories, grams=100):
    return FoodItem(id=f"usda-{name}", name=name, calories=calories, serving_size=grams, serving_unit="g",
                    serving_grams=grams, macros=MacroTargets(protein=1, carbs=1, fat=1), source="USDA")


@pytest.mark.parametrize(
    "query, names, expected",
    [
        # Cooked never matches raw or dry (raw rice is ~2.8x the calories per gram).
        ("rice white cooked", ["Rice, white, long-grain, regular, raw, enriched", "Rice, white, long-grain, regular, cooked"],
         "Rice, white, long-grain, regular, cooked"),
        ("chicken breast roasted", ["Chicken, broiler, breast, meat only, raw", "Chicken, broiler, breast, meat only, cooked, roasted"],
         "Chicken, broiler, breast, meat only, cooked, roasted"),
        ("pasta cooked", ["Pasta, dry, enriched", "Pasta, cooked, enriched, without added salt"], "Pasta, cooked, enriched, without added salt"),
        # A different food from the same ingredient is never picked.
        ("white rice", ["Rice cakes, brown rice, plain", "Rice, white, medium-grain, cooked"], "Rice, white, medium-grain, cooked"),
        ("chicken", ["Chicken nuggets, frozen", "Chicken, skin only", "Chicken, broilers or fryers, meat only, roasted"],
         "Chicken, broilers or fryers, meat only, roasted"),
        # Plurals: potatoes and tomatoes.
        ("baked potato", ["Potatoes, baked, flesh and skin"], "Potatoes, baked, flesh and skin"),
        ("tomato", ["Tomatoes, red, ripe, raw"], "Tomatoes, red, ripe, raw"),
        # Fruit and vegetables are fine raw.
        ("apple", ["Apples, raw, with skin"], "Apples, raw, with skin"),
        ("white rice", ["Brown rice, cooked"], None),
    ],
)
def test_pick_generic_food_with_real_usda_names(query, names, expected):
    foods = [_food(name, 100 + index) for index, name in enumerate(names)]
    picked = pick_generic_food(query, foods)
    assert (picked.name if picked else None) == expected


def test_pick_generic_food_needs_the_words_and_a_weight():
    foods = [_food("Pudding, chocolate", 120), _food("Chicken, broiler, breast, meat only, roasted", 165)]
    assert pick_generic_food("chicken breast roasted", foods).calories == 165
    assert pick_generic_food("salmon", foods) is None
    no_weight = FoodItem(id="x", name="Chicken breast roasted", calories=165, serving_size=1, serving_unit="piece",
                         macros=MacroTargets(protein=1, carbs=1, fat=1), source="USDA")
    assert pick_generic_food("chicken breast roasted", [no_weight]) is None


@pytest.mark.asyncio
async def test_plate_items_are_parsed_and_capped(monkeypatch, repository):
    async def fake(settings, image_url, instructions):
        assert "meal_plate" in instructions
        return PLATE

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    settings = isolated_test_settings().model_copy(update={"openai_api_key": "test"})
    kind, items, _ = await analyze_scan_image(TINY_PNG_BASE64, repository, settings)
    assert kind == "meal_plate"
    assert [item["name"] for item in items] == ["grilled chicken breast", "white rice"]  # unusable rows dropped
    assert items[0]["estimate"]["calories"] == 250


@pytest.mark.asyncio
async def test_a_huge_portion_is_capped_at_the_same_calories_per_gram(monkeypatch, repository):
    async def fake(settings, image_url, instructions):
        return {"kind": "meal_plate", "items": [
            {"name": "lasagna", "estimated_grams": 4000, "calories": 6000, "protein": 2000, "carbs": float("inf"), "fat": -5}
        ]}

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    settings = isolated_test_settings().model_copy(update={"openai_api_key": "test"})
    _, items, _ = await analyze_scan_image(TINY_PNG_BASE64, repository, settings)
    assert items[0]["estimated_grams"] == 2000
    assert items[0]["estimate"] == {"calories": 3000, "protein": 1000, "carbs": 0.0, "fat": 0.0}


@pytest.mark.asyncio
async def test_each_item_is_looked_up_in_usda_generic_foods(repository):
    seen = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        body = __import__("json").loads(request.content)
        assert body["dataType"] == ["Foundation", "SR Legacy", "Survey (FNDDS)"]
        query = body["query"]
        if "chicken" in query:
            foods = [{"fdcId": 1, "description": "Chicken, broiler, breast, meat only, roasted",
                      "foodNutrients": [{"nutrientName": "Energy", "value": 165}]}]
        else:
            foods = []
        return httpx.Response(200, json={"foods": foods})

    items = [
        {"name": "grilled chicken breast", "usda_query": "chicken breast roasted", "estimated_grams": 150, "estimate": {}},
        {"name": "white rice", "usda_query": "rice white cooked", "estimated_grams": 180, "estimate": {}},
    ]
    resolved = await resolve_plate_items(
        repository, items, usda_api_key="k", client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))
    )
    assert resolved[0]["food"].calories == 165 and resolved[0]["food"].serving_grams == 100
    assert repository.get_food_by_id(resolved[0]["food"].id) is not None  # saved, so it can be logged
    assert resolved[1]["food"] is None  # no match: the app uses the estimate
    assert len(seen) == 2


@pytest.mark.asyncio
async def test_without_a_key_nothing_is_looked_up(repository):
    resolved = await resolve_plate_items(repository, [{"name": "apple", "usda_query": "apple", "estimated_grams": 180, "estimate": {}}])
    assert resolved[0]["food"] is None


@pytest.mark.asyncio
async def test_scan_route_returns_plate_items_and_saves_no_scan(app, client, auth_headers, monkeypatch):
    async def fake(settings, image_url, instructions):
        return PLATE

    monkeypatch.setattr(vision, "_request_vision_json", fake)
    app.state.settings = app.state.settings.model_copy(update={"openai_api_key": "test", "usda_api_key": ""})
    body = (await client.post("/api/vision/scan", headers=auth_headers, json={"image_base64": TINY_PNG_BASE64})).json()
    assert body["kind"] == "meal_plate" and body["output_id"] is None
    assert [item["estimated_grams"] for item in body["items"]] == [150, 180]
    assert body["items"][1]["estimate"]["carbs"] == 50


@pytest.mark.parametrize(
    "query, names, expected",
    [
        ("chicken thigh roasted", ["Chicken, skin (drumsticks and thighs), cooked, roasted",
                                   "Chicken, broilers or fryers, thigh, meat only, cooked, roasted"],
         "Chicken, broilers or fryers, thigh, meat only, cooked, roasted"),
        ("chicken breast roasted", ["Chicken breast, roll, oven-roasted", "Chicken, broilers or fryers, breast, meat only, cooked, roasted"],
         "Chicken, broilers or fryers, breast, meat only, cooked, roasted"),
        ("oats cooked", ["Oat bran, cooked", "Oat milk", "Cereals, oats, regular and quick, not fortified, cooked with water, without salt"],
         "Cereals, oats, regular and quick, not fortified, cooked with water, without salt"),
        ("potato baked", ["Potatoes, baked, flesh and skin, without salt"], "Potatoes, baked, flesh and skin, without salt"),
        ("apple", ["Apples, raw, with skin"], "Apples, raw, with skin"),
        ("milk", ["Milk, whole, 3.25% milkfat"], "Milk, whole, 3.25% milkfat"),
    ],
)
def test_processed_or_partial_foods_are_not_matched(query, names, expected):
    foods = [_food(name, 100 + index) for index, name in enumerate(names)]
    picked = pick_generic_food(query, foods)
    assert (picked.name if picked else None) == expected


DELI = "Chicken breast, oven-roasted, fat-free, sliced"
PLAIN = "Chicken, broilers or fryers, breast, meat only, cooked, roasted"


@pytest.mark.parametrize(
    "query, names, expected",
    [
        # Plain chicken breast prefers the plain cooked food, even when USDA ranks deli first...
        ("chicken breast", [DELI, PLAIN], PLAIN),
        ("chicken breast cooked", [DELI, PLAIN], PLAIN),
        # ...but uses deli when that's all there is.
        ("chicken breast", [DELI], DELI),
        # Asking for deli or a sandwich prefers it.
        ("deli chicken breast", [PLAIN, DELI], DELI),
        ("sliced chicken breast", [PLAIN, DELI], DELI),
        ("chicken breast for sandwich", [PLAIN, DELI], DELI),
        ("deli turkey", ["Turkey, sliced, prepackaged, light meat"], "Turkey, sliced, prepackaged, light meat"),
        # Broccoli raab is a different vegetable, unless asked for (by any of its names).
        ("broccoli cooked", ["Broccoli raab, cooked", "Broccoli, cooked, boiled, drained, without salt"],
         "Broccoli, cooked, boiled, drained, without salt"),
        ("broccoli", ["Broccoli raab, cooked"], None),
        ("broccoli rabe cooked", ["Broccoli raab, cooked"], "Broccoli raab, cooked"),
        ("rapini", ["Broccoli raab, raw"], "Broccoli raab, raw"),
    ],
)
def test_deli_and_lookalike_foods_match_only_what_was_asked(query, names, expected):
    foods = [_food(name, 100 + index) for index, name in enumerate(names)]
    picked = pick_generic_food(query, foods)
    assert (picked.name if picked else None) == expected


@pytest.mark.asyncio
async def test_generic_search_sends_food_types_in_a_json_body(repository):
    import json

    from backend.app.integrations.usda import GENERIC_DATA_TYPES, search_usda_foods

    seen = []

    def handle(request):
        seen.append(request)
        return httpx.Response(200, json={"foods": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        await search_usda_foods("oats cooked", "k", client=client, data_types=GENERIC_DATA_TYPES)
        await search_usda_foods("oats", "k", client=client)
    assert seen[0].method == "POST" and json.loads(seen[0].content)["dataType"] == ["Foundation", "SR Legacy", "Survey (FNDDS)"]
    assert "dataType" not in seen[0].url.params
    assert seen[1].method == "GET"
