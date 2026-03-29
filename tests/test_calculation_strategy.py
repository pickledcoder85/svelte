from backend.app.models.profile import UserOnboardingRequest
from backend.app.services.calculations.energy import calculate_onboarding_energy_targets
from backend.app.services.calculations.macros import generate_macro_targets


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
