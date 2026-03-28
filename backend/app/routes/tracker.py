from fastapi import APIRouter, Depends, HTTPException

from backend.app.dependencies import get_required_session, get_repository
from backend.app.models.tracker import (
    ExerciseEntry,
    ExerciseEntryCreateRequest,
    MealPlanDay,
    MealPlanDayCreateRequest,
    MealPrepTask,
    MealPrepTaskCreateRequest,
    MealPrepTaskStatusUpdateRequest,
)
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.tracker import (
    create_exercise_entry,
    create_meal_prep_task,
    list_exercise_entries,
    list_meal_plan_days,
    list_meal_prep_tasks,
    save_meal_plan_day,
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
