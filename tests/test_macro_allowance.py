"""Workout days: the macro split at the day's allowance (the same examples as the app's tests)."""

from backend.app.services.calculations.macros import fat_share_for, macros_for_allowance


def test_protein_stays_fat_gets_its_share_carbs_the_rest():
    assert macros_for_allowance(base_calories=1500, protein=150, carbs=102, fat=42, allowance=1800, fat_share=0.25) == (150, 159, 50)


def test_a_fat_floor_above_the_share_is_kept():
    assert macros_for_allowance(base_calories=1500, protein=150, carbs=60, fat=60, allowance=1800, fat_share=0.25) == (150, 135, 60)


def test_a_custom_low_fat_goal_grows_by_the_extra_only():
    # 2,000 kcal custom goal with 33 g fat; a 100 kcal walk adds about 3 g fat, not 25.
    protein, carbs, fat = macros_for_allowance(base_calories=2000, protein=150, carbs=275, fat=33, allowance=2100, fat_share=0.25)
    assert (protein, carbs, fat) == (150, 294, 36)
    assert protein * 4 + carbs * 4 + fat * 9 <= 2100 + 9


def test_days_without_workout_calories_are_unchanged():
    assert macros_for_allowance(base_calories=1500, protein=150, carbs=102, fat=42, allowance=1500, fat_share=0.25) == (150, 102, 42)


def test_fat_share_by_goal():
    assert fat_share_for("lose", "recommended") == 0.25
    assert fat_share_for("maintain", "fuel_training") == 0.22
    assert fat_share_for("maintain", None) == 0.30
    assert fat_share_for(None) == 0.25


def test_gus_budgets_use_the_workout_days_macros(repository):
    from datetime import date

    from backend.app.services.meal_suggest import meal_budget
    from tests.test_meal_suggest import _onboard

    _onboard(repository)  # 1,500 kcal: 120 g protein, 118 g carbs, 50 g fat; losing (25% fat)
    repository.update_user_preferences(user_id="u1", workout_calories_share=100)
    day = date(2026, 11, 16)
    repository.create_exercise_entry(user_id="u1", title="Ride", duration_minutes=60, calories_burned=300,
                                     logged_on=day, logged_at="7:00 AM", intensity="High")
    _, _, remaining = meal_budget(repository, "u1", day, "dinner")
    assert round(remaining.calories) == 1800
    assert round(remaining.protein) == 120  # protein stays
    assert round(remaining.fat) == 50  # 25% of 1,800 = 50 g, the same as the base fat
    assert round(remaining.carbs) == 118 + 75  # the other 300 kcal
