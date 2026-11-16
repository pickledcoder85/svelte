"""Gus suggests a meal.

The AI only chooses foods (and rough amounts) that suit the meal, the user's diet, style, and
allergies, and anything they say they have. Relish does the numbers: each ingredient is looked
up (the user's food bank first, then USDA generic foods), and the portions are scaled to the
meal's budget: its share of the daily target (Settings → Meals per day), capped by what's left
today, with protein topped up first when it falls short.
"""
from __future__ import annotations

import asyncio
import logging
import math
import re
from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field

from backend.app.config import Settings
from backend.app.integrations.usda import GENERIC_DATA_TYPES, search_usda_foods
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.meal_split import LABELS, MEAL_PATTERNS, resolve_split
from backend.app.services.plate_match import pick_generic_food

logger = logging.getLogger(__name__)

BlockKey = Literal["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "snack"]
MAX_INGREDIENTS = 6
MIN_BUDGET_CALORIES = 80
GRAM_STEP = 5
ROLES = ("protein", "carb", "veg", "fat", "fruit", "other")


class SuggestRequest(BaseModel):
    log_date: date
    block: BlockKey
    ingredients: str | None = Field(default=None, max_length=300)


class Nutrition(BaseModel):
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0


class SuggestedItem(BaseModel):
    name: str
    grams: float
    role: str = "other"
    food: FoodItem
    nutrition: Nutrition


class SuggestedMeal(BaseModel):
    name: str
    why: str = ""
    items: list[SuggestedItem]
    totals: Nutrition
    missing: list[str] = Field(default_factory=list)


class SuggestResponse(BaseModel):
    block: str
    block_label: str
    meal_slot: Literal["breakfast", "lunch", "dinner", "snack"]
    budget: Nutrition
    remaining: Nutrition
    options: list[SuggestedMeal] = Field(default_factory=list)
    message: str | None = None


# ---- the day's numbers -------------------------------------------------------------------------


def _targets(repository: SQLiteRepository, user_id: str, on: date) -> Nutrition:
    """The goal in effect on that day, else the profile's targets."""
    for goal in repository.list_user_goals(user_id):
        if str(goal.get("effective_at", ""))[:10] <= on.isoformat():
            return Nutrition(
                calories=goal["calorie_goal"], protein=goal["protein_goal"], carbs=goal["carbs_goal"], fat=goal["fat_goal"]
            )
    profile = repository.get_user_identity(user_id) or {}
    return Nutrition(
        calories=profile.get("initial_calorie_target") or 0,
        protein=profile.get("protein_target_g") or 0,
        carbs=profile.get("carbs_target_g") or 0,
        fat=profile.get("fat_target_g") or 0,
    )


def _eaten(repository: SQLiteRepository, user_id: str, on: date) -> Nutrition:
    log = repository.get_food_log_for_date(user_id, on)
    entries = repository.list_food_log_entries(log["id"]) if log else []
    return Nutrition(
        calories=sum(entry["calories"] for entry in entries),
        protein=sum(entry["protein"] for entry in entries),
        carbs=sum(entry["carbs"] for entry in entries),
        fat=sum(entry["fat"] for entry in entries),
    )


def _workout_bonus(repository: SQLiteRepository, user_id: str, on: date, share: int) -> float:
    calories = sum(entry["calories_burned"] for entry in repository.list_exercise_entries(user_id) if entry["logged_on"] == on.isoformat())
    return round(calories * share / 100 / 10) * 10


def _block(profile: dict[str, Any], requested: str) -> tuple[str, int]:
    """The block's key and percent. "snack" means the user's next snack block (or 10%)."""
    count, split = resolve_split(profile.get("meals_per_day"), profile.get("meal_split"))
    keys = MEAL_PATTERNS[count]
    if requested == "snack":
        snacks = [key for key in keys if key.endswith("snack")]
        if not snacks:
            return "snack", 10
        requested = snacks[-1]
    if requested not in keys:
        # A snack block the user's pattern doesn't have: treat it as a 10% snack.
        return requested, 10 if requested.endswith("snack") else 33
    return requested, split[keys.index(requested)]


def meal_budget(repository: SQLiteRepository, user_id: str, on: date, requested: str) -> tuple[str, Nutrition, Nutrition]:
    """(block key, the meal's budget, what's left today). The budget is the block's share of
    the day's targets, capped by what's left (allowance with workouts, minus eaten)."""
    profile = repository.get_user_identity(user_id) or {}
    targets = _targets(repository, user_id, on)
    eaten = _eaten(repository, user_id, on)
    bonus = _workout_bonus(repository, user_id, on, int(profile.get("workout_calories_share") or 0))
    remaining = Nutrition(
        calories=max(0.0, targets.calories + bonus - eaten.calories),
        protein=max(0.0, targets.protein - eaten.protein),
        carbs=max(0.0, targets.carbs - eaten.carbs),
        fat=max(0.0, targets.fat - eaten.fat),
    )
    key, percent = _block(profile, requested)
    share = percent / 100
    budget = Nutrition(
        calories=min(targets.calories * share, remaining.calories),
        protein=min(targets.protein * share, remaining.protein) if remaining.protein else targets.protein * share * 0.5,
        carbs=min(targets.carbs * share, remaining.carbs),
        fat=min(targets.fat * share, remaining.fat),
    )
    return key, budget, remaining


# ---- the AI's picks ----------------------------------------------------------------------------


def suggestion_prompt(
    *, block_label: str, budget: Nutrition, profile: dict[str, Any], ingredients: str | None
) -> str:
    """What Gus is asked. Only meal preferences go out: no name, email, or body details."""
    diet = profile.get("dietary_pattern") or "omnivore"
    style = profile.get("nutrition_style") or "balanced"
    allergies = (profile.get("allergy_notes") or "none").strip() or "none"
    have = (ingredients or "").strip()
    return f"""
You are Gus, a friendly nutrition coach. Suggest exactly 2 different {block_label.lower()} options.
Target for this meal: about {round(budget.calories)} kcal, {round(budget.protein)} g protein, {round(budget.carbs)} g carbs, {round(budget.fat)} g fat.
Diet: {diet}. Nutrition style: {style}. Allergies and foods to avoid: {allergies}.
{"Ingredients the user has (prefer these, you may add simple staples): " + have if have else "Use common, easy ingredients."}
Return JSON only:
{{"options": [{{"name": "short appetising name", "why": "one short sentence on why it fits",
  "ingredients": [{{"name": "plain food name", "usda_query": "short generic USDA search incl. cooked/raw state, e.g. rice white cooked",
                   "grams": 0, "role": "protein|carb|veg|fat|fruit|other"}}]}}]}}
Rules:
- never include anything the allergies or diet exclude
- at most {MAX_INGREDIENTS} ingredients per option, plain whole foods (no brands, no recipes as ingredients)
- grams are a realistic portion near the target (the app adjusts them), for cooked weights when cooked
- a {block_label.lower()} should look like one: {"small and simple" if "snack" in block_label.lower() else "a real meal"}
- the two options should be clearly different
""".strip()


def _clean_options(payload: dict[str, Any]) -> list[dict[str, Any]]:
    options = []
    for raw in (payload.get("options") or [])[:2]:
        if not isinstance(raw, dict):
            continue
        items = []
        for ingredient in (raw.get("ingredients") or [])[:MAX_INGREDIENTS]:
            if not isinstance(ingredient, dict):
                continue
            name = str(ingredient.get("name") or "").strip()[:60]
            try:
                grams = float(ingredient.get("grams"))
            except (TypeError, ValueError):
                grams = 0.0
            if not name or not math.isfinite(grams) or grams <= 0:
                continue
            role = str(ingredient.get("role") or "other").lower()
            items.append({
                "name": name,
                "query": (str(ingredient.get("usda_query") or "").strip() or name)[:80],
                "grams": min(grams, 1000.0),
                "role": role if role in ROLES else "other",
            })
        name = str(raw.get("name") or "").strip()[:80]
        if name and items:
            options.append({"name": name, "why": str(raw.get("why") or "").strip()[:200], "items": items})
    return options


# ---- foods and portions ------------------------------------------------------------------------


def _words(text: str) -> set[str]:
    return {word for word in re.findall(r"[a-z]+", text.lower()) if len(word) > 2}


def _bank_food(repository: SQLiteRepository, user_id: str, name: str) -> FoodItem | None:
    """A food from the user's bank whose name covers the ingredient's words, with a known weight."""
    wanted = _words(name)
    for food in repository.list_food_bank(user_id, name.split()[0] if name.split() else name)[:20]:
        if food.serving_grams and food.calories > 0 and wanted and wanted <= _words(food.name):
            return food
    return None


def _per_gram(food: FoodItem) -> Nutrition:
    grams = food.serving_grams or 100
    return Nutrition(
        calories=food.calories / grams, protein=food.macros.protein / grams, carbs=food.macros.carbs / grams, fat=food.macros.fat / grams
    )


def _sum(items: list[tuple[float, Nutrition]]) -> Nutrition:
    return Nutrition(
        calories=sum(grams * rate.calories for grams, rate in items),
        protein=sum(grams * rate.protein for grams, rate in items),
        carbs=sum(grams * rate.carbs for grams, rate in items),
        fat=sum(grams * rate.fat for grams, rate in items),
    )


def fit_portions(items: list[dict[str, Any]], budget: Nutrition) -> list[float]:
    """Grams for each item (each has 'grams', 'role', 'rate' per gram) to fit the budget:
    scale everything to the calories, then top up protein from the carb and fat items."""
    grams = [item["grams"] for item in items]
    rates = [item["rate"] for item in items]
    total = _sum(list(zip(grams, rates)))
    if total.calories > 0 and budget.calories > 0:
        scale = min(2.5, max(0.4, budget.calories / total.calories))
        grams = [value * scale for value in grams]
    protein_index = max(
        (index for index, item in enumerate(items) if item["role"] == "protein"),
        key=lambda index: rates[index].protein,
        default=None,
    )
    total = _sum(list(zip(grams, rates)))
    if protein_index is not None and budget.protein > 0 and total.protein < 0.9 * budget.protein:
        rate = rates[protein_index]
        if rate.protein > 0.05:
            extra = min((budget.protein - total.protein) / rate.protein, grams[protein_index] * 0.6)
            grams[protein_index] += extra
            added = extra * rate.calories
            donors = [index for index, item in enumerate(items) if item["role"] in ("carb", "fat") and rates[index].calories > 0]
            donor_calories = sum(grams[index] * rates[index].calories for index in donors)
            for index in donors:
                share = grams[index] * rates[index].calories / donor_calories if donor_calories else 0
                cut = (added * share) / rates[index].calories
                grams[index] = max(grams[index] * 0.4, grams[index] - cut)
    return [max(GRAM_STEP, round(value / GRAM_STEP) * GRAM_STEP) for value in grams]


async def _resolve(
    repository: SQLiteRepository, user_id: str, item: dict[str, Any], usda_lookup: Callable[[str], Awaitable[list[FoodItem]]] | None
) -> FoodItem | None:
    food = _bank_food(repository, user_id, item["name"])
    if food is not None or usda_lookup is None:
        return food
    found = await usda_lookup(item["query"])
    picked = pick_generic_food(item["query"], found) or pick_generic_food(item["name"], found)
    return repository.save_food_item(picked) if picked is not None else None


async def suggest_meals(
    repository: SQLiteRepository,
    settings: Settings,
    user_id: str,
    payload: SuggestRequest,
    *,
    ask: Callable[[str], Awaitable[dict[str, Any]]],
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
) -> SuggestResponse:
    key, budget, remaining = meal_budget(repository, user_id, payload.log_date, payload.block)
    label = LABELS.get(key, "Snack")
    meal_slot = "snack" if key.endswith("snack") else key
    base = {"block": key, "block_label": label, "meal_slot": meal_slot, "budget": budget, "remaining": remaining}
    if budget.calories < MIN_BUDGET_CALORIES:
        return SuggestResponse(
            **base,
            message=f"Only {round(remaining.calories)} kcal left today, so there isn't room for a {label.lower()}. "
            "A cup of tea, sparkling water, or some raw veg would fit.",
        )

    profile = repository.get_user_identity(user_id) or {}
    options = _clean_options(await ask(suggestion_prompt(block_label=label, budget=budget, profile=profile, ingredients=payload.ingredients)))
    if not options:
        return SuggestResponse(**base, message="Gus couldn't come up with anything this time. Try again, or list what you have.")

    factory = client_factory or (lambda: httpx.AsyncClient(timeout=6))
    async with factory() as client:
        usda_lookup = (
            (lambda query: search_usda_foods(query, settings.usda_api_key, client=client, data_types=GENERIC_DATA_TYPES))
            if settings.usda_api_key
            else None
        )
        all_items = [item for option in options for item in option["items"]]
        resolved = await asyncio.gather(*(_resolve(repository, user_id, item, usda_lookup) for item in all_items), return_exceptions=True)

    foods = iter(resolved)
    meals: list[SuggestedMeal] = []
    for option in options:
        found = []
        missing = []
        for item in option["items"]:
            food = next(foods)
            if isinstance(food, BaseException) or food is None:
                missing.append(item["name"])
                continue
            found.append({**item, "food": food, "rate": _per_gram(food)})
        if not found:
            continue
        grams = fit_portions(found, budget)
        items = [
            SuggestedItem(
                name=item["name"],
                grams=weight,
                role=item["role"],
                food=item["food"],
                nutrition=Nutrition(
                    calories=round(weight * item["rate"].calories),
                    protein=round(weight * item["rate"].protein, 1),
                    carbs=round(weight * item["rate"].carbs, 1),
                    fat=round(weight * item["rate"].fat, 1),
                ),
            )
            for item, weight in zip(found, grams)
        ]
        totals = _sum([(item.grams, _per_gram(item.food)) for item in items])
        meals.append(
            SuggestedMeal(
                name=option["name"],
                why=option["why"],
                items=items,
                totals=Nutrition(calories=round(totals.calories), protein=round(totals.protein), carbs=round(totals.carbs), fat=round(totals.fat)),
                missing=missing,
            )
        )
    if not meals:
        return SuggestResponse(**base, message="Gus's ideas couldn't be matched to nutrition data. Try again, or list what you have.")
    return SuggestResponse(**base, options=meals)
