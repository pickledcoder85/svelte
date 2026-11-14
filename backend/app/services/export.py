"""Full JSON export of the owner's data: a readable escape hatch next to SQLite backups."""

from datetime import UTC, datetime
from typing import Any

from fastapi.encoders import jsonable_encoder

from backend.app.repositories.sqlite import SQLiteRepository

EXPORT_FORMAT_VERSION = 1


def build_user_export(repository: SQLiteRepository, user_id: str) -> dict[str, Any]:
    food_logs = [
        repository.get_food_log(log["id"]) or log
        for log in repository.list_food_logs(user_id)
    ]
    ingestion_jobs = repository.list_ingestion_jobs(user_id)
    ingestion_outputs = [
        output
        for job in ingestion_jobs
        for output in repository.list_ingestion_outputs(job["id"])
    ]
    export = {
        "format": "relish-export",
        "format_version": EXPORT_FORMAT_VERSION,
        "exported_at": datetime.now(UTC).isoformat(),
        "user_id": user_id,
        "profile": repository.get_user_identity(user_id),
        "goals": repository.list_user_goals(user_id),
        "weight_entries": repository.list_weight_entries(user_id),
        "food_logs": food_logs,
        "exercise_entries": repository.list_exercise_entries(user_id),
        "planned_workout_sessions": repository.list_planned_workout_sessions(user_id),
        "meal_plan_days": repository.list_meal_plan_days(user_id),
        "meal_prep_tasks": repository.list_meal_prep_tasks(user_id),
        "favorites": repository.list_saved_favorites(user_id),
        # The food bank, recipes, and meal templates are shared catalogs in this
        # single-owner app, so they are exported in full.
        "food_bank": repository.list_foods(),
        "recipes": repository.list_recipes(),
        "meal_templates": repository.list_meal_templates(),
        "ingestion_jobs": ingestion_jobs,
        "ingestion_outputs": ingestion_outputs,
    }
    return jsonable_encoder(export)
