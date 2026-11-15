# Calculation Strategy

This document defines the recommended business-logic direction for:

- onboarding calorie and macro targets
- maintenance-calorie estimation
- exercise calorie estimation
- adaptive target updates
- future agent-driven plan recommendations

It is intended to be the canonical design reference before the next calculation refactor lands in code.

Current implementation status:

- partially implemented in the current app baseline
- onboarding calories now route through dedicated energy-calculation helpers
- onboarding macro defaults now route through dedicated macro-calculation helpers
- generated onboarding and profile-update targets now persist calculation provenance and fiber targets
- the app UI now labels the goal choices as `Weight Loss`, `Maintenance`, and `Weight Gain`
- live profile edits now recalculate generated targets and append new goal-history rows
- the full adaptive-maintenance and structured exercise-estimation layers are still pending

## Product goals

The calculation layer should be:

- accurate enough for real personal use
- conservative about false precision
- explicit about assumptions
- versioned so future logic changes are auditable
- flexible enough to support nutrition, training, recovery, and coaching agents later

## Core strategy

The app should use a hybrid model:

1. estimate resting energy with Mifflin-St Jeor
2. estimate base non-exercise maintenance from a conservative activity multiplier
3. track purposeful exercise separately
4. adjust targets by explicit goal type
5. personalize maintenance over time from logged intake plus weight trend

The key design rule is to avoid double-counting exercise.

If the app uses a full activity-factor TDEE and then also adds exercise calories from logged workouts, daily calorie allowances will often be inflated. The app should instead treat baseline lifestyle activity and purposeful exercise as separate layers.

## Initial energy model

### Resting energy

Use Mifflin-St Jeor as the default initial resting energy equation for general adults.

Recommended implementation status:

- keep the current Mifflin-St Jeor baseline
- move it into a dedicated calculation module
- store the calculation version on generated targets

### Base maintenance

Use a conservative non-exercise physical-activity multiplier:

- `sedentary`: `1.20`
- `light`: `1.30`
- `moderate`: `1.45`
- `very_active`: `1.60`
- `extra_active`: `1.75`

These multipliers are intentionally meant to represent non-exercise lifestyle activity, not total training load.

Setup describes the levels in a few words with rough daily step counts (under 5,000; 5,000–7,500; 7,500–10,000; 10,000–15,000; 15,000+), as guides rather than cut-offs (`frontend/src/lib/activity-level.ts`). The target preview returns maintenance for every level (`maintenance_by_activity`) so setup can show the effect of each choice.

### Goal selector

On signup and profile creation, require one primary goal:

- `weight_loss`
- `maintenance`
- `weight_gain`

This goal should drive the default calorie and macro recommendations, but the user must be able to edit those defaults later.

## Goal-based calorie defaults

The app should use bounded default adjustments rather than large unbounded deficits or surpluses.

### Weight loss

- default deficit: `400-600 kcal/day`
- optional pace tiers later:
  - `slow`
  - `moderate`
  - `aggressive`

### Maintenance

- no default deficit or surplus
- a maintenance **focus** (stored in `goal_pace`) changes only the macro split, never calories: `steady` (default), `build_muscle`, `fuel_training`. See Macro strategy → Maintenance.

### Weight gain

- default surplus: `150-300 kcal/day`
- optional pace tiers later:
  - `slow`
  - `moderate`

### Guardrails

The app should enforce lower-bound guardrails on generated calorie targets and clearly distinguish:

- system-generated recommendation
- user-customized target
- future agent-adjusted target

## Macro strategy

The app should stop treating one fixed macro ratio as the primary long-term model.

Recommended order:

1. calculate calorie target
2. set protein target from body weight and goal
3. set a minimum fat floor
4. allocate remaining calories to carbs
5. set fiber independently

### Recommended defaults

#### Weight loss

- protein: `1.6-2.2 g/kg`
- fat: roughly `20-30%` of calories or a body-weight floor
- carbs: remainder
- fiber: `14 g / 1000 kcal`

#### Maintenance

- protein: `1.4-1.8 g/kg`
- fat: roughly `25-35%` of calories
- carbs: remainder
- fiber: `14 g / 1000 kcal`

Implemented focus profiles (`backend/app/services/calculations/macros.py`, 2026-11-14):

| Focus | Protein | Fat floor | Fat share of calories | Effect |
|---|---|---|---|---|
| `steady` (and legacy `null`) | 1.6 g/kg | 0.7 g/kg | 30% | unchanged v1 maintenance split |
| `build_muscle` | 2.0 g/kg | 0.7 g/kg | 27% | more protein for recomposition alongside strength training |
| `fuel_training` | 1.6 g/kg | 0.6 g/kg | 22% | less fat, so more carbohydrate for endurance training |

Calories are identical across focuses, and carbs remain the remainder. Since v2, when the protein and fat floors would exceed the calorie target (very heavy, sedentary bodies, or very low targets with the calorie floor off), fat shrinks first and then protein, so the macros never add up to more than the target; in v1 carbs clamped to 0 and macro calories ran slightly over. `calculation_version` stays `v1` because every pre-existing input (including maintenance with no focus) produces the same targets as before; focus is an additive input. The macro split still does not depend on `dietary_pattern` or `nutrition_style`; style-aware macros remain future work.

#### Weight gain

- protein: `1.6-2.0 g/kg`
- fat: roughly `25-35%` of calories
- carbs: remainder
- fiber: `14 g / 1000 kcal`

## Exercise calorie strategy

The app should support a structured exercise-estimation hierarchy.

Planned workouts should be time-and-structure driven first. Users generally plan sessions by workout content, duration, distance, or drills rather than by calorie burn. Planned calorie values should therefore be treated as estimates derived from the planned structure, while completed exercise entries can later use more accurate performed data.

### Preferred source order

1. device-imported estimates
2. activity-specific equations
3. Compendium MET lookups
4. manual user-entered calories

### Storage model

Each exercise entry should eventually store:

- `estimate_source`
- `estimate_confidence`
- `met_value`
- `gross_calories`
- `net_calories`
- optional structured inputs such as:
  - `speed_mph`
  - `grade_percent`
  - `watts`
  - `distance_miles`

### Net versus gross calories

Use:

- `gross_calories` for user-visible activity summaries when helpful
- `net_calories` for adjusting daily calorie allowance and dashboard calculations

This keeps resting expenditure from being counted twice.

For planned workouts, the database should also preserve workout structure so warmup, main work, and cooldown can be modeled separately:

- session
- ordered blocks
- ordered segments

See [PLANNED_WORKOUT_STRUCTURE.md](/home/brianminer/workspace/svelte/docs/PLANNED_WORKOUT_STRUCTURE.md).

## Adaptive maintenance

Initial targets are only starting estimates.

After at least 2-4 weeks of reasonably complete intake and weight data, the app should begin estimating a personalized maintenance calorie level from:

- smoothed weight trend
- logged calorie intake
- adherence / data completeness

This should be a gradual correction layer, not a day-to-day moving target.

## Versioning and auditability

All generated nutrition targets should eventually include:

- `calculation_version`
- `target_source`
- `goal_type`
- `goal_pace`

Recommended `target_source` values:

- `system_default`
- `user_custom`
- `agent_adjusted`
- `admin_override`

## Recommended backend structure

Create dedicated calculation modules:

- `backend/app/services/calculations/energy.py`
- `backend/app/services/calculations/macros.py`
- `backend/app/services/calculations/exercise.py`
- `backend/app/services/calculations/types.py`

The existing onboarding logic in [backend/app/services/profile.py](/home/brianminer/workspace/svelte/backend/app/services/profile.py) should be refactored into these modules rather than expanded in place.

## Recommended schema evolution

### Profile-level defaults

The profile should eventually carry:

- `primary_goal_type`
- `goal_pace`
- `maintenance_calories_estimate`
- `maintenance_estimate_source`
- `protein_target_g`
- `fat_target_g`
- `carb_target_g`
- `fiber_target_g`

### Goal versions

The goals table should eventually include:

- `goal_type`
- `goal_pace`
- `calculation_version`
- `target_source`

### Exercise entries

Exercise entries should eventually include structured estimation metadata described above.

## Onboarding and profile UX requirements

Setup order (2026-11-14): **About you → Activity → Your goal → How fast? / Your focus → Diet → Nutrition style → Allergies → Review**. Activity comes before the goal because maintenance (BMR × activity factor) is needed to show honest numbers on the goal screens.

- Activity shows an energy card: BMR ("at rest") and maintenance ("with your activity").
- Your goal shows each goal's calorie target at its default pace.
- How fast? shows each pace's calories and approximate weekly change (daily change × 7 / 3,500 kcal per lb), plus an optional goal weight with an estimated date. Paces whose calculated target is below the recommended minimum are labelled, and choosing one opens a warning (see Recommended minimum below).
- Your focus (maintenance) shows each focus's calories and its protein or carb difference.
- All numbers come from `POST /api/profile/targets/preview`, which runs the same engine as onboarding and saves nothing, so previews always match the saved targets.
- Invalid goal/pace pairs (for example `lose` with `lean`) are rejected with `422`.
- When even maintenance is below the recommended minimum and the floor is on, every target is a small surplus. The preview sets `maintenance_below_minimum`, and How fast? says the pace will not lower weight instead of showing a loss rate.

### Workout calories (daily allowance)

- The saved target covers diet and everyday movement (the activity level). Workouts are logged separately and add to that day's allowance: allowance = target + share × the day's logged workout calories, rounded to the nearest 10 (`dailyAllowance` in `frontend/src/lib/daily-home.ts`). Logged workouts stay exact.
- The share is a profile preference, `workout_calories_share`: 100, 75 (default), 50, or 0 (off). It never changes the saved target.
- Why 75%: watch, machine, and formula estimates tend to run high, and a workout raises the day's total burn by less than the workout itself because people move less for the rest of the day (MacroFactor's example: 400 extra exercise kcal raise total expenditure by about 250–300). MacroFactor itself adds back nothing and instead adapts targets from logged intake and the weight trend; an adaptive expenditure estimate is a possible later step for Relish.
- Only logged (completed) workouts count; planned workouts do not.

### Workouts from other apps (workout calc w1)

Watches report a workout's **total** calories, which include the resting calories you would have burned anyway; each app estimates that part with its own BMR. Relish keeps three layers apart (migration 006):

1. **Original record**: the source's activity exactly as sent (`exercise_source_records.payload_json`), refreshed on each sync.
2. **Source numbers, shown as recorded**: `source_calories_total`, `source_bmr_calories`, distance, duration.
3. **Relish's interpretation**: `relish_resting_calories` = Relish BMR (Mifflin-St Jeor, unrounded, at the latest weigh-in on or before the workout's day, else the profile weight) × workout minutes / 1,440; `calories_burned` = max(0, source total − Relish resting). This is the number the daily allowance uses (× the workout share).

- Relish's numbers are frozen at import with `calc_version` (`w1:relish_bmr`), so later weigh-ins or profile edits never rewrite past days. Before setup is complete there is no Relish BMR: the source's own resting estimate is subtracted instead (`w1:source_bmr`), or nothing if the source has none (`w1:total`).
- One workout per source activity (`user_id, source, source_id` is unique); a sync never adds a copy and never overwrites the saved workout (so a user's own edit sticks). Deleting an imported workout in Relish is permanent: its source record stays as a marker and later syncs skip it.
- The diary day is the workout's local start date where it was recorded.
- Cross-source match: if the day already has a workout logged in Relish (by hand or by completing a planned workout) whose length is within max(10 min, 25%) of the import and that isn't linked to another source record, the import is linked to it instead of added. The user's entry keeps its numbers; the source record is still stored.
- Sync window: the first sync reads 30 days back; later syncs re-read 14 days before the last good sync (watches can upload late). A malformed activity is skipped, not fatal.
- Manual workouts are `source = 'manual'` with calories as entered (treated as active calories).

### Rounding (calculation_version v3)

- BMR, maintenance, and the daily calorie target are rounded to the nearest 10 kcal. Mifflin-St Jeor is typically within about ±10% for an individual, so single calories would be false precision.
- Rounding happens once in the engine (`round_calories` in `energy.py`): BMR and maintenance are rounded, then the target is built from the rounded maintenance and rounded again, so the numbers shown always add up. Every screen (setup preview, Home, Profile, saved goals) uses these values.
- Macro and fibre targets are whole grams. Carbs are the remainder and round down, so protein × 4 + carbs × 4 + fat × 9 never exceeds the calorie target (it can fall a few kcal short).
- Logged food and exercise are not rounded: they stay exact to the calorie, because rounding every entry would add up to real drift over a day.

### Recommended minimum (calculation_version v2)

- The recommended minimum is 1,200 kcal a day for women and 1,500 for men, the minimums most dietitians use without medical supervision (the same split MyFitnessPal and Lose It! use).
- It is a recommendation, not a limit. `user_profiles.calorie_floor` is `recommended` (default: targets stop at the minimum) or `off` (targets are the calculation as is), as in MacroFactor's opt-out calorie floor. There is no hard limit.
- The preview returns the honest calculation for every pace (`calorie_target`, `weekly_change_lbs`, macros), `below_recommended_minimum`, and the same pace with the floor applied (`floor_*`), plus `recommended_minimum_calories`.
- Setup: choosing a pace below the minimum (or pressing Next on one) opens a warning with the calculated number, the minimum for the user's sex, and the risks (nutrient shortfall, muscle loss, fatigue, rebound gain; under 800 kcal it adds that this is a very-low-calorie diet normally done with medical supervision). "Use the minimum" keeps the floor; "Opt out and keep" sets `calorie_floor` to `off`. Settings > Nutrition > Calorie floor changes it later (turning it off asks first) and recalculates targets.
- v1 silently raised every target to 1,200 for everyone; v2 replaced that.

- No pace and the goal's default pace are treated as equal when deciding whether a profile save changes targets, so profiles saved before paces were stored are not recalculated (and custom goals not replaced) on unrelated edits. A pace left over from a previous goal falls back to the default.

Signup and profile setup should support:

1. age, sex, height, and current weight
2. primary goal selection:
   - weight loss
   - maintenance
   - weight gain
3. activity baseline selection
4. optional target weight where appropriate (collected on How fast? for lose and gain)
5. generated initial targets:
   - calories
   - protein
   - carbs
   - fat
   - fiber
6. user editing of those generated defaults

## Agent-ready plan architecture

Future premium plan agents should not write directly into the main active-target tables without traceability.

Instead, add a recommendation layer such as:

- `plan_recommendations`

Suggested fields:

- `id`
- `user_id`
- `plan_type`
- `source_type`
- `source_agent`
- `version`
- `status`
- `payload_json`
- `rationale`
- `effective_start`
- `effective_end`

Recommended statuses:

- `draft`
- `proposed`
- `accepted`
- `superseded`
- `rejected`

Only accepted plans should update active targets.

## Premium and admin strategy

The long-term product split should be:

### Core

- onboarding
- onboarding should distinguish food-eligibility `dietary_pattern` from preference-oriented `nutrition_style`
- generated baseline targets
- manual target customization
- dashboard and logging

### Premium

- nutritionist agent
- physical therapist agent
- exercise coach agent
- adaptive weekly plan revisions
- multi-agent cross-domain recommendations

### Admin and developer access

Admin and developer access should bypass paywalls through backend role and feature-flag checks, not frontend-only conditions.

## Documentation and release discipline

Any implementation slice that changes nutrition calculations, macro defaults, exercise estimation, or plan-generation behavior must also update:

- [docs/ARCHITECTURE_ROADMAP.md](/home/brianminer/workspace/svelte/docs/ARCHITECTURE_ROADMAP.md)
- [CHANGELOG.md](/home/brianminer/workspace/svelte/CHANGELOG.md)
- relevant feature follow-up notes or TODO sections

If the behavior is user-visible or materially changes generated targets, the release-tag plan should also be reviewed before the next stable version is cut.

## Recommended implementation order

1. Add explicit `goal_type` selection to onboarding and profile flows.
2. Move calorie and macro calculations into dedicated backend calculation modules.
3. Replace the fixed `30/40/30` default with goal-based macro generation.
4. Split base maintenance from logged exercise adjustments.
5. Add structured exercise estimation metadata and service logic.
6. Add adaptive maintenance updates from intake plus weight trend.
7. Add plan recommendation persistence for future agents and premium features.
