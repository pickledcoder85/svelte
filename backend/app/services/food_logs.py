from datetime import date

from backend.app.models.auth import AuthSession
from backend.app.models.food_logs import FoodLog, FoodLogCreateRequest, FoodLogEntry, FoodLogEntryCreateRequest
from backend.app.repositories.sqlite import SQLiteRepository


def _normalize_food_log(payload: dict) -> FoodLog:
    return FoodLog.model_validate(payload)


def _food_log_visible_to_user(payload: dict | None, user_id: str) -> bool:
    return payload is not None and payload.get("user_id") == user_id


def create_food_log(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: FoodLogCreateRequest,
) -> FoodLog:
    log_id = repository.create_food_log(
        user_id=session.user_id,
        log_date=payload.log_date,
        notes=payload.notes,
    )
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    log = repository.get_food_log(log_id)
    if log is None:
        raise RuntimeError("Failed to load newly created food log.")
    return _normalize_food_log(log)


def list_food_logs(
    repository: SQLiteRepository,
    user_id: str,
    week_start: date | None = None,
    week_end: date | None = None,
) -> list[FoodLog]:
    logs = repository.list_food_logs(user_id)
    if week_start is not None and week_end is not None:
        logs = [
            log
            for log in logs
            if week_start <= date.fromisoformat(log["log_date"]) <= week_end
        ]
    return [
        _normalize_food_log(repository.get_food_log(log["id"]) or log)
        for log in logs
    ]


def get_food_log(
    repository: SQLiteRepository,
    user_id: str,
    food_log_id: str,
) -> FoodLog | None:
    log = repository.get_food_log(food_log_id)
    if not _food_log_visible_to_user(log, user_id):
        return None
    return _normalize_food_log(log)


def list_food_log_entries(
    repository: SQLiteRepository,
    user_id: str,
    food_log_id: str,
) -> list[FoodLogEntry] | None:
    log = repository.get_food_log(food_log_id)
    if not _food_log_visible_to_user(log, user_id):
        return None
    return [FoodLogEntry.model_validate(entry) for entry in log["entries"]]


def add_food_log_entry(
    repository: SQLiteRepository,
    user_id: str,
    food_log_id: str,
    payload: FoodLogEntryCreateRequest,
) -> FoodLog | None:
    log = repository.get_food_log(food_log_id)
    if not _food_log_visible_to_user(log, user_id):
        return None

    repository.add_food_log_entry(
        food_log_id=food_log_id,
        entry_type=payload.entry_type,
        food_item_id=payload.food_item_id,
        meal_template_id=payload.meal_template_id,
        grams=payload.grams,
        servings=payload.servings,
        calories=payload.calories,
        protein=payload.protein,
        carbs=payload.carbs,
        fat=payload.fat,
    )
    refreshed = repository.get_food_log(food_log_id)
    if refreshed is None:
        raise RuntimeError("Failed to reload food log after adding an entry.")
    return _normalize_food_log(refreshed)
