import pytest

from backend.app.services.calculations.targets import generate_nutrition_targets, preview_target_options

BODY = {"sex": "male", "age_years": 30, "height_cm": 180, "current_weight_lbs": 200, "activity_level": "moderate"}


def test_preview_matches_saved_targets_for_every_option():
    preview = preview_target_options(**BODY)
    assert preview["bmr_calories"] == 1887
    assert preview["maintenance_calories"] == 2736
    assert {(o["goal_type"], o["goal_pace"]) for o in preview["options"]} == {
        ("lose", "light"), ("lose", "recommended"), ("lose", "extreme"),
        ("maintain", "steady"), ("maintain", "build_muscle"), ("maintain", "fuel_training"),
        ("gain", "lean"), ("gain", "aggressive"),
    }
    for option in preview["options"]:
        saved = generate_nutrition_targets(**BODY, goal_type=option["goal_type"], goal_pace=option["goal_pace"])
        assert option["calorie_target"] == saved.calorie_target
        assert (option["protein_target_g"], option["carbs_target_g"], option["fat_target_g"]) == (
            saved.protein_target_g, saved.carbs_target_g, saved.fat_target_g,
        )


def test_preview_weekly_rates_follow_the_daily_change():
    options = {(o["goal_type"], o["goal_pace"]): o for o in preview_target_options(**BODY)["options"]}
    assert options[("lose", "recommended")]["daily_adjustment"] == -500
    assert options[("lose", "recommended")]["weekly_change_lbs"] == -1.0
    assert options[("lose", "extreme")]["weekly_change_lbs"] == -2.0
    assert options[("gain", "lean")]["weekly_change_lbs"] == 0.4
    assert options[("maintain", "steady")]["weekly_change_lbs"] == 0


def test_minimum_floor_is_reported_instead_of_hidden():
    # Maintenance ~1,475 kcal: above the 1,200 floor, but the faster losses would go below it.
    small = {"sex": "female", "age_years": 40, "height_cm": 160, "current_weight_lbs": 130, "activity_level": "sedentary"}
    preview = preview_target_options(**small)
    assert preview["maintenance_calories"] > 1200
    options = {(o["goal_type"], o["goal_pace"]): o for o in preview["options"]}
    extreme = options[("lose", "extreme")]
    assert extreme["calorie_target"] == 1200
    assert extreme["limited_by_minimum"] is True
    assert options[("maintain", "steady")]["limited_by_minimum"] is False
    assert options[("gain", "lean")]["limited_by_minimum"] is False


def test_maintenance_focus_keeps_calories_and_shifts_macros():
    steady = generate_nutrition_targets(**BODY, goal_type="maintain", goal_pace="steady")
    muscle = generate_nutrition_targets(**BODY, goal_type="maintain", goal_pace="build_muscle")
    fuel = generate_nutrition_targets(**BODY, goal_type="maintain", goal_pace="fuel_training")
    legacy = generate_nutrition_targets(**BODY, goal_type="maintain", goal_pace=None)

    assert steady.calorie_target == muscle.calorie_target == fuel.calorie_target == legacy.calorie_target
    assert (steady.protein_target_g, steady.carbs_target_g, steady.fat_target_g) == (
        legacy.protein_target_g, legacy.carbs_target_g, legacy.fat_target_g,
    )
    assert muscle.protein_target_g > steady.protein_target_g
    assert fuel.carbs_target_g > steady.carbs_target_g
    assert fuel.fat_target_g < steady.fat_target_g


def test_mismatched_goal_and_pace_is_a_value_error():
    with pytest.raises(ValueError, match="does not apply"):
        generate_nutrition_targets(**BODY, goal_type="lose", goal_pace="lean")


@pytest.mark.asyncio
async def test_preview_endpoint_and_onboarding_with_focus_and_goal_weight(client, auth_headers):
    preview = await client.post("/api/profile/targets/preview", headers=auth_headers, json=BODY)
    assert preview.status_code == 200
    assert preview.json()["maintenance_calories"] == 2736
    assert len(preview.json()["options"]) == 8

    bad_pair = await client.post(
        "/api/profile/onboarding",
        headers=auth_headers,
        json={**BODY, "goal_type": "lose", "goal_pace": "lean", "dietary_pattern": "omnivore"},
    )
    assert bad_pair.status_code == 422

    done = await client.post(
        "/api/profile/onboarding",
        headers=auth_headers,
        json={
            **BODY,
            "goal_type": "maintain",
            "goal_pace": "build_muscle",
            "target_weight_lbs": 195,
            "dietary_pattern": "omnivore",
        },
    )
    assert done.status_code == 200
    profile = done.json()
    assert (profile["goal_type"], profile["goal_pace"], profile["target_weight_lbs"]) == ("maintain", "build_muscle", 195)
    goals = (await client.get("/api/profile/goals", headers=auth_headers)).json()
    muscle = next(o for o in preview.json()["options"] if o["goal_pace"] == "build_muscle")
    assert goals[0]["protein_goal"] == muscle["protein_target_g"]


@pytest.mark.asyncio
async def test_preview_requires_a_session(client):
    assert (await client.post("/api/profile/targets/preview", json=BODY)).status_code == 401


def test_preview_flags_when_maintenance_itself_is_below_the_floor():
    tiny = {"sex": "female", "age_years": 75, "height_cm": 150, "current_weight_lbs": 95, "activity_level": "sedentary"}
    preview = preview_target_options(**tiny)
    assert preview["maintenance_calories"] < 1200
    assert preview["maintenance_below_minimum"] is True
    options = {(o["goal_type"], o["goal_pace"]): o for o in preview["options"]}
    # The floor makes even "lose" a small surplus; the flag only marks clamped loss paces.
    assert options[("lose", "recommended")]["weekly_change_lbs"] > 0
    assert options[("lose", "recommended")]["limited_by_minimum"] is True
    assert options[("maintain", "steady")]["limited_by_minimum"] is False
    assert preview_target_options(**BODY)["maintenance_below_minimum"] is False


@pytest.mark.asyncio
async def test_unrelated_profile_save_keeps_a_custom_goal_for_legacy_maintain_users(client, auth_headers):
    """Regression: a maintain profile saved with goal_pace NULL (before focus existed) must not be
    recalculated, replacing the user's custom goal, when the editor sends goal_pace 'steady'."""
    onboard = {**BODY, "goal_type": "maintain", "goal_pace": None, "dietary_pattern": "omnivore"}
    assert (await client.post("/api/profile/onboarding", headers=auth_headers, json=onboard)).status_code == 200
    custom = await client.post(
        "/api/profile/goals",
        headers=auth_headers,
        json={"effective_at": "2026-11-14", "calorie_goal": 2000, "protein_goal": 150, "carbs_goal": 200, "fat_goal": 60},
    )
    assert custom.status_code in (200, 201)

    saved = await client.put(
        "/api/profile",
        headers=auth_headers,
        json={**onboard, "goal_pace": "steady", "display_name": "Renamed", "timezone": "UTC", "units": "imperial"},
    )
    assert saved.status_code == 200
    goals = (await client.get("/api/profile/goals", headers=auth_headers)).json()
    assert goals[0]["calorie_goal"] == 2000
    assert goals[0]["target_source"] == "user_custom"


@pytest.mark.asyncio
async def test_changing_only_the_goal_drops_a_pace_from_the_old_goal(client, auth_headers):
    onboard = {**BODY, "goal_type": "lose", "goal_pace": "extreme", "dietary_pattern": "omnivore"}
    assert (await client.post("/api/profile/onboarding", headers=auth_headers, json=onboard)).status_code == 200
    changed = await client.put(
        "/api/profile", headers=auth_headers, json={"goal_type": "maintain", "timezone": "UTC", "units": "imperial"}
    )
    assert changed.status_code == 200
    assert changed.json()["goal_type"] == "maintain"
    assert changed.json()["goal_pace"] in (None, "steady")
