from datetime import datetime

from backend.app.models.auth import AuthSession
from backend.app.models.tracker import (
    ExerciseEntry,
    ExerciseEntryCreateRequest,
    MealPlanDay,
    MealPlanDayCreateRequest,
    PlannedExerciseEntryCompletionRequest,
    PlannedExerciseEntry,
    PlannedExerciseEntryCreateRequest,
    PlannedExerciseEntryUpdateRequest,
    PlannedWorkoutSession,
    PlannedWorkoutSessionCreateRequest,
    PlannedWorkoutSessionUpdateRequest,
    MealPrepTask,
    MealPrepTaskCreateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.profile import ensure_default_meal_plan_window, ensure_default_planned_exercise_window


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


def create_planned_exercise_entry(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: PlannedExerciseEntryCreateRequest,
) -> PlannedExerciseEntry:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    entry_id = repository.create_planned_exercise_entry(
        user_id=session.user_id,
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        calories_burned=payload.calories_burned,
        planned_on=payload.planned_on,
        planned_at=payload.planned_at,
        intensity=payload.intensity,
    )
    entry = repository.get_planned_exercise_entry(entry_id)
    if entry is None:
        raise RuntimeError("Failed to reload planned exercise entry.")
    return PlannedExerciseEntry.model_validate(entry)


def list_planned_exercise_entries(repository: SQLiteRepository, user_id: str) -> list[PlannedExerciseEntry]:
    ensure_default_planned_exercise_window(repository, user_id=user_id)
    return [PlannedExerciseEntry.model_validate(entry) for entry in repository.list_planned_exercise_entries(user_id)]


def list_planned_workout_sessions(repository: SQLiteRepository, user_id: str) -> list[PlannedWorkoutSession]:
    ensure_default_planned_exercise_window(repository, user_id=user_id)
    return [PlannedWorkoutSession.model_validate(entry) for entry in repository.list_planned_workout_sessions(user_id)]


def create_planned_workout_session(
    repository: SQLiteRepository,
    session: AuthSession,
    payload: PlannedWorkoutSessionCreateRequest,
) -> PlannedWorkoutSession:
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    session_id = repository.create_planned_workout_session(
        user_id=session.user_id,
        title=payload.title,
        workout_type=payload.workout_type,
        planned_on=payload.planned_on,
        planned_at=payload.planned_at,
        notes=payload.notes,
        estimated_calories_burned=payload.estimated_calories_burned,
        blocks=[block.model_dump() for block in payload.blocks],
    )
    planned_workout_session = repository.get_planned_workout_session(session.user_id, session_id)
    if planned_workout_session is None:
        raise RuntimeError("Failed to reload planned workout session.")
    return PlannedWorkoutSession.model_validate(planned_workout_session)


def update_planned_workout_session(
    repository: SQLiteRepository,
    user_id: str,
    session_id: str,
    payload: PlannedWorkoutSessionUpdateRequest,
) -> PlannedWorkoutSession | None:
    planned_workout_session = repository.update_planned_workout_session(
        user_id=user_id,
        planned_workout_session_id=session_id,
        title=payload.title,
        workout_type=payload.workout_type,
        planned_on=payload.planned_on,
        planned_at=payload.planned_at,
        notes=payload.notes,
        estimated_calories_burned=payload.estimated_calories_burned,
        blocks=[block.model_dump() for block in payload.blocks],
    )
    if planned_workout_session is None:
        return None
    return PlannedWorkoutSession.model_validate(planned_workout_session)


def update_planned_workout_session_completion(
    repository: SQLiteRepository,
    user_id: str,
    session_id: str,
    completed_at: datetime | None,
) -> PlannedWorkoutSession | None:
    planned_workout_session = repository.update_planned_workout_session_completion(
        user_id=user_id,
        planned_workout_session_id=session_id,
        completed_at=completed_at,
    )
    if planned_workout_session is None:
        return None
    return PlannedWorkoutSession.model_validate(planned_workout_session)


def delete_planned_workout_session(
    repository: SQLiteRepository,
    user_id: str,
    session_id: str,
) -> bool:
    return repository.delete_planned_workout_session(
        user_id=user_id,
        planned_workout_session_id=session_id,
    )


def update_planned_exercise_entry(
    repository: SQLiteRepository,
    user_id: str,
    entry_id: str,
    payload: PlannedExerciseEntryUpdateRequest,
) -> PlannedExerciseEntry | None:
    entry = repository.update_planned_exercise_entry(
        user_id=user_id,
        planned_exercise_entry_id=entry_id,
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        calories_burned=payload.calories_burned,
        planned_on=payload.planned_on,
        planned_at=payload.planned_at,
        intensity=payload.intensity,
    )
    if entry is None:
        return None
    return PlannedExerciseEntry.model_validate(entry)


def delete_planned_exercise_entry(
    repository: SQLiteRepository,
    user_id: str,
    entry_id: str,
) -> bool:
    return repository.delete_planned_exercise_entry(user_id=user_id, planned_exercise_entry_id=entry_id)


def update_planned_exercise_entry_completion(
    repository: SQLiteRepository,
    user_id: str,
    entry_id: str,
    completed_at: datetime | None,
) -> PlannedExerciseEntry | None:
    entry = repository.update_planned_exercise_entry_completion(
        user_id=user_id,
        planned_exercise_entry_id=entry_id,
        completed_at=completed_at,
    )
    if entry is None:
        return None
    return PlannedExerciseEntry.model_validate(entry)


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
    ensure_default_meal_plan_window(repository, user_id=user_id)
    return [MealPlanDay.model_validate(day) for day in repository.list_meal_plan_days(user_id)]


def update_meal_plan_slot_eaten_at(
    repository: SQLiteRepository,
    user_id: str,
    slot_id: str,
    eaten_at: datetime | None,
) -> MealPlanDay | None:
    day = repository.update_meal_plan_slot_eaten_at(user_id, slot_id, eaten_at)
    if day is None:
        return None
    return MealPlanDay.model_validate(day)


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
