"""Create a Meal Plan: proposals (AI picks, Relish sizes) and creating the plan. No real calls."""

from datetime import date

import httpx
import pytest

from backend.app.services.meal_planner import (
    CreatePlanRequest,
    ProposeRequest,
    create_plan,
    meal_type_budget,
    plan_prompt,
    propose_meals,
)
from tests.conftest import isolated_test_settings
from tests.test_meal_suggest import _food, _onboard


def test_meal_size_follows_the_balance(repository):
    _onboard(repository)
    repository.update_user_preferences(user_id="u1", meals_per_day=3, meal_split=[25, 30, 45])  # Big dinner
    assert round(meal_type_budget(repository, "u1", "dinner").calories) == 675
    assert round(meal_type_budget(repository, "u1", "breakfast").protein) == 30


def test_prompt_has_preferences_but_no_personal_details(repository):
    _onboard(repository)
    budgets = {"dinner": meal_type_budget(repository, "u1", "dinner")}
    prompt = plan_prompt(meals=["dinner"], budgets=budgets, profile=repository.get_user_identity("u1"),
                         favourites=["Greek yogurt"], cooking_time="very_little", avoid=["Chicken rice bowl"],
                         no_data=["dragonfruit"], step_note="day 2 of 5")
    assert "sheet-pan" in prompt and "Greek yogurt" in prompt and "Chicken rice bowl" in prompt and "day 2 of 5" in prompt
    for private in ("u1@example.com", "170.2", "male", "1700"):
        assert private not in prompt


@pytest.mark.asyncio
async def test_proposals_are_complete_meals_and_retry_the_rest(repository):
    _onboard(repository)
    repository.save_food_item(_food("chicken", "Chicken breast grilled", 165, 31, 0, 3.6))
    repository.save_food_item(_food("rice", "Rice white cooked", 130, 2.7, 28, 0.3))
    repository.save_food_item(_food("oats", "Oats cooked", 70, 2.5, 12, 1.5))
    for food_id in ("chicken", "rice", "oats"):
        repository.add_to_food_bank(user_id="u1", food_id=food_id)
    prompts = []

    async def ask(prompt):
        prompts.append(prompt)
        if len(prompts) == 1:
            return {"meals": [
                {"meal": "dinner", "name": "Chicken and rice", "ingredients": [
                    {"name": "chicken breast grilled", "usda_query": "chicken breast grilled", "grams": 150, "role": "protein"},
                    {"name": "rice white cooked", "usda_query": "rice white cooked", "grams": 180, "role": "carb"}]},
                {"meal": "breakfast", "name": "Mystery bowl", "ingredients": [
                    {"name": "moon berries", "usda_query": "moon berries", "grams": 100, "role": "fruit"}]},
            ]}
        return {"meals": [{"meal": "breakfast", "name": "Porridge", "ingredients": [
            {"name": "oats cooked", "usda_query": "oats cooked", "grams": 250, "role": "carb"}]}]}

    result = await propose_meals(repository, isolated_test_settings(), "u1",
                                 ProposeRequest(meals=["breakfast", "dinner"], cooking_time="some"), ask=ask)
    by_meal = {proposal.meal: proposal for proposal in result.proposals}
    assert [proposal.meal for proposal in result.proposals] == ["breakfast", "dinner"]
    assert by_meal["dinner"].option.name == "Chicken and rice"
    assert by_meal["breakfast"].option.name == "Porridge"  # the incomplete one was asked again
    assert "moon berries" in prompts[1] and "Suggest exactly one meal for each of: Breakfast" in prompts[1]
    assert abs(by_meal["dinner"].option.totals.calories - by_meal["dinner"].budget.calories) <= 80


def _assignment(day, meal, title, on_conflict="keep"):
    return {"plan_date": day, "meal": meal, "title": title, "calories": 500, "on_conflict": on_conflict,
            "items": [{"name": "rice", "grams": 150, "calories": 195, "protein": 4, "carbs": 42, "fat": 0.5}]}


def test_avoid_list_is_trimmed_not_refused():
    request = ProposeRequest(meals=["lunch"], avoid_titles=[f"Meal {n}" for n in range(100)] + ["Meal 99", " "])
    assert len(request.avoid_titles) == 60 and request.avoid_titles[-1] == "Meal 99"


def test_create_plan_skips_past_days_and_ignores_eaten_slots(repository):
    _onboard(repository)
    tomorrow = (date.today().fromordinal(date.today().toordinal() + 1)).isoformat()
    day = repository.add_meal_plan_slot(user_id="u1", plan_date=date.fromisoformat(tomorrow), slot={
        "meal_label": "Breakfast", "title": "Eaten already", "calories": 400, "prep_status": "Flexible", "items": []})
    repository.update_meal_plan_slot_eaten_at("u1", day["slots"][0]["id"], __import__("datetime").datetime.now())
    result = create_plan(repository, "u1", CreatePlanRequest(assignments=[
        _assignment(tomorrow, "breakfast", "New breakfast"),
        _assignment("2020-01-01", "lunch", "Long ago"),
    ]))
    assert (result.created, result.kept) == (1, 0)


def test_create_plan_replaces_or_keeps_existing_meals(repository):
    _onboard(repository)
    repository.add_meal_plan_slot(user_id="u1", plan_date=date(2099, 11, 17), slot={
        "meal_label": "Dinner", "title": "Old dinner", "calories": 600, "prep_status": "Flexible", "items": []})
    repository.add_meal_plan_slot(user_id="u1", plan_date=date(2099, 11, 18), slot={
        "meal_label": "Dinner", "title": "Keep me", "calories": 600, "prep_status": "Flexible", "items": []})
    result = create_plan(repository, "u1", CreatePlanRequest(assignments=[
        _assignment("2099-11-17", "dinner", "New dinner", "replace"),
        _assignment("2099-11-18", "dinner", "Skipped dinner", "keep"),
        _assignment("2099-11-17", "lunch", "New lunch"),
    ]))
    assert (result.created, result.replaced, result.kept) == (2, 1, 1)
    days = {day["plan_date"]: [slot["title"] for slot in day["slots"]] for day in repository.list_meal_plan_days("u1")}
    assert days["2099-11-17"] == ["New dinner", "New lunch"]
    assert days["2099-11-18"] == ["Keep me"]


@pytest.mark.asyncio
async def test_plan_routes(client, auth_headers):
    response = await client.post("/api/coach/plan/create", headers=auth_headers, json={"assignments": [
        _assignment("2099-11-20", "breakfast", "Porridge")]})
    assert response.status_code == 200 and response.json()["created"] == 1
    propose = await client.post("/api/coach/plan/propose", headers=auth_headers, json={"meals": ["lunch"]})
    assert propose.status_code == 503  # no AI key in tests
    assert (await client.post("/api/coach/plan/propose", headers=auth_headers, json={"meals": []})).status_code == 422
