"""Create a Meal Plan: Gus proposes meals, the user keeps or retries, then the plan is created.

The app runs the steps (days, meals, cooking time, variety, then keep / try again per step,
start date, replace-or-keep for slots already planned, shopping list). The server does two
things:

* propose: one AI call suggests one meal for each requested meal type, given the user's diet,
  style, allergies, favourites, cooking time, and the meals already chosen (so nothing repeats).
  The AI only picks foods; every ingredient is looked up (food bank, then USDA) and portions are
  sized to that meal's share of the daily targets (the user's meal balance). Only complete meals
  come back; one more round avoids anything that couldn't be matched.
* create: the accepted meals are added to their days as planned meals. A day's slot that's
  already planned is replaced or kept, as the user chose; nothing else on the day is touched.
"""
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import date
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field, field_validator

from backend.app.config import Settings
from backend.app.integrations.usda import GENERIC_DATA_TYPES, search_usda_foods
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.meal_split import resolve_split
from backend.app.services.meal_suggest import (
    Nutrition,
    SuggestedMeal,
    _assemble,
    _per_gram,
    _resolve,
    COUNT_RULE,
    _targets,
    language_rule,
    clean_ingredients,
)
from backend.app.services.portions import quantity_label

MealType = Literal["breakfast", "lunch", "dinner"]
CookingTime = Literal["very_little", "some", "enjoy"]
LABELS = {"breakfast": "Breakfast", "lunch": "Lunch", "dinner": "Dinner", "snack": "Snack"}
# Plans made by Gus cover breakfast, lunch, and dinner; a meal copied into a plan can be a snack.
PlanMeal = Literal["breakfast", "lunch", "dinner", "snack"]
SHARE_INDEX = {"breakfast": 0, "lunch": 1, "dinner": 2}
TIME_GUIDANCE = {
    "very_little": "almost no time: sheet-pan, one-pot, or no-cook meals that batch-cook once and keep for days, at most 10 minutes of hands-on work",
    "some": "some time: simple meals ready in about 30 minutes",
    "enjoy": "the user enjoys cooking: anything appealing, up to about an hour",
}


class ProposeRequest(BaseModel):
    meals: list[MealType] = Field(min_length=1, max_length=3)
    cooking_time: CookingTime = "some"
    # Titles already kept in this plan (or rejected), so Gus doesn't repeat them. Long lists are
    # trimmed (de-duplicated, most recent 60) rather than refused.
    avoid_titles: list[str] = Field(default_factory=list)

    @field_validator("avoid_titles")
    @classmethod
    def _trim_avoid(cls, value: list[str]) -> list[str]:
        unique = list(dict.fromkeys(title.strip()[:80] for title in value if title.strip()))
        return unique[-60:]
    # e.g. "day 3 of 7" or "meal 2 of 3 in the rotation", to vary ideas.
    step_note: str | None = Field(default=None, max_length=80)


class ProposedMeal(BaseModel):
    meal: MealType
    label: str
    budget: Nutrition
    option: SuggestedMeal | None = None
    message: str | None = None
    prep: str = ""


class ProposeResponse(BaseModel):
    proposals: list[ProposedMeal]


class PlanItem(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    # 0 for a copied quick-calories item (no weight).
    grams: float = Field(ge=0, le=5000)
    calories: float = Field(ge=0, le=10000)
    protein: float = Field(ge=0, le=1000)
    carbs: float = Field(ge=0, le=1000)
    fat: float = Field(ge=0, le=1000)
    # Counted foods ("2 large eggs"); both or neither.
    count: float | None = Field(default=None, gt=0, le=24)
    unit: str | None = Field(default=None, max_length=40)
    # The unit's plural when it isn't English ("huevos grandes").
    unit_plural: str | None = Field(default=None, max_length=40)


class PlanAssignment(BaseModel):
    plan_date: date
    meal: PlanMeal
    title: str = Field(min_length=1, max_length=80)
    calories: float = Field(ge=0, le=10000)
    items: list[PlanItem] = Field(min_length=1, max_length=12)
    # When the day already has this meal planned: replace it, or keep it (skip this one).
    on_conflict: Literal["replace", "keep"] = "keep"


class CreatePlanRequest(BaseModel):
    assignments: list[PlanAssignment] = Field(min_length=1, max_length=63)


class CreatePlanResponse(BaseModel):
    created: int
    replaced: int
    kept: int


def meal_type_budget(repository: SQLiteRepository, user_id: str, meal: str, on: date | None = None) -> Nutrition:
    """A planned meal's size: its share of the day's targets under the user's meal balance."""
    profile = repository.get_user_identity(user_id) or {}
    count, split = resolve_split(profile.get("meals_per_day"), profile.get("meal_split"))
    if count == 3:
        share = split[SHARE_INDEX[meal]] / 100
    else:
        # An older pattern with snacks: use its breakfast / lunch / dinner blocks.
        keys = {3: ["breakfast", "lunch", "dinner"], 4: ["breakfast", "lunch", "afternoon_snack", "dinner"],
                5: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"]}[count]
        share = split[keys.index(meal)] / 100
    targets = _targets(repository, user_id, on or date.today())
    return Nutrition(
        calories=targets.calories * share, protein=targets.protein * share, carbs=targets.carbs * share, fat=targets.fat * share
    )


def plan_prompt(
    *,
    meals: list[str],
    budgets: dict[str, Nutrition],
    profile: dict[str, Any],
    favourites: list[str],
    cooking_time: str,
    avoid: list[str],
    no_data: list[str],
    step_note: str | None,
    language: str = "en",
) -> str:
    """What Gus is asked. Only meal preferences go out: no name, email, or body details."""
    diet = profile.get("dietary_pattern") or "omnivore"
    style = profile.get("nutrition_style") or "balanced"
    allergies = (profile.get("allergy_notes") or "none").strip() or "none"
    targets = "\n".join(
        f"- {LABELS[meal]}: about {round(budgets[meal].calories)} kcal, {round(budgets[meal].protein)} g protein, "
        f"{round(budgets[meal].carbs)} g carbs, {round(budgets[meal].fat)} g fat"
        for meal in meals
    )
    return f"""
You are Gus, a friendly nutrition coach, planning meals for a meal plan{f" ({step_note})" if step_note else ""}.
Suggest exactly one meal for each of: {", ".join(LABELS[meal] for meal in meals)}.
{targets}
Diet: {diet}. Nutrition style: {style}. Allergies and foods to avoid: {allergies}.
Cooking time: {TIME_GUIDANCE.get(cooking_time, TIME_GUIDANCE["some"])}.
{"Foods the user likes (use some when they fit): " + ", ".join(favourites) if favourites else ""}
{"Already in the plan or turned down (suggest something different): " + "; ".join(avoid) if avoid else ""}
{"Don't use these (no nutrition data for them): " + ", ".join(sorted(set(no_data))) if no_data else ""}
Return JSON only:
{{"meals": [{{"meal": "breakfast|lunch|dinner", "name": "short appetising name", "why": "one short sentence",
  "prep": "one or two short sentences on how to make it (batch notes if cooked once for several days)",
  "ingredients": [{{"name": "plain generic food, e.g. chicken thigh", "usda_query": "short generic USDA search incl. cooked/raw state",
                   "grams": 0, "count": 0, "unit": "", "role": "protein|carb|veg|fat|fruit|other"}}]}}]}}
Rules:
- never include anything the allergies or diet exclude
- {COUNT_RULE}
- at most 6 ingredients per meal, plain whole foods (no brands), grams for one serving (cooked weights when cooked)
- each meal must fit its meal type and its cooking time
{language_rule(language)}
""".strip()


async def propose_meals(
    repository: SQLiteRepository,
    settings: Settings,
    user_id: str,
    payload: ProposeRequest,
    *,
    ask: Callable[[str], Awaitable[dict[str, Any]]],
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
    language: str = "en",
) -> ProposeResponse:
    profile = repository.get_user_identity(user_id) or {}
    meals = list(dict.fromkeys(payload.meals))
    budgets = {meal: meal_type_budget(repository, user_id, meal) for meal in meals}
    favourites = [food.name for food in repository.list_food_bank(user_id) if food.favorite][:12]
    results: dict[str, ProposedMeal] = {}
    no_data: list[str] = []

    factory = client_factory or (lambda: httpx.AsyncClient(timeout=6))
    async with factory() as client:
        generic = (
            (lambda query: search_usda_foods(query, settings.usda_api_key, client=client, data_types=GENERIC_DATA_TYPES))
            if settings.usda_api_key
            else None
        )
        any_type = (lambda query: search_usda_foods(query, settings.usda_api_key, client=client)) if settings.usda_api_key else None
        for _round in range(2):
            wanted = [meal for meal in meals if meal not in results]
            if not wanted:
                break
            reply = await ask(
                plan_prompt(
                    meals=wanted,
                    budgets=budgets,
                    profile=profile,
                    favourites=favourites,
                    cooking_time=payload.cooking_time,
                    avoid=payload.avoid_titles,
                    no_data=no_data,
                    step_note=payload.step_note,
                    language=language,
                )
            )
            raw_meals = reply.get("meals") if isinstance(reply, dict) else None
            for raw in raw_meals if isinstance(raw_meals, list) else []:
                if not isinstance(raw, dict):
                    continue
                meal = str(raw.get("meal") or "").lower()
                name = str(raw.get("name") or "").strip()[:80]
                items = clean_ingredients(raw.get("ingredients"), language)
                if meal not in wanted or meal in results or not name or not items:
                    continue
                resolved = await asyncio.gather(
                    *(_resolve(repository, user_id, item, generic, any_type) for item in items), return_exceptions=True
                )
                missing = [item["name"] for item, food in zip(items, resolved) if isinstance(food, BaseException) or food is None]
                if missing:
                    no_data.extend(missing)
                    continue
                found = [{**item, "food": food, "rate": _per_gram(food)} for item, food in zip(items, resolved)]
                option = _assemble({"name": name, "why": str(raw.get("why") or "").strip()[:200]}, found, budgets[meal])
                results[meal] = ProposedMeal(
                    meal=meal, label=LABELS[meal], budget=budgets[meal], option=option, prep=str(raw.get("prep") or "").strip()[:300]
                )
    return ProposeResponse(
        proposals=[
            results.get(meal)
            or ProposedMeal(
                meal=meal,
                label=LABELS[meal],
                budget=budgets[meal],
                message=f"Gus couldn't put together a complete {LABELS[meal].lower()} this time. Try again.",
            )
            for meal in meals
        ]
    )


def create_plan(repository: SQLiteRepository, user_id: str, payload: CreatePlanRequest) -> CreatePlanResponse:
    created = replaced = kept = 0
    days = {str(day.get("plan_date", ""))[:10]: day for day in repository.list_meal_plan_days(user_id)}
    for assignment in payload.assignments:
        if assignment.plan_date < date.today():
            continue  # never plan days that have gone
        label = LABELS[assignment.meal]
        day = days.get(assignment.plan_date.isoformat())
        # A meal already eaten from the plan isn't in the way: the new one goes beside it.
        existing = [
            slot
            for slot in (day or {}).get("slots", [])
            if str(slot.get("meal_label") or "").lower() == label.lower() and not slot.get("eaten_at")
        ]
        if existing:
            if assignment.on_conflict == "keep":
                kept += 1
                continue
            for slot in existing:
                repository.delete_meal_plan_slot(user_id, slot["id"])
            replaced += 1
        updated = repository.add_meal_plan_slot(
            user_id=user_id,
            plan_date=assignment.plan_date,
            slot={
                "meal_label": label,
                "title": assignment.title,
                "calories": round(assignment.calories),
                "prep_status": "Needs prep",
                "items": [
                    {
                        "name": item.name,
                        "quantity_label": quantity_label(
                            item.grams, item.count, (item.unit or "").strip() or None, (item.unit_plural or "").strip() or None
                        ) if item.grams > 0 else "",
                        "calories": round(item.calories),
                        "macros": {"protein": item.protein, "carbs": item.carbs, "fat": item.fat},
                    }
                    for item in assignment.items
                ],
            },
        )
        if updated is not None:
            days[assignment.plan_date.isoformat()] = updated
        created += 1
    return CreatePlanResponse(created=created, replaced=replaced, kept=kept)
