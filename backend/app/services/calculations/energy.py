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


def calculate_energy_targets(
    *,
    sex: str,
    age_years: int,
    height_cm: float,
    current_weight_lbs: float,
    activity_level: str,
    goal_type: str,
) -> tuple[int, int, int]:
    weight_kg = current_weight_lbs / 2.2046226218
    sex_adjustment = 5 if sex == "male" else -161
    resting_energy = 10 * weight_kg + 6.25 * height_cm - 5 * age_years + sex_adjustment
    maintenance = resting_energy * NON_EXERCISE_ACTIVITY_FACTORS[activity_level]
    calorie_target = max(MINIMUM_CALORIE_TARGET, maintenance + GOAL_CALORIE_ADJUSTMENTS[goal_type])
    return round(resting_energy), round(maintenance), round(calorie_target)


def calculate_onboarding_energy_targets(payload) -> tuple[int, int, int]:
    return calculate_energy_targets(
        sex=payload.sex,
        age_years=payload.age_years,
        height_cm=payload.height_cm,
        current_weight_lbs=payload.current_weight_lbs,
        activity_level=payload.activity_level,
        goal_type=payload.goal_type,
    )
