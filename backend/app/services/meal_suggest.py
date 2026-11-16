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
from backend.app.services.plate_match import food_score, pick_generic_food
from backend.app.services.portions import MAX_COUNT, counted_unit, plural, quantity_label, round_count

logger = logging.getLogger(__name__)

BlockKey = Literal["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "snack"]
MAX_INGREDIENTS = 6
COUNT_RULE = (
    "for foods people count rather than weigh (eggs, fruit, potatoes, bread, tortillas, wraps), give how many as count "
    'and one in singular as unit, e.g. 2 and "large egg", 1 and "medium sweet potato", 2 and "slice of whole wheat bread"; '
    "grams is still the total weight; for weighed foods (meat, rice, oil, vegetables by weight) count is 0 and unit is empty"
)
MIN_BUDGET_CALORIES = 80
GRAM_STEP = 5
ROLES = ("protein", "carb", "veg", "fat", "fruit", "other")


class SuggestRequest(BaseModel):
    log_date: date
    block: BlockKey
    ingredients: str | None = Field(default=None, max_length=300)
    # A photo of the fridge, counter, or pantry: Gus suggests from what he can see.
    image_base64: str | None = Field(default=None, max_length=16_000_000)


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
    # Counted foods: how many of what ("large egg"); None when weighed.
    count: float | None = None
    unit: str | None = None
    unit_plural: str | None = None
    # "2 large eggs (100 g)" or "150 g".
    quantity_label: str = ""


class SuggestedMeal(BaseModel):
    name: str
    why: str = ""
    items: list[SuggestedItem]
    totals: Nutrition
    missing: list[str] = Field(default_factory=list)


class PlannedHere(BaseModel):
    """A meal already planned for this block: logging a suggestion offers to replace it."""

    slot_id: str
    title: str
    calories: float


class SuggestResponse(BaseModel):
    block: str
    block_label: str
    meal_slot: Literal["breakfast", "lunch", "dinner", "snack"]
    budget: Nutrition
    remaining: Nutrition
    options: list[SuggestedMeal] = Field(default_factory=list)
    message: str | None = None
    planned_here: PlannedHere | None = None
    # Photo mode: the foods Gus saw in the photo.
    seen_items: list[str] = Field(default_factory=list)


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


MEAL_ORDER = {"breakfast": 0, "lunch": 1, "dinner": 2}


def planned_meals(repository: SQLiteRepository, user_id: str, on: date) -> list[dict[str, Any]]:
    """Meals planned for that day and not eaten yet: slot id, label, title, calories, macros.
    A planned meal whose slot already has food logged (eaten some other way) is left out."""
    log = repository.get_food_log_for_date(user_id, on)
    logged_slots = {entry.get("meal_slot") for entry in (repository.list_food_log_entries(log["id"]) if log else [])}
    planned = []
    for day in repository.list_meal_plan_days(user_id):
        if str(day.get("plan_date", ""))[:10] != on.isoformat():
            continue
        for slot in day.get("slots", []):
            if slot.get("eaten_at"):
                continue
            items = slot.get("items") or []
            label = str(slot.get("meal_label") or "")
            if label.lower() in logged_slots:
                continue
            planned.append({
                "id": slot.get("id"),
                "label": label,
                "title": str(slot.get("title") or ""),
                "calories": float(slot.get("calories") or 0),
                "protein": sum(float((item.get("macros") or {}).get("protein") or 0) for item in items),
                "carbs": sum(float((item.get("macros") or {}).get("carbs") or 0) for item in items),
                "fat": sum(float((item.get("macros") or {}).get("fat") or 0) for item in items),
            })
    return planned


def later_planned(planned: list[dict[str, Any]], block_label: str) -> list[dict[str, Any]]:
    """Planned meals later in the day than this one: their calories are held back. (An earlier
    planned meal that's still unticked was most likely skipped or eaten off-plan.)"""
    here = MEAL_ORDER.get(block_label.lower(), 1)
    return [meal for meal in planned if MEAL_ORDER.get(meal["label"].lower(), 3) > here]


def meal_budget(repository: SQLiteRepository, user_id: str, on: date, requested: str) -> tuple[str, Nutrition, Nutrition]:
    """(block key, the meal's budget, what's left today). The budget is the block's share of
    the day's targets, capped by what's left: the allowance (with workouts), minus what's eaten,
    minus other meals already planned for that day (so dinner's planned budget isn't spent)."""
    profile = repository.get_user_identity(user_id) or {}
    targets = _targets(repository, user_id, on)
    eaten = _eaten(repository, user_id, on)
    bonus = _workout_bonus(repository, user_id, on, int(profile.get("workout_calories_share") or 0))
    key_label = LABELS.get(requested, requested).lower()
    others = later_planned(planned_meals(repository, user_id, on), key_label)
    remaining = Nutrition(
        calories=max(0.0, targets.calories + bonus - eaten.calories - sum(meal["calories"] for meal in others)),
        protein=max(0.0, targets.protein - eaten.protein - sum(meal["protein"] for meal in others)),
        carbs=max(0.0, targets.carbs - eaten.carbs - sum(meal["carbs"] for meal in others)),
        fat=max(0.0, targets.fat - eaten.fat - sum(meal["fat"] for meal in others)),
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
    *,
    block_label: str,
    budget: Nutrition,
    profile: dict[str, Any],
    ingredients: str | None,
    planned: list[dict[str, Any]] | None = None,
    with_photo: bool = False,
    avoid: list[str] | None = None,
    seen: list[str] | None = None,
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
{("The photo shows the user's fridge, counter, or pantry. First list every food you can clearly see in seen_items. Then build both options ONLY from those foods, plus oil, butter, salt, pepper, spices, water, or vinegar. Never add a food that isn't in the photo." if not seen else "Foods in the user's photo: " + ", ".join(seen) + ". Build both options ONLY from these, plus oil, butter, salt, pepper, spices, water, or vinegar.") if with_photo else ""}
{"Don't use these (no nutrition data for them): " + ", ".join(sorted(set(avoid))) if avoid else ""}
{"Ingredients the user has (prefer these, you may add simple staples): " + have if have else ("" if with_photo else "Use common, easy ingredients.")}
{"Already planned for later today (don't repeat these): " + "; ".join(f"{meal['label']}: {meal['title']}" for meal in planned) if planned else ""}
Return JSON only:
{{{'"seen_items": ["each food you can see"], ' if with_photo else ''}"options": [{{"name": "short appetising name", "why": "one short sentence on why it fits",
  "ingredients": [{{"name": "plain food name", "usda_query": "short generic USDA search incl. cooked/raw state, e.g. rice white cooked",
                   "grams": 0, "count": 0, "unit": "", "role": "protein|carb|veg|fat|fruit|other"}}]}}]}}
Rules:
- never include anything the allergies or diet exclude
- {COUNT_RULE}
- name ingredients as plain generic foods found in USDA FoodData Central (e.g. "chicken thigh", "brown rice", "broccoli")
- at most {MAX_INGREDIENTS} ingredients per option, plain whole foods (no brands, no recipes as ingredients)
- grams are a realistic portion near the target (the app adjusts them), for cooked weights when cooked
- a {block_label.lower()} should look like one: {"small and simple" if "snack" in block_label.lower() else "a real meal"}
- the two options should be clearly different
""".strip()


def clean_ingredients(raw_items: Any) -> list[dict[str, Any]]:
    """An AI ingredient list, checked: plain names, positive grams, a known role."""
    items = []
    for ingredient in (raw_items if isinstance(raw_items, list) else [])[:MAX_INGREDIENTS]:
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
        try:
            count = float(ingredient.get("count") or 0)
        except (TypeError, ValueError):
            count = 0.0
        unit = str(ingredient.get("unit") or "").strip()[:40]
        counted = math.isfinite(count) and 0 < count <= MAX_COUNT and bool(unit)
        items.append({
            "name": name,
            "query": (str(ingredient.get("usda_query") or "").strip() or name)[:80],
            "grams": min(grams, 1000.0),
            "role": role if role in ROLES else "other",
            "count": count if counted else None,
            "unit": unit if counted else None,
        })
    return items


def _clean_options(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """The AI's options, checked: lists where lists belong, usable ingredients, unique names."""
    options = []
    raw_options = payload.get("options") if isinstance(payload, dict) else None
    for raw in (raw_options if isinstance(raw_options, list) else [])[:2]:
        if not isinstance(raw, dict):
            continue
        items = clean_ingredients(raw.get("ingredients"))
        name = str(raw.get("name") or "").strip()[:80]
        if name and items:
            if any(option["name"] == name for option in options):
                name = f"{name} (2)"
            options.append({"name": name, "why": str(raw.get("why") or "").strip()[:200], "items": items})
    return options


# ---- foods and portions ------------------------------------------------------------------------


def _words(text: str) -> set[str]:
    return {word for word in re.findall(r"[a-z]+", text.lower()) if len(word) > 2}


def _bank_food(repository: SQLiteRepository, user_id: str, name: str, query: str) -> FoodItem | None:
    """The best food in the user's bank for an ingredient, using the same rules as the USDA pick:
    the right food in the right state (cooked rice is not raw rice; chicken breast is not breaded
    chicken), with a known weight."""
    candidates: dict[str, FoodItem] = {}
    for word in sorted(_words(f"{name} {query}"), key=len, reverse=True)[:4]:
        for food in repository.list_food_bank(user_id, word)[:20]:
            candidates[food.id] = food
    best: tuple[float, FoodItem] | None = None
    for food in candidates.values():
        if not food.serving_grams or food.calories <= 0:
            continue
        scores = [score for score in (food_score(query, food.name), food_score(name, food.name)) if score is not None]
        if scores and (best is None or max(scores) > best[0]):
            best = (max(scores), food)
    return best[1] if best else None


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
        scale = min(2.5, max(0.1, budget.calories / total.calories))
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


# Basics anyone has: allowed in photo mode even when they aren't in the picture.
PANTRY_STAPLES = {"oil", "olive", "butter", "salt", "pepper", "spice", "spices", "seasoning", "water", "vinegar", "herbs"}
_PREP_WORDS = {"cooked", "boiled", "roasted", "grilled", "baked", "fried", "steamed", "raw", "fresh", "chopped", "sliced", "diced"}


def _simpler(name: str) -> str | None:
    """A shorter search for an ingredient: its last two words without preparation words
    ("grilled chicken thighs" → "chicken thighs")."""
    words = [word for word in re.findall(r"[a-zA-Z]+", name.lower()) if word not in _PREP_WORDS]
    simpler = " ".join(words[-2:])
    return simpler if simpler and simpler != name.lower() else None


# At most this many USDA lookups at once (a plan step can name up to 18 ingredients, each with up
# to three searches); more at once gets requests refused.
USDA_CONCURRENCY = 4
_usda_slots = asyncio.Semaphore(USDA_CONCURRENCY)


async def _lookup(lookup: Callable[[str], Awaitable[list[FoodItem]]], query: str) -> list[FoodItem]:
    """One USDA search, a few at a time, retried once after a short pause if it fails."""
    for attempt in range(2):
        try:
            async with _usda_slots:
                return await lookup(query)
        except Exception as error:  # noqa: BLE001 - network or USDA errors: retry once, then give up
            if attempt:
                logger.warning("USDA lookup failed for %r: %s", query, type(error).__name__)
                return []
            await asyncio.sleep(0.5)
    return []


async def _resolve(
    repository: SQLiteRepository,
    user_id: str,
    item: dict[str, Any],
    generic: Callable[[str], Awaitable[list[FoodItem]]] | None,
    any_type: Callable[[str], Awaitable[list[FoodItem]]] | None,
) -> FoodItem | None:
    """The ingredient's food: the user's bank, then USDA generic foods, then all of USDA
    (branded too), then a simpler name. Every step uses the same safe matching (cooked is not
    raw, plain is not breaded); USDA finds are saved so they can be logged."""
    food = _bank_food(repository, user_id, item["name"], item["query"])
    if food is not None or generic is None:
        return food
    attempts: list[tuple[Callable[[str], Awaitable[list[FoodItem]]], str]] = [(generic, item["query"])]
    if any_type is not None:
        attempts.append((any_type, item["query"]))
    simpler = _simpler(item["name"])
    if simpler:
        attempts.append((generic, simpler))
    for lookup, query in attempts:
        found = await _lookup(lookup, query)
        picked = pick_generic_food(query, found) or pick_generic_food(item["name"], found)
        if picked is not None:
            return repository.save_food_item(picked)
    # Food names only (no personal data): so failures can be diagnosed from the server log.
    logger.warning("No nutrition match for ingredient %r (searched %s)", item["name"], [query for _, query in attempts])
    return None


def _photo_filter(options: list[dict[str, Any]], seen: list[str]) -> list[dict[str, Any]]:
    """Photo mode: keep only ingredients that are in the photo (or pantry staples). An option
    left without at least two real foods from the photo is dropped."""
    seen_words = [_words(item) for item in seen]
    kept = []
    for option in options:
        items = []
        real = 0
        for item in option["items"]:
            words = _words(item["name"])
            if words and (words & PANTRY_STAPLES or any(words & seen_item for seen_item in seen_words)):
                items.append(item)
                if not words & PANTRY_STAPLES:
                    real += 1
        if real >= 2 or (real >= 1 and len(seen) == 1):
            kept.append({**option, "items": items})
    return kept


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
    all_planned = planned_meals(repository, user_id, payload.log_date)
    planned = later_planned(all_planned, label)
    planned_here = next((meal for meal in all_planned if meal["label"].lower() == label.lower()), None)
    with_photo = bool(payload.image_base64)

    factory = client_factory or (lambda: httpx.AsyncClient(timeout=6))
    meals: list[SuggestedMeal] = []
    seen: list[str] = []
    avoid: list[str] = []
    async with factory() as client:
        generic = (
            (lambda query: search_usda_foods(query, settings.usda_api_key, client=client, data_types=GENERIC_DATA_TYPES))
            if settings.usda_api_key
            else None
        )
        any_type = (lambda query: search_usda_foods(query, settings.usda_api_key, client=client)) if settings.usda_api_key else None

        # Up to two rounds: anything Gus names that can't be matched to nutrition data is
        # avoided in a second round, so only complete meals are ever offered.
        for _round in range(2):
            prompt = suggestion_prompt(
                block_label=label,
                budget=budget,
                profile=profile,
                ingredients=payload.ingredients,
                planned=planned,
                with_photo=with_photo,
                avoid=avoid,
                seen=seen if _round else None,
            )
            reply = await ask(prompt)
            if with_photo and not seen:
                seen = [str(item).strip()[:40] for item in (reply.get("seen_items") or []) if str(item).strip()][:20] if isinstance(reply.get("seen_items"), list) else []
            options = _clean_options(reply)
            if with_photo:
                options = _photo_filter(options, seen)
            options = [option for option in options if option["name"] not in {meal.name for meal in meals}]
            if not options:
                continue
            all_items = [item for option in options for item in option["items"]]
            resolved = await asyncio.gather(
                *(_resolve(repository, user_id, item, generic, any_type) for item in all_items), return_exceptions=True
            )
            foods = iter(resolved)
            for option in options:
                found, missing = [], []
                for item in option["items"]:
                    food = next(foods)
                    if isinstance(food, BaseException) or food is None:
                        missing.append(item["name"])
                    else:
                        found.append({**item, "food": food, "rate": _per_gram(food)})
                if missing or not found:
                    avoid.extend(missing)  # incomplete: not offered; avoided next round
                    continue
                meal = _assemble(option, found, budget)
                if meal.totals.calories <= max(budget.calories * 1.25, budget.calories + 40):
                    meals.append(meal)
            if len(meals) >= 2:
                break

    if not meals:
        return SuggestResponse(
            **base,
            seen_items=seen,
            message="Gus couldn't put together a complete meal that fits. Try again"
            + (", or take the photo with the foods more visible." if with_photo else ", or say what you'd like to use."),
        )
    return SuggestResponse(
        **base,
        options=meals[:2],
        seen_items=seen,
        planned_here=PlannedHere(slot_id=planned_here["id"], title=planned_here["title"], calories=planned_here["calories"])
        if planned_here and planned_here.get("id")
        else None,
    )


def snap_counts(
    items: list[dict[str, Any]], grams: list[float], budget: Nutrition
) -> tuple[list[float], list[tuple[str, float] | None]]:
    """Counted foods to whole items (halves for big ones), then the weighed foods rescaled so the
    meal still fits its calories. Returns the grams and each item's (unit, count) or None."""
    grams = list(grams)
    units = [counted_unit(item, item["food"]) for item in items]
    counts: list[tuple[str, float] | None] = [None] * len(items)
    for index, found in enumerate(units):
        if found:
            unit, each = found
            count = min(float(MAX_COUNT), round_count(grams[index] / each, each))
            counts[index] = (unit, count)
            grams[index] = round(count * each)
    flexible = [index for index, found in enumerate(units) if not found]
    if flexible and any(units) and budget.calories > 0:
        rates = [item["rate"] for item in items]
        fixed = sum(grams[index] * rates[index].calories for index, found in enumerate(units) if found)
        flex = sum(grams[index] * rates[index].calories for index in flexible)
        if flex > 0:
            scale = min(2.0, max(0.5, (budget.calories - fixed) / flex))
            for index in flexible:
                grams[index] = max(GRAM_STEP, round(grams[index] * scale / GRAM_STEP) * GRAM_STEP)
    return grams, counts


def _assemble(option: dict[str, Any], found: list[dict[str, Any]], budget: Nutrition) -> SuggestedMeal:
    grams, counts = snap_counts(found, fit_portions(found, budget), budget)
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
            count=counted[1] if counted else None,
            unit=counted[0] if counted else None,
            unit_plural=plural(counted[0]) if counted else None,
            quantity_label=quantity_label(weight, counted[1], counted[0]) if counted else quantity_label(weight),
        )
        for item, weight, counted in zip(found, grams, counts)
    ]
    totals = _sum([(item.grams, _per_gram(item.food)) for item in items])
    return SuggestedMeal(
        name=option["name"],
        why=option["why"],
        items=items,
        totals=Nutrition(calories=round(totals.calories), protein=round(totals.protein), carbs=round(totals.carbs), fat=round(totals.fat)),
    )
