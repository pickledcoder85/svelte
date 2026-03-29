from backend.app.models.profile import UserOnboardingRequest

NON_EXERCISE_ACTIVITY_FACTORS = {
    "sedentary": 1.20,
    "light": 1.30,
    "moderate": 1.45,
    "very_active": 1.60,
    "extra_active": 1.75,
}

GOAL_CALORIE_ADJUSTMENTS = {
    "lose": -500,
    "maintain": 0,
    "gain": 200,
}

MINIMUM_CALORIE_TARGET = 1200


def calculate_onboarding_energy_targets(payload: UserOnboardingRequest) -> tuple[int, int, int]:
    weight_kg = payload.current_weight_lbs / 2.2046226218
    sex_adjustment = 5 if payload.sex == "male" else -161
    resting_energy = 10 * weight_kg + 6.25 * payload.height_cm - 5 * payload.age_years + sex_adjustment
    maintenance = resting_energy * NON_EXERCISE_ACTIVITY_FACTORS[payload.activity_level]
    calorie_target = max(MINIMUM_CALORIE_TARGET, maintenance + GOAL_CALORIE_ADJUSTMENTS[payload.goal_type])
    return round(resting_energy), round(maintenance), round(calorie_target)
