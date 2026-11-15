"""Serving weights from each food source, and scans landing in the food bank."""

import pytest

from backend.app.integrations.open_food_facts import product_to_label
from backend.app.integrations.usda import parse_usda_search_response


def _nutrients(kcal, protein, carbs, fat):
    return [
        {"nutrientName": "Energy", "value": kcal},
        {"nutrientName": "Protein", "value": protein},
        {"nutrientName": "Carbohydrate, by difference", "value": carbs},
        {"nutrientName": "Total lipid (fat)", "value": fat},
    ]


def test_usda_branded_results_are_per_serving_not_per_100g():
    # Search nutrients are per 100 g; before, they were stored as if per 32 g serving.
    [food] = parse_usda_search_response({"foods": [{
        "fdcId": 1, "description": "PEANUT BUTTER", "brandOwner": "Jif",
        "servingSize": 32, "servingSizeUnit": "g", "householdServingFullText": "2 tbsp",
        "foodNutrients": _nutrients(588, 25, 20, 50),
    }]})
    assert food.calories == 188.2  # 588 × 0.32
    assert (food.macros.protein, food.macros.carbs, food.macros.fat) == (8.0, 6.4, 16.0)
    assert (food.serving_size, food.serving_unit, food.serving_text) == (2, "tbsp", "2 tbsp (32 g)")
    assert (food.serving_grams, food.serving_basis) == (32, "g")


def test_usda_whole_foods_stay_per_100g_with_handy_portions():
    [food] = parse_usda_search_response({"foods": [{
        "fdcId": 2, "description": "Raspberries, raw",
        "foodNutrients": _nutrients(52, 1.2, 11.9, 0.7),
        "foodMeasures": [
            {"disseminationText": "1 cup", "gramWeight": 123},
            {"disseminationText": "Quantity not specified", "gramWeight": 100},
            {"disseminationText": "10 raspberries", "gramWeight": 19},
        ],
    }]})
    assert food.calories == 52
    assert (food.serving_size, food.serving_unit, food.serving_grams) == (100, "g", 100)
    assert [(p.label, p.grams) for p in food.portions] == [("1 cup", 123), ("10 raspberries", 19)]


def test_open_food_facts_keeps_the_serving_weight():
    product = {
        "product_name": "Granola Bar", "serving_size": "1 bar (40 g)", "serving_quantity": 40,
        "nutriments": {
            "energy-kcal_serving": 190, "proteins_serving": 4, "carbohydrates_serving": 29, "fat_serving": 7,
            "energy-kcal_100g": 475, "proteins_100g": 10, "carbohydrates_100g": 72.5, "fat_100g": 17.5,
        },
    }
    label = product_to_label(product, "00036000291452")
    assert (label["serving_grams"], label["serving_basis"]) == (40, "g")
    per_100 = product_to_label({**product, "serving_size": ""}, "00036000291452")
    assert (per_100["serving_grams"], per_100["serving_size"]) == (100, "100 g")


async def _save_scan(client, repository, headers, user_id, structured_json):
    job_id = repository.create_ingestion_job(user_id=user_id, source_kind="camera", source_name="label.jpg", status="pending_review")
    output = repository.save_ingestion_output(
        ingestion_job_id=job_id, extracted_text="", structured_json=structured_json, confidence=0.9
    )
    assert (await client.post(f"/api/ingestion/outputs/{output['id']}/accept", headers=headers)).status_code == 200
    saved = await client.post(f"/api/ingestion/outputs/{output['id']}/save-food", headers=headers)
    assert saved.status_code == 200
    return saved.json()["saved_foods"][0]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "extra, expected",
    [
        ({"serving_size": "2 tbsp (32 g)"}, (2, "tbsp", 32, "g")),
        ({"serving_size": "1 cup (240 ml)"}, (1, "cup", 240, "ml")),
        # The label reader's weight wins over the text.
        ({"serving_size": "1 bar", "serving_grams": 45}, (1, "bar", 45, "g")),
        # Single-serve packet with no weight in the serving: the net weight is the serving.
        ({"serving_size": "1 packet", "servings_per_container": 1, "net_weight_grams": 28}, (1, "packet", 28, "g")),
        # Nothing to go on: unknown, not guessed.
        ({"serving_size": "1 packet", "servings_per_container": 2, "net_weight_grams": 56}, (1, "packet", None, None)),
    ],
)
async def test_scans_save_the_serving_weight_and_go_into_the_bank(client, repository, auth_headers, extra, expected):
    user_id = (await client.get("/api/profile", headers=auth_headers)).json()["user_id"]
    base = {"product_name": "Snack", "calories": 150, "macros": {"protein": 3, "carbs": 20, "fat": 6}}
    food = await _save_scan(client, repository, auth_headers, user_id, {**base, **extra})
    assert (food["serving_size"], food["serving_unit"], food["serving_grams"], food["serving_basis"]) == expected
    assert food["serving_text"] == extra["serving_size"]
    assert food["in_bank"] is True
    assert food["id"] in repository.food_bank_ids(user_id)
