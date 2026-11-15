NON_EXERCISE_ACTIVITY_FACTORS = {
    "sedentary": 1.20,
    "light": 1.30,
    "moderate": 1.45,
    "very_active": 1.60,
    "extra_active": 1.75,
}

GOAL_CALORIE_ADJUSTMENTS = {
    ("lose", "light"): -350,
    ("lose", "recommended"): -500,
    ("lose", "extreme"): -1000,
    ("lose", None): -500,
    ("maintain", None): 0,
    # Maintenance focus changes the macro split, not the calories.
    ("maintain", "steady"): 0,
    ("maintain", "build_muscle"): 0,
    ("maintain", "fuel_training"): 0,
    ("gain", "lean"): 200,
    ("gain", "aggressive"): 500,
    ("gain", None): 200,
}

# The minimum most dietitians recommend without medical supervision. It is a recommendation:
# users can opt out (calorie_floor = "off") after a warning, as in MacroFactor.
RECOMMENDED_MINIMUM_CALORIES = {"female": 1200, "male": 1500}
CALORIE_FLOOR_CHOICES = ("recommended", "off")


def recommended_minimum_calories(sex: str) -> int:
    return RECOMMENDED_MINIMUM_CALORIES.get(sex, RECOMMENDED_MINIMUM_CALORIES["female"])


def calculate_energy_targets(
    *,
    sex: str,
    age_years: int,
    height_cm: float,
    current_weight_lbs: float,
    activity_level: str,
    goal_type: str,
    goal_pace: str | None = None,
    calorie_floor: str = "recommended",
) -> tuple[int, int, int]:
    """BMR, maintenance, and the daily target. With the recommended floor the target never goes
    below the minimum for the user's sex; with the floor off it is the calculation as is."""
    weight_kg = current_weight_lbs / 2.2046226218
    sex_adjustment = 5 if sex == "male" else -161
    resting_energy = 10 * weight_kg + 6.25 * height_cm - 5 * age_years + sex_adjustment
    maintenance = resting_energy * NON_EXERCISE_ACTIVITY_FACTORS[activity_level]
    try:
        calorie_adjustment = GOAL_CALORIE_ADJUSTMENTS[(goal_type, goal_pace)]
    except KeyError as error:
        raise ValueError(f"Pace {goal_pace!r} does not apply to goal {goal_type!r}.") from error
    calorie_target = max(1, maintenance + calorie_adjustment)
    if calorie_floor != "off":
        calorie_target = max(recommended_minimum_calories(sex), calorie_target)
    return round(resting_energy), round(maintenance), round(calorie_target)


def calculate_onboarding_energy_targets(payload) -> tuple[int, int, int]:
    return calculate_energy_targets(
        sex=payload.sex,
        age_years=payload.age_years,
        height_cm=payload.height_cm,
        current_weight_lbs=payload.current_weight_lbs,
        activity_level=payload.activity_level,
        goal_type=payload.goal_type,
        goal_pace=getattr(payload, "goal_pace", None),
    )
