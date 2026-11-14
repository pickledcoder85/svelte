from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.tracker import (
    ExerciseEntry,
    ExerciseEntryCreateRequest,
    MealPlanDay,
    MealPlanDayCreateRequest,
    MealPlanSlotEatenAtUpdateRequest,
    PlannedExerciseEntryCompletionRequest,
    PlannedExerciseEntry,
    PlannedExerciseEntryCreateRequest,
    PlannedExerciseEntryUpdateRequest,
    PlannedWorkoutSession,
    PlannedWorkoutSessionCompletionRequest,
    PlannedWorkoutSessionCreateRequest,
    PlannedWorkoutSessionUpdateRequest,
    MealPrepTask,
    MealPrepTaskCreateRequest,
    MealPrepTaskStatusUpdateRequest,
)
from backend.app.repositories.sqlite import ExerciseLinkedToPlanError, SQLiteRepository
from backend.app.services.tracker import (
    create_exercise_entry,
    create_planned_exercise_entry,
    create_planned_workout_session,
    delete_exercise_entry,
    update_exercise_entry,
    create_meal_prep_task,
    delete_planned_workout_session,
    list_exercise_entries,
    list_meal_plan_days,
    list_planned_exercise_entries,
    list_planned_workout_sessions,
    list_meal_prep_tasks,
    save_meal_plan_day,
    delete_planned_exercise_entry,
    update_planned_exercise_entry,
    update_planned_exercise_entry_completion,
    update_planned_workout_session,
    update_planned_workout_session_completion,
    update_meal_plan_slot_eaten_at,
    update_meal_prep_task_status,
)


router = APIRouter(prefix="/tracker", tags=["tracker"])
@router.get("/exercise", response_model=list[ExerciseEntry])
async def read_exercise_entries(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[ExerciseEntry]:
    return list_exercise_entries(repository, session.user_id)


@router.post("/exercise", response_model=ExerciseEntry)
async def create_exercise(
    payload: ExerciseEntryCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> ExerciseEntry:
    return create_exercise_entry(repository, session, payload)


@router.put("/exercise/{exercise_entry_id}", response_model=ExerciseEntry)
async def update_exercise(
    exercise_entry_id: str,
    payload: ExerciseEntryCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> ExerciseEntry:
    try:
        entry = update_exercise_entry(repository, session.user_id, exercise_entry_id, payload)
    except ExerciseLinkedToPlanError as error:
        raise HTTPException(
            status_code=409,
            detail="This exercise came from a planned workout. Edit the planned workout instead.",
        ) from error
    if entry is None:
        raise HTTPException(status_code=404, detail="Exercise entry not found.")
    return entry


@router.delete("/exercise/{exercise_entry_id}", status_code=204)
async def delete_exercise(
    exercise_entry_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> None:
    if not delete_exercise_entry(repository, session.user_id, exercise_entry_id):
        raise HTTPException(status_code=404, detail="Exercise entry not found.")


@router.get("/planned-exercise", response_model=list[PlannedExerciseEntry])
async def read_planned_exercise_entries(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[PlannedExerciseEntry]:
    return list_planned_exercise_entries(repository, session.user_id)


@router.get("/planned-workout-sessions", response_model=list[PlannedWorkoutSession])
async def read_planned_workout_sessions(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[PlannedWorkoutSession]:
    return list_planned_workout_sessions(repository, session.user_id)


@router.post("/planned-exercise", response_model=PlannedExerciseEntry)
async def create_planned_exercise(
    payload: PlannedExerciseEntryCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> PlannedExerciseEntry:
    return create_planned_exercise_entry(repository, session, payload)


@router.post("/planned-workout-sessions", response_model=PlannedWorkoutSession)
async def create_planned_workout(
    payload: PlannedWorkoutSessionCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> PlannedWorkoutSession:
    return create_planned_workout_session(repository, session, payload)


@router.put("/planned-workout-sessions/{session_id}", response_model=PlannedWorkoutSession)
async def update_planned_workout(
    session_id: str,
    payload: PlannedWorkoutSessionUpdateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> PlannedWorkoutSession:
    planned_workout_session = update_planned_workout_session(repository, session.user_id, session_id, payload)
    if planned_workout_session is None:
        raise HTTPException(status_code=404, detail="Planned workout session not found.")
    return planned_workout_session


@router.patch("/planned-workout-sessions/{session_id}/completion", response_model=PlannedWorkoutSession)
async def update_planned_workout_completion(
    session_id: str,
    payload: PlannedWorkoutSessionCompletionRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> PlannedWorkoutSession:
    planned_workout_session = update_planned_workout_session_completion(
        repository,
        session.user_id,
        session_id,
        payload.completed_at,
    )
    if planned_workout_session is None:
        raise HTTPException(status_code=404, detail="Planned workout session not found.")
    return planned_workout_session


@router.delete("/planned-workout-sessions/{session_id}", status_code=204)
async def delete_planned_workout(
    session_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> None:
    deleted = delete_planned_workout_session(repository, session.user_id, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Planned workout session not found.")


@router.put("/planned-exercise/{entry_id}", response_model=PlannedExerciseEntry)
async def update_planned_exercise(
    entry_id: str,
    payload: PlannedExerciseEntryUpdateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> PlannedExerciseEntry:
    entry = update_planned_exercise_entry(repository, session.user_id, entry_id, payload)
    if entry is None:
        raise HTTPException(status_code=404, detail="Planned exercise entry not found.")
    return entry


@router.delete("/planned-exercise/{entry_id}", status_code=204)
async def delete_planned_exercise(
    entry_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> None:
    deleted = delete_planned_exercise_entry(repository, session.user_id, entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Planned exercise entry not found.")


@router.patch("/planned-exercise/{entry_id}/completion", response_model=PlannedExerciseEntry)
async def update_planned_exercise_completion(
    entry_id: str,
    payload: PlannedExerciseEntryCompletionRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> PlannedExerciseEntry:
    entry = update_planned_exercise_entry_completion(
        repository,
        session.user_id,
        entry_id,
        payload.completed_at,
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Planned exercise entry not found.")
    return entry


@router.get("/meal-plan", response_model=list[MealPlanDay])
async def read_meal_plan_days(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[MealPlanDay]:
    return list_meal_plan_days(repository, session.user_id)


@router.post("/meal-plan", response_model=MealPlanDay)
async def create_meal_plan_day(
    payload: MealPlanDayCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> MealPlanDay:
    return save_meal_plan_day(repository, session, payload)


@router.patch("/meal-plan/slots/{slot_id}", response_model=MealPlanDay)
async def update_meal_plan_slot(
    slot_id: str,
    payload: MealPlanSlotEatenAtUpdateRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> MealPlanDay:
    day = update_meal_plan_slot_eaten_at(
        repository,
        session.user_id,
        slot_id,
        payload.eaten_at,
    )
    if day is None:
        raise HTTPException(status_code=404, detail="Meal plan slot not found.")
    return day


@router.get("/meal-prep", response_model=list[MealPrepTask])
async def read_meal_prep_tasks(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[MealPrepTask]:
    return list_meal_prep_tasks(repository, session.user_id)


@router.post("/meal-prep", response_model=MealPrepTask)
async def create_meal_prep(
    payload: MealPrepTaskCreateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> MealPrepTask:
    return create_meal_prep_task(repository, session, payload)


@router.patch("/meal-prep/{task_id}", response_model=MealPrepTask)
async def update_meal_prep(
    task_id: str,
    payload: MealPrepTaskStatusUpdateRequest,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> MealPrepTask:
    task = update_meal_prep_task_status(
        repository,
        session.user_id,
        task_id,
        payload.status,
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Meal prep task not found.")
    return task
