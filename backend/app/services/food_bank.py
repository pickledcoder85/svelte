"""The user's food bank, food search, and logging a food by servings or by weight.

Logging works out calories and macros on the server from the saved food, so every screen
agrees. A food's nutrition is per one serving; with the serving weight known, any weight can
be logged ("150 g" of a "2 tbsp (32 g)" food is 150 / 32 servings).
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, model_validator

from backend.app.config import get_settings
from backend.app.integrations.usda import UsdaSearchError, search_usda_foods
from backend.app.models.food_logs import FoodLog
from backend.app.models.nutrition import FoodItem
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.food_logs import get_food_log


USDA_MIN_QUERY_LENGTH = 3


class FoodBankError(ValueError):
    """A request that can't be done as asked (for example a weight for a food with no known
    serving weight)."""


class LogFoodRequest(BaseModel):
    food_id: str
    log_date: date
    # Exactly one: a number of servings, or a weight in grams (ml for liquids).
    servings: float | None = Field(default=None, gt=0)
    grams: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def _one_amount(self):
        if (self.servings is None) == (self.grams is None):
            raise ValueError("Give either servings or grams.")
        return self


class ServingWeightRequest(BaseModel):
    serving_grams: float = Field(gt=0, le=10000)
    serving_basis: str = Field(default="g", pattern="^(g|ml)$")


def _with_bank_flags(repository: SQLiteRepository, user_id: str, foods: list[FoodItem]) -> list[FoodItem]:
    bank = repository.food_bank_ids(user_id)
    favorites = {item["entity_id"] for item in repository.list_saved_favorites(user_id, entity_type="food")}
    return [food.model_copy(update={"in_bank": food.id in bank, "favorite": food.id in favorites}) for food in foods]


async def search_foods_for_user(repository: SQLiteRepository, user_id: str, query: str) -> list[FoodItem]:
    """The user's bank first, then other saved foods, then USDA (when a key is set). USDA
    results are kept in the catalog so they can be logged, but are not added to the bank."""
    seen: set[str] = set()
    results: list[FoodItem] = []

    def take(foods: list[FoodItem]) -> None:
        for food in foods:
            if food.id not in seen:
                seen.add(food.id)
                results.append(food)

    take(_with_bank_flags(repository, user_id, repository.list_food_bank(user_id, query)))
    take(_with_bank_flags(repository, user_id, repository.search_foods(query)))

    settings = get_settings()
    # Very short queries ("a") return noise and slow every search; skip USDA for those.
    if settings.usda_api_key and len(query.strip()) >= USDA_MIN_QUERY_LENGTH:
        try:
            usda = await search_usda_foods(query, settings.usda_api_key)
        except UsdaSearchError:
            usda = []
        take(_with_bank_flags(repository, user_id, [repository.save_food_item(food) for food in usda]))
    return results


def add_food_to_bank(repository: SQLiteRepository, user_id: str, food_id: str) -> FoodItem | None:
    food = repository.get_food_by_id(food_id)
    if food is None:
        return None
    repository.add_to_food_bank(user_id=user_id, food_id=food_id)
    return food.model_copy(update={"in_bank": True})


def list_bank_for_user(repository: SQLiteRepository, user_id: str, query: str = "") -> list[FoodItem]:
    return _with_bank_flags(repository, user_id, repository.list_food_bank(user_id, query))


def set_food_serving_weight(
    repository: SQLiteRepository, user_id: str, food_id: str, payload: ServingWeightRequest
) -> FoodItem | None:
    if repository.get_food_by_id(food_id) is None:
        return None
    # Foods are shared rows; only a food in the user's own bank can have its weight set.
    if food_id not in repository.food_bank_ids(user_id):
        raise FoodBankError("Add this food to your food bank first.")
    food = repository.set_serving_weight(
        food_id=food_id, serving_grams=round(payload.serving_grams, 2), serving_basis=payload.serving_basis
    )
    return _with_bank_flags(repository, user_id, [food])[0] if food else None


def log_food(repository: SQLiteRepository, user_id: str, payload: LogFoodRequest) -> FoodLog | None:
    """Log a food by servings or weight. Returns None when the food doesn't exist."""
    food = repository.get_food_by_id(payload.food_id)
    if food is None:
        return None
    if payload.grams is not None:
        if not food.serving_grams:
            raise FoodBankError(
                f"Relish doesn't know how much one serving of {food.name} weighs yet. "
                "Add the serving weight, or log it in servings."
            )
        servings = payload.grams / food.serving_grams
        grams = payload.grams
    else:
        servings = float(payload.servings or 0)
        grams = servings * food.serving_grams if food.serving_grams else 0.0

    repository.create_food_log(user_id=user_id, log_date=payload.log_date)
    log = repository.get_food_log_for_date(user_id, payload.log_date)
    if log is None:
        raise RuntimeError("Failed to open the food log for that day.")
    repository.add_food_log_entry(
        food_log_id=log["id"],
        entry_type="food",
        food_item_id=food.id,
        meal_template_id=None,
        meal_plan_slot_id=None,
        display_name_override=None,
        grams=round(grams, 1),
        servings=round(servings, 3),
        calories=round(food.calories * servings, 1),
        protein=round(food.macros.protein * servings, 1),
        carbs=round(food.macros.carbs * servings, 1),
        fat=round(food.macros.fat * servings, 1),
    )
    repository.add_to_food_bank(user_id=user_id, food_id=food.id, used=True)
    return get_food_log(repository, user_id, log["id"])
