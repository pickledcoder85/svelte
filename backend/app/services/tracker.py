from backend.app.models.auth import AuthSession
from backend.app.models.tracker import (
    ExerciseEntry,
    ExerciseEntryCreateRequest,
    MealPlanDay,
    MealPlanDayCreateRequest,
    MealPrepTask,
    MealPrepTaskCreateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository


def create_exercise_entry(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: ExerciseEntryCreateRequest,
) -> ExerciseEntry:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    entry_id = repository.create_exercise_entry(
        user_id=session.user_id,
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        calories_burned=payload.calories_burned,
        logged_on=payload.logged_on,
        logged_at=payload.logged_at,
        intensity=payload.intensity,
    )
    entry = repository.get_exercise_entry(entry_id)
    if entry is None:
        raise RuntimeError("Failed to reload exercise entry.")
    return ExerciseEntry.model_validate(entry)


def list_exercise_entries(repository: SQLiteRepository, user_id: str) -> list[ExerciseEntry]:
    return [ExerciseEntry.model_validate(entry) for entry in repository.list_exercise_entries(user_id)]


def save_meal_plan_day(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: MealPlanDayCreateRequest,
) -> MealPlanDay:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    day_id = repository.save_meal_plan_day(
        user_id=session.user_id,
        plan_date=payload.plan_date,
        label=payload.label,
        focus=payload.focus,
        slots=[slot.model_dump() for slot in payload.slots],
    )
    day = repository.get_meal_plan_day(day_id)
    if day is None:
        raise RuntimeError("Failed to reload meal plan day.")
    return MealPlanDay.model_validate(day)


def list_meal_plan_days(repository: SQLiteRepository, user_id: str) -> list[MealPlanDay]:
    return [MealPlanDay.model_validate(day) for day in repository.list_meal_plan_days(user_id)]


def create_meal_prep_task(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: MealPrepTaskCreateRequest,
) -> MealPrepTask:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    task_id = repository.create_meal_prep_task(
        user_id=session.user_id,
        title=payload.title,
        category=payload.category,
        portions=payload.portions,
        status=payload.status,
        scheduled_for=payload.scheduled_for,
    )
    task = repository.get_meal_prep_task(task_id)
    if task is None:
        raise RuntimeError("Failed to reload meal prep task.")
    return MealPrepTask.model_validate(task)


def list_meal_prep_tasks(repository: SQLiteRepository, user_id: str) -> list[MealPrepTask]:
    return [MealPrepTask.model_validate(task) for task in repository.list_meal_prep_tasks(user_id)]


def update_meal_prep_task_status(
    repository: SQLiteRepository,
    user_id: str,
    task_id: str,
    status: str,
) -> MealPrepTask | None:
    task = repository.get_meal_prep_task(task_id)
    if task is None or task["user_id"] != user_id:
        return None
    updated = repository.update_meal_prep_task_status(task_id, status)
    if updated is None:
        return None
    return MealPrepTask.model_validate(updated)
