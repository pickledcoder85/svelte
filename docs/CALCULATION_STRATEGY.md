# Calculation Strategy

This document defines the recommended business-logic direction for:

- onboarding calorie and macro targets
- maintenance-calorie estimation
- exercise calorie estimation
- adaptive target updates
- future agent-driven plan recommendations

It is intended to be the canonical design reference before the next calculation refactor lands in code.

Current implementation status on `fix/dev-db-workflow`:

- started
- onboarding calories now route through dedicated energy-calculation helpers
- onboarding macro defaults now route through dedicated macro-calculation helpers
- the app UI now labels the goal choices as `Weight Loss`, `Maintenance`, and `Weight Gain`
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

#### Weight gain

- protein: `1.6-2.0 g/kg`
- fat: roughly `25-35%` of calories
- carbs: remainder
- fiber: `14 g / 1000 kcal`

## Exercise calorie strategy

The app should support a structured exercise-estimation hierarchy.

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

Signup and profile setup should support:

1. age, sex, height, and current weight
2. primary goal selection:
   - weight loss
   - maintenance
   - weight gain
3. activity baseline selection
4. optional target weight where appropriate
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
