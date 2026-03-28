# Phase 1 Completion Plan

This document narrows the remaining work needed to move Phase 1 from "mostly implemented" to complete.

Phase 1 target:

- a usable single-user product
- real persisted user flows instead of demo fallback behavior
- end-to-end coverage for dashboard, logging, favorites, meals, and recipes
- stable local browser and iPhone development workflow

## Current assessment

Already in place:

- Expo / React Native frontend running in browser and on iPhone via Expo Go
- FastAPI backend with hot reload
- SQLite persistence with migrations for users, goals, weight history, food logs, ingestion state, and favorites support
- daily food logging and dashboard progress flows
- profile, goals, and weight-history APIs
- ingestion review queue and editable review support

Still blocking Phase 1 completion:

- auth/session flow is still lighter than the intended finished boundary
- first-run onboarding is missing for collecting baseline user stats and goal intent
- meal builder is not fully completed end to end with persistence-backed UX
- recipes are not fully complete as a persisted CRUD plus scaling flow
- favorite foods behavior is not fully finished as the primary search source
- some screens still rely on fallback or demo-shaped data paths
- roadmap and changelog are behind the actual shipped milestone state

## Exit criteria

Phase 1 is complete only when all of these are true:

- auth/session behavior is explicit, stable, and user-scoped across all user-owned resources
- first sign-in for a new profile routes the user through an initial setup workflow for baseline body stats and goal selection
- dashboard and tracker metrics come from persisted logs, goals, and weights without demo-only supplementation
- favorite foods are seeded, cached, searchable, and persisted
- meal builder supports ingredient editing, serving scaling, calculated totals, and saved meal persistence
- recipes support create/read/update, scaling, favoriting, and asset-backed review state at a single-user product level
- frontend handles loading, empty, saving, and error states for all core Phase 1 screens
- tests cover the new Phase 1 business logic and main API/screen flows
- docs and changelog reflect the implemented product state
- a stable Phase 1 milestone tag is created after validation

## Remaining implementation slices

### Slice 1: auth and session hardening

Goal:

- finish the single-user auth/session boundary so all profile, goals, logs, meals, recipes, and favorites are cleanly user-scoped

Implementation tasks:

- normalize session bootstrap and current-user loading in the backend
- add first-run onboarding state so newly created profiles complete setup before entering the main app
- collect baseline stats: sex, age, height, current weight, goal type, target weight, and activity level
- calculate BMR with a single backend-owned formula and derive TDEE and starting calorie target from it
- persist the onboarding-derived profile and initial goal version
- remove any remaining route assumptions that bypass explicit user context
- ensure frontend app bootstrap loads a consistent session/app-readiness state
- add frontend error handling for missing or invalid session state
- route newly created profiles with incomplete setup to the setup flow instead of the main app shell

Definition of done:

- all user-owned routes run through one current-user path
- first sign-in for a newly created profile shows a setup workflow before the main experience
- backend stores calculated BMR, estimated TDEE, and initial calorie target from user inputs
- frontend app readiness no longer depends on implicit fallback state
- API tests cover unauthorized and authorized behavior where relevant

Suggested branch:

- `feature/phase1-auth-session-hardening`

Recommended implementation details:

- use Mifflin-St Jeor for BMR calculation
- use an explicit activity multiplier to derive TDEE
- derive an initial calorie target from goal type:
  - `weight-loss`: subtract a moderate deficit from TDEE
  - `maintenance`: use estimated TDEE
  - `weight-gain`: add a moderate surplus to TDEE
- store the raw inputs and derived outputs so the user can review and update them later

### Slice 2: favorite foods completion

Goal:

- make favorite foods the primary food-search source for quick lookup, with USDA fallback only when needed

Implementation tasks:

- seed a default favorite-food list with common staples
- load favorite foods on app start
- cache favorites in session/app state for fast narrowing
- use fuzzy narrowing against favorites first
- trigger USDA search only when the local favorite set does not satisfy the search
- add `add to favorites` from remote search results
- persist favorite-food adds immediately and refresh the local cache
- show food-card quick actions for:
  - base unit or reference weight
  - quantity input
  - add-to-today action for the daily tracker
  - favorite toggle

Definition of done:

- food search starts from a sorted persisted favorite-food list
- default seeded foods appear for a new user without an external fetch
- USDA is only hit on a miss or explicit broader search
- add-to-favorites works end to end and is test-covered
- food search cards can add an item directly to today's tracker with quantity and unit context

Suggested branches:

- `feature/phase1-db-favorite-food-seed`
- `feature/phase1-backend-favorite-food-search`
- `feature/phase1-frontend-favorite-food-search`

### Slice 3: meal builder completion

Goal:

- finish the custom meal-builder flow as a real persisted feature

Implementation tasks:

- support editable ingredient rows with grams and source foods
- support serving-count changes and server-calculated totals
- persist saved meal templates
- support loading, editing, and reusing saved meals
- ensure scale controls default to `1.0x` and expose common increments cleanly on mobile
- replace recipe-scale dropdown controls with a slider using fixed stops at the allowed scale values

Definition of done:

- a user can create, save, reopen, and reuse a custom meal
- totals are derived reproducibly from ingredients
- backend and frontend tests cover calculations and save/update behavior
- recipe and meal scaling controls use touch-friendly fixed-stop interaction rather than a generic dropdown

Suggested branches:

- `feature/phase1-backend-meal-builder`
- `feature/phase1-frontend-meal-builder`

### Slice 4: recipe persistence and scaling completion

Goal:

- finish recipe management as a persistent core product feature

Implementation tasks:

- complete recipe create/read/update flows
- persist ingredients, steps, favorite state, and linked assets
- support recipe scaling in the main recipe detail flow
- keep imported recipe review output visible and editable before final save where applicable

Definition of done:

- users can create and edit recipes directly
- users can scale recipes and see updated quantities
- users can favorite and reopen recipes
- recipe detail is backed by persistence, not placeholder-only state

Suggested branches:

- `feature/phase1-backend-recipe-completion`
- `feature/phase1-frontend-recipe-completion`

### Slice 5: dashboard and tracker de-demo pass

Goal:

- remove remaining placeholder or fallback behavior from the Phase 1 core experience

Implementation tasks:

- route dashboard summary calculations fully through persisted APIs
- ensure tracker totals reflect saved food and exercise data paths
- remove temporary mock/fallback branches where persisted equivalents exist
- add empty-state and loading-state polish where live data replaces demo data

Definition of done:

- dashboard, tracker, goals, and weight progress behave consistently from live backend data
- no primary Phase 1 screen depends on demo-only business logic

Suggested branches:

- `feature/phase1-backend-live-summary-cleanup`
- `feature/phase1-frontend-live-summary-cleanup`

### Slice 6: Phase 1 validation and release prep

Goal:

- close the milestone cleanly and tag it

Implementation tasks:

- update roadmap status notes
- update `CHANGELOG.md`
- run backend tests and frontend checks/tests
- smoke-test browser and Expo Go flows
- create the Phase 1 milestone tag

Definition of done:

- docs match product state
- test suite passes
- Phase 1 tag is created on the validated commit

Suggested branch:

- `feature/phase1-release-prep`

## Recommended execution order

1. auth and session hardening
2. favorite foods completion
3. meal builder completion
4. recipe persistence and scaling completion
5. dashboard and tracker de-demo pass
6. Phase 1 validation and release prep

## Tagging guidance

Recommended next tag path:

- keep `v0.3.0` for reusable meals, favorite-food completion, and recipe scaling only if those are all truly shipped together
- if the work lands across multiple stable increments, prefer:
  - `v0.3.0`: auth hardening plus favorite-food completion
  - `v0.4.0`: meal builder and recipe persistence completion
  - `v0.5.0`: Phase 1 release-ready validation checkpoint

Do not tag until:

- relevant backend and frontend tests pass
- docs and changelog are updated
- the merged slice is usable end to end
