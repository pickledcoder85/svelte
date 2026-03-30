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
        target_weight_lbs=185,
        activity_level="moderate",
    )

    bmr, maintenance, calorie_target = calculate_onboarding_energy_targets(payload)

    assert bmr == 1887
    assert maintenance == 2736
    assert calorie_target == 2236


def test_macro_targets_shift_by_goal_type_instead_of_fixed_ratio():
    loss_targets = generate_macro_targets(
        calorie_target=2236,
        current_weight_lbs=200,
        goal_type="lose",
    )
    maintain_targets = generate_macro_targets(
        calorie_target=2736,
        current_weight_lbs=200,
        goal_type="maintain",
    )
    gain_targets = generate_macro_targets(
        calorie_target=2936,
        current_weight_lbs=200,
        goal_type="gain",
    )

    assert loss_targets == (163.3, 256.0, 62.1)
    assert maintain_targets == (145.1, 333.7, 91.2)
    assert gain_targets == (163.3, 387.1, 81.6)


def test_generated_nutrition_targets_include_fiber_and_provenance():
    targets = generate_nutrition_targets(
        sex="male",
        age_years=30,
        height_cm=180,
        current_weight_lbs=200,
        activity_level="moderate",
        goal_type="lose",
    )

    assert targets.bmr_calories == 1887
    assert targets.maintenance_calories == 2736
    assert targets.calorie_target == 2236
    assert targets.protein_target_g == 163.3
    assert targets.carbs_target_g == 256.0
    assert targets.fat_target_g == 62.1
    assert targets.fiber_target_g == 31.3
    assert targets.calculation_version == "v1"
    assert targets.target_source == "system_default"


def test_fiber_target_scales_with_calories():
    assert generate_fiber_target(2236) == 31.3
    assert generate_fiber_target(2624) == 36.7
