from backend.app.models.profile import UserOnboardingRequest
from backend.app.services.calculations.energy import calculate_onboarding_energy_targets
from backend.app.services.calculations.macros import generate_fiber_target, generate_macro_targets
from backend.app.services.calculations.targets import generate_nutrition_targets


def test_energy_targets_use_conservative_non_exercise_activity_factor():
    payload = UserOnboardingRequest(
        sex="male",
        age_years=30,
        height_cm=180,
        current_weight_lbs=200,
        goal_type="lose",
        goal_pace="recommended",
        target_weight_lbs=185,
        activity_level="moderate",
        dietary_pattern="omnivore",
        nutrition_style="balanced",
    )

    bmr, maintenance, calorie_target = calculate_onboarding_energy_targets(payload)

    assert bmr == 1890
    assert maintenance == 2740
    assert calorie_target == 2240


def test_macro_targets_shift_by_goal_type_instead_of_fixed_ratio():
    loss_targets = generate_macro_targets(
        calorie_target=2240,
        current_weight_lbs=200,
        goal_type="lose",
    )
    maintain_targets = generate_macro_targets(
        calorie_target=2740,
        current_weight_lbs=200,
        goal_type="maintain",
    )
    gain_targets = generate_macro_targets(
        calorie_target=2940,
        current_weight_lbs=200,
        goal_type="gain",
    )

    # Whole grams; carbs are the remainder, rounded down so macros never exceed the target.
    assert loss_targets == (163.0, 257.0, 62.0)
    assert maintain_targets == (145.0, 335.0, 91.0)
    assert gain_targets == (163.0, 387.0, 82.0)


def test_generated_nutrition_targets_include_fiber_and_provenance():
    targets = generate_nutrition_targets(
        sex="male",
        age_years=30,
        height_cm=180,
        current_weight_lbs=200,
        activity_level="moderate",
        goal_type="lose",
        goal_pace="recommended",
    )

    assert targets.bmr_calories == 1890
    assert targets.maintenance_calories == 2740
    assert targets.calorie_target == 2240
    assert targets.protein_target_g == 163.0
    assert targets.carbs_target_g == 257.0
    assert targets.fat_target_g == 62.0
    assert targets.fiber_target_g == 31.0
    assert targets.goal_pace == "recommended"
    assert targets.calculation_version == "v3"
    assert targets.target_source == "system_default"


def test_fiber_target_scales_with_calories():
    assert generate_fiber_target(2240) == 31.0
    assert generate_fiber_target(2620) == 37.0


def test_energy_targets_use_goal_pace_adjustments():
    recommended_cut = generate_nutrition_targets(
        sex="male",
        age_years=30,
        height_cm=180,
        current_weight_lbs=200,
        activity_level="moderate",
        goal_type="lose",
        goal_pace="recommended",
    )
    extreme_cut = generate_nutrition_targets(
        sex="male",
        age_years=30,
        height_cm=180,
        current_weight_lbs=200,
        activity_level="moderate",
        goal_type="lose",
        goal_pace="extreme",
    )
    aggressive_gain = generate_nutrition_targets(
        sex="male",
        age_years=30,
        height_cm=180,
        current_weight_lbs=200,
        activity_level="moderate",
        goal_type="gain",
        goal_pace="aggressive",
    )

    assert recommended_cut.calorie_target == 2240
    assert extreme_cut.calorie_target == 1740
    assert aggressive_gain.calorie_target == 3240


def test_estimates_round_to_10_kcal_and_macros_to_whole_grams():
    for weight in (130, 165, 200, 245):
        for level in ("sedentary", "moderate", "extra_active"):
            for goal, pace in (("lose", "recommended"), ("maintain", "steady"), ("gain", "lean")):
                targets = generate_nutrition_targets(
                    sex="female", age_years=41, height_cm=167, current_weight_lbs=weight,
                    activity_level=level, goal_type=goal, goal_pace=pace,
                )
                assert targets.bmr_calories % 10 == 0
                assert targets.maintenance_calories % 10 == 0
                assert targets.calorie_target % 10 == 0
                for grams in (targets.protein_target_g, targets.carbs_target_g, targets.fat_target_g, targets.fiber_target_g):
                    assert grams == int(grams)
                macro_calories = targets.protein_target_g * 4 + targets.carbs_target_g * 4 + targets.fat_target_g * 9
                assert macro_calories <= targets.calorie_target
