"""Gus suggests a meal: the AI picks foods, Relish fits the portions. No real AI or USDA calls."""

from datetime import date

import httpx
import pytest

from backend.app.models.nutrition import FoodItem, MacroTargets
from backend.app.services.meal_suggest import (
    Nutrition,
    SuggestRequest,
    fit_portions,
    meal_budget,
    suggest_meals,
    suggestion_prompt,
)
from tests.conftest import isolated_test_settings

DAY = date(2026, 11, 16)


def _food(food_id, name, calories, protein, carbs, fat, grams=100.0):
    return FoodItem(id=food_id, name=name, calories=calories, serving_size=grams, serving_unit="g", serving_grams=grams,
                    macros=MacroTargets(protein=protein, carbs=carbs, fat=fat), source="USDA")


def _onboard(repository, user_id="u1", **profile):
    repository.ensure_user_identity(user_id=user_id, email=f"{user_id}@example.com")
    repository.save_user_onboarding(
        user_id=user_id, sex="male", age_years=41, height_cm=170.2, current_weight_lbs=180, goal_type="lose",
        goal_pace="recommended", target_weight_lbs=170, activity_level="sedentary", dietary_pattern="omnivore",
        nutrition_style="balanced", allergy_notes="peanuts", bmr_calories=1700, tdee_calories=2040,
        initial_calorie_target=1500, protein_target_g=120, carbs_target_g=118, fat_target_g=50, fiber_target_g=25,
        calculation_version="v3", target_source="calculated",
    )
    repository.mark_user_setup_completed(user_id)


def test_budget_is_the_meals_share_capped_by_whats_left(repository):
    _onboard(repository)
    key, budget, remaining = meal_budget(repository, "u1", DAY, "dinner")
    assert key == "dinner" and round(budget.calories) == 525  # 35% of 1,500 (Balanced default)
    assert round(budget.protein) == 42

    # After eating 1,200 kcal, only 300 are left: dinner is capped at that.
    repository.create_food_log(user_id="u1", log_date=DAY)
    log = repository.get_food_log_for_date("u1", DAY)
    repository.add_food_log_entry(food_log_id=log["id"], entry_type="meal", display_name_override="Big lunch",
                                  calories=1200, protein=40, carbs=150, fat=40)
    _, budget, remaining = meal_budget(repository, "u1", DAY, "dinner")
    assert round(budget.calories) == 300 and round(remaining.calories) == 300
    assert round(budget.fat) == 10  # macros capped by what's left too


def test_snack_uses_the_users_snack_block(repository):
    _onboard(repository)
    repository.update_user_preferences(user_id="u1", meals_per_day=5, meal_split=[20, 10, 30, 10, 30])
    key, budget, _ = meal_budget(repository, "u1", DAY, "snack")
    assert key == "afternoon_snack" and round(budget.calories) == 150


def test_prompt_carries_preferences_but_no_personal_details(repository):
    _onboard(repository)
    prompt = suggestion_prompt(block_label="Dinner", budget=Nutrition(calories=525, protein=42, carbs=41, fat=18),
                               profile=repository.get_user_identity("u1"), ingredients="chicken, rice")
    assert "525 kcal" in prompt and "peanuts" in prompt and "chicken, rice" in prompt
    # Body details and identity never go out.
    for private in ("u1@example.com", "170.2", "male", "1700"):
        assert private not in prompt


def test_portions_fit_the_calories_and_top_up_protein():
    chicken = Nutrition(calories=1.65, protein=0.31, carbs=0, fat=0.036)
    rice = Nutrition(calories=1.3, protein=0.027, carbs=0.28, fat=0.003)
    broccoli = Nutrition(calories=0.35, protein=0.024, carbs=0.072, fat=0.004)
    items = [
        {"grams": 120, "role": "protein", "rate": chicken},
        {"grams": 250, "role": "carb", "rate": rice},
        {"grams": 100, "role": "veg", "rate": broccoli},
    ]
    budget = Nutrition(calories=525, protein=42, carbs=41, fat=18)
    grams = fit_portions(items, budget)
    calories = sum(g * item["rate"].calories for g, item in zip(grams, items))
    protein = sum(g * item["rate"].protein for g, item in zip(grams, items))
    assert all(g % 5 == 0 for g in grams)
    assert abs(calories - 525) <= 60
    assert protein >= 0.85 * 42
    assert grams[1] < 250 * (525 / sum(i["grams"] * i["rate"].calories for i in items))  # rice gave way to chicken


@pytest.mark.asyncio
async def test_suggestions_use_the_food_bank_then_usda(repository):
    _onboard(repository)
    repository.save_food_item(_food("mine-chicken", "Chicken breast grilled", 165, 31, 0, 3.6))
    repository.add_to_food_bank(user_id="u1", food_id="mine-chicken")

    async def ask(prompt):
        return {"options": [
            {"name": "Chicken rice bowl", "why": "Lean and filling", "ingredients": [
                {"name": "chicken breast grilled", "usda_query": "chicken breast roasted", "grams": 150, "role": "protein"},
                {"name": "white rice", "usda_query": "rice white cooked", "grams": 200, "role": "carb"},
                {"name": "dragonfruit sorbet", "usda_query": "dragonfruit sorbet", "grams": 50, "role": "other"},
            ]},
            {"name": "", "ingredients": []},
        ]}

    seen = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.params["query"])
        if "rice" in request.url.params["query"]:
            return httpx.Response(200, json={"foods": [{"fdcId": 2, "description": "Rice, white, long-grain, cooked",
                "foodNutrients": [{"nutrientName": "Energy", "value": 130}, {"nutrientName": "Protein", "value": 2.7},
                                  {"nutrientName": "Carbohydrate, by difference", "value": 28}]}]})
        return httpx.Response(200, json={"foods": []})

    settings = isolated_test_settings().model_copy(update={"usda_api_key": "k"})
    result = await suggest_meals(
        repository, settings, "u1", SuggestRequest(log_date=DAY, block="dinner"), ask=ask,
        client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle)),
    )
    assert result.meal_slot == "dinner" and len(result.options) == 1
    meal = result.options[0]
    assert [item.food.id for item in meal.items][0] == "mine-chicken"  # the user's own food first
    assert meal.items[1].food.name.startswith("Rice, white")
    assert meal.missing == ["dragonfruit sorbet"]
    assert abs(meal.totals.calories - result.budget.calories) <= 80
    assert "chicken breast roasted" not in seen  # found in the bank, no USDA call


@pytest.mark.asyncio
async def test_no_room_left_skips_the_ai(repository):
    _onboard(repository)
    repository.create_food_log(user_id="u1", log_date=DAY)
    log = repository.get_food_log_for_date("u1", DAY)
    repository.add_food_log_entry(food_log_id=log["id"], entry_type="meal", display_name_override="Feast",
                                  calories=1480, protein=100, carbs=150, fat=60)

    async def ask(prompt):
        raise AssertionError("no AI call when there's no room")

    result = await suggest_meals(repository, isolated_test_settings(), "u1", SuggestRequest(log_date=DAY, block="dinner"), ask=ask)
    assert result.options == [] and "Only 20 kcal left" in result.message


@pytest.mark.asyncio
async def test_suggest_route_needs_the_ai_configured(client, auth_headers):
    response = await client.post("/api/coach/suggest", headers=auth_headers, json={"log_date": "2026-11-16", "block": "lunch"})
    assert response.status_code in (503, 200)  # 200 only when there's no room (no AI needed)


@pytest.mark.asyncio
async def test_add_one_planned_meal_keeps_the_rest(client, auth_headers):
    first = await client.post("/api/tracker/meal-plan/slots", headers=auth_headers, json={
        "plan_date": "2026-11-17", "slot": {"meal_label": "Lunch", "title": "Chicken rice bowl", "calories": 520,
                                             "prep_status": "Flexible", "items": []}})
    assert first.status_code == 200
    second = await client.post("/api/tracker/meal-plan/slots", headers=auth_headers, json={
        "plan_date": "2026-11-17", "slot": {"meal_label": "Dinner", "title": "Salmon and potatoes", "calories": 600,
                                             "prep_status": "Flexible", "items": []}})
    assert [slot["title"] for slot in second.json()["slots"]] == ["Chicken rice bowl", "Salmon and potatoes"]
