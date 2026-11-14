from __future__ import annotations

from datetime import date
from typing import Iterable

from backend.app.db.database import get_database_url, resolve_sqlite_path
from backend.app.models.auth import AuthSession
from backend.app.models.recipes import RecipeAsset, RecipeDefinition
from backend.app.repositories.sqlite import SQLiteRepository

DEV_USER_EMAIL = "dev@example.com"
DEV_USER_DISPLAY_NAME = "Local Dev User"


def _demo_recipes() -> list[RecipeDefinition]:
    return [
        RecipeDefinition(
            id="recipe-overnight-oats",
            title="Overnight Oats Base",
            favorite=True,
            steps=[
                "Combine oats, yogurt, chia seeds, and berries in a jar.",
                "Rest chilled overnight.",
                "Stir and portion into two servings in the morning.",
            ],
            ingredients=[
                {
                    "id": "ingredient-oats",
                    "food_id": "food-oats",
                    "name": "Rolled oats",
                    "grams": 80,
                    "calories_per_100g": 389,
                    "macros_per_100g": {"protein": 16.9, "carbs": 66.3, "fat": 6.9},
                },
                {
                    "id": "ingredient-yogurt",
                    "food_id": "food-greek-yogurt",
                    "name": "Greek yogurt",
                    "grams": 300,
                    "calories_per_100g": 59,
                    "macros_per_100g": {"protein": 10.3, "carbs": 3.6, "fat": 0.4},
                },
                {
                    "id": "ingredient-berries",
                    "food_id": "food-blueberries",
                    "name": "Blueberries",
                    "grams": 140,
                    "calories_per_100g": 57,
                    "macros_per_100g": {"protein": 0.7, "carbs": 14.5, "fat": 0.3},
                },
                {
                    "id": "ingredient-chia",
                    "food_id": "food-chia-seeds",
                    "name": "Chia seeds",
                    "grams": 20,
                    "calories_per_100g": 486,
                    "macros_per_100g": {"protein": 16.5, "carbs": 42.1, "fat": 30.7},
                },
            ],
            assets=[
                RecipeAsset(kind="text", content="Base overnight oats with high-protein yogurt and berries.")
            ],
            default_yield=2,
        ),
        RecipeDefinition(
            id="recipe-summer-parfait",
            title="Summer Berry Parfait",
            favorite=True,
            steps=[
                "Layer yogurt, granola, and berries into two jars.",
                "Top with mint and chill briefly before serving.",
            ],
            ingredients=[
                {
                    "id": "ingredient-yogurt-parfait",
                    "food_id": "food-greek-yogurt",
                    "name": "Greek yogurt",
                    "grams": 240,
                    "calories_per_100g": 59,
                    "macros_per_100g": {"protein": 10.3, "carbs": 3.6, "fat": 0.4},
                },
                {
                    "id": "ingredient-granola",
                    "food_id": "food-granola",
                    "name": "Granola",
                    "grams": 70,
                    "calories_per_100g": 471,
                    "macros_per_100g": {"protein": 10, "carbs": 64, "fat": 20},
                },
                {
                    "id": "ingredient-strawberries",
                    "food_id": "food-strawberries",
                    "name": "Strawberries",
                    "grams": 160,
                    "calories_per_100g": 32,
                    "macros_per_100g": {"protein": 0.7, "carbs": 7.7, "fat": 0.3},
                },
            ],
            assets=[
                RecipeAsset(kind="image", content="Layered berry parfait jar with yogurt and granola.")
            ],
            default_yield=2,
        ),
        RecipeDefinition(
            id="recipe-citrus-chicken",
            title="Citrus Chicken Bowl",
            favorite=False,
            steps=[
                "Roast chicken with citrus, garlic, and olive oil.",
                "Cook rice and steam broccoli.",
                "Assemble bowls and finish with fresh herbs.",
            ],
            ingredients=[
                {
                    "id": "ingredient-chicken",
                    "food_id": "food-chicken-breast",
                    "name": "Chicken breast",
                    "grams": 400,
                    "calories_per_100g": 165,
                    "macros_per_100g": {"protein": 31, "carbs": 0, "fat": 3.6},
                },
                {
                    "id": "ingredient-rice",
                    "food_id": "food-rice",
                    "name": "Cooked rice",
                    "grams": 360,
                    "calories_per_100g": 130,
                    "macros_per_100g": {"protein": 2.7, "carbs": 28.2, "fat": 0.3},
                },
                {
                    "id": "ingredient-broccoli",
                    "food_id": "food-broccoli",
                    "name": "Broccoli",
                    "grams": 220,
                    "calories_per_100g": 34,
                    "macros_per_100g": {"protein": 2.8, "carbs": 6.6, "fat": 0.4},
                },
            ],
            assets=[
                RecipeAsset(kind="text", content="Roasted citrus chicken meal-prep bowl with rice and broccoli.")
            ],
            default_yield=4,
        ),
    ]


def seed_demo_recipes(
    repository: SQLiteRepository,
    *,
    user_id: str,
    recipes: Iterable[RecipeDefinition] | None = None,
) -> None:
    for recipe in recipes or _demo_recipes():
        repository.save_recipe(recipe)
        if recipe.favorite:
            repository.save_favorite(user_id=user_id, entity_type="recipe", entity_id=recipe.id)


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
        goal_pace="recommended",
        target_weight_lbs=175.0,
        activity_level="moderate",
        dietary_pattern="omnivore",
        nutrition_style="balanced",
        allergy_notes=None,
        bmr_calories=1788,
        tdee_calories=2771,
        initial_calorie_target=2271,
        protein_target_g=180,
        carbs_target_g=190,
        fat_target_g=60,
        fiber_target_g=30,
        calculation_version="v1",
        target_source="system_default",
    )
    repository.save_user_goal(
        user_id=session.user_id,
        effective_at=date(2026, 3, 23),
        calorie_goal=2100,
        protein_goal=180,
        carbs_goal=190,
        fat_goal=60,
        fiber_goal=30,
        goal_type="lose",
        goal_pace="recommended",
        calculation_version="v1",
        target_source="system_default",
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
    repository.create_exercise_entry(
        user_id=session.user_id,
        title="Swim 2000m · 400m warmup · 4 x 50m drills · 10 x 100m steady · 400m cool-down",
        duration_minutes=55,
        calories_burned=520,
        logged_on=date.today(),
        logged_at="06:30",
        intensity="High",
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
    seed_demo_recipes(repository, user_id=session.user_id)

    return {
        "database_path": database_path,
        "user_email": session.email,
        "access_token": session.access_token,
    }
