from __future__ import annotations

from datetime import date

from backend.app.db.database import get_database_url, resolve_sqlite_path
from backend.app.models.auth import AuthSession
from backend.app.repositories.sqlite import SQLiteRepository

DEV_USER_EMAIL = "dev@example.com"
DEV_USER_DISPLAY_NAME = "Local Dev User"


def seed_dev_data(database_url: str | None = None) -> dict[str, str]:
    resolved_database_url = database_url or get_database_url()
    database_path = resolve_sqlite_path(resolved_database_url)
    repository = SQLiteRepository(database_path)

    session = AuthSession.create_local(DEV_USER_EMAIL, DEV_USER_DISPLAY_NAME)
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
        timezone="America/New_York",
        units="imperial",
    )
    repository.save_session(session)
    repository.save_user_onboarding(
        user_id=session.user_id,
        sex="male",
        age_years=34,
        height_cm=178,
        current_weight_lbs=181.2,
        goal_type="lose",
        target_weight_lbs=175.0,
        activity_level="moderate",
        bmr_calories=1788,
        tdee_calories=2771,
        initial_calorie_target=2271,
    )
    repository.save_user_goal(
        user_id=session.user_id,
        effective_at=date(2026, 3, 23),
        calorie_goal=2100,
        protein_goal=180,
        carbs_goal=190,
        fat_goal=60,
        target_weight_lbs=175.0,
    )

    for recorded_at, weight_lbs in [
        (date(2026, 3, 21), 181.2),
        (date(2026, 3, 24), 180.6),
        (date(2026, 3, 27), 179.8),
        (date(2026, 3, 28), 179.4),
    ]:
        repository.record_weight_entry(
            user_id=session.user_id,
            recorded_at=recorded_at,
            weight_lbs=weight_lbs,
        )

    log_id = repository.create_food_log(
        user_id=session.user_id,
        log_date=date(2026, 3, 28),
        notes="Seeded local development log",
    )
    repository.add_food_log_entry(
        food_log_id=log_id,
        entry_type="food",
        food_item_id="food-greek-yogurt",
        calories=177,
        protein=30.9,
        carbs=10.8,
        fat=1.2,
        grams=300,
    )
    repository.add_food_log_entry(
        food_log_id=log_id,
        entry_type="food",
        food_item_id="food-oats",
        calories=311.2,
        protein=13.5,
        carbs=53.0,
        fat=5.5,
        grams=80,
    )
    repository.add_food_log_entry(
        food_log_id=log_id,
        entry_type="food",
        food_item_id="food-blueberries",
        calories=79.8,
        protein=1.0,
        carbs=20.3,
        fat=0.4,
        grams=140,
    )
    repository.create_exercise_entry(
        user_id=session.user_id,
        title="Incline walk",
        duration_minutes=35,
        calories_burned=240,
        logged_on=date(2026, 3, 28),
        logged_at="07:15",
        intensity="Moderate",
    )
    repository.save_meal_plan_day(
        user_id=session.user_id,
        plan_date=date(2026, 3, 31),
        label="Tue",
        focus="Training day",
        slots=[
            {
                "meal_label": "Breakfast",
                "title": "Greek yogurt + berries",
                "calories": 320,
                "prep_status": "Prepped",
            },
            {
                "meal_label": "Lunch",
                "title": "Chicken rice bowl",
                "calories": 610,
                "prep_status": "Needs prep",
            },
        ],
    )
    repository.create_meal_prep_task(
        user_id=session.user_id,
        title="Bake chicken breast",
        category="Protein",
        portions="8 portions",
        status="Queued",
        scheduled_for=date(2026, 3, 30),
    )

    return {
        "database_path": database_path,
        "user_email": session.email,
        "access_token": session.access_token,
    }
