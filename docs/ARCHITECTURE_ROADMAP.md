# Architecture Roadmap

This document captures the implementation plan for the three core layers of the product:

- frontend
- backend
- database

It includes:

- the initial design plan
- a review of that plan
- improvements made after review
- concrete implementation steps
- calculation-strategy direction for nutrition and exercise planning
- release and tagging guidance

## Product direction

The project targets a personal-use nutrition and weight loss application with:

- mobile-first UX
- responsive web delivery
- Expo / React Native delivery for browser and iPhone preview
- a Python backend to keep the system simple
- a database model that can begin small and grow without major rewrites

## Architecture summary

- `frontend/`: TypeScript application for dashboard, meal builder, recipe management, auth flows, and mobile-ready interaction patterns
- `backend/`: Python FastAPI application for auth/session handling, nutrition APIs, USDA integration, recipe import, and multimodal ingestion orchestration
- database: relational store for users, foods, meals, recipes, logs, and ingestion metadata

Calculation and plan-generation strategy:

- [CALCULATION_STRATEGY.md](/home/brianminer/workspace/svelte/docs/CALCULATION_STRATEGY.md)

## Layer plans

- Frontend plan: [FRONTEND_PLAN.md](/home/brianminer/workspace/svelte/docs/FRONTEND_PLAN.md)
- Backend plan: [BACKEND_PLAN.md](/home/brianminer/workspace/svelte/docs/BACKEND_PLAN.md)
- Database plan: [DATABASE_PLAN.md](/home/brianminer/workspace/svelte/docs/DATABASE_PLAN.md)
- Phase 1 completion plan: [PHASE1_COMPLETION_PLAN.md](/home/brianminer/workspace/svelte/docs/PHASE1_COMPLETION_PLAN.md)

## Delivery phases

### Phase 0: foundation

- establish repository layout
- set up local dev workflows
- document architecture and git standards
- create initial backend and frontend skeletons

### Phase 1: usable single-user product

- implement auth/session flows
- ship dashboard with weekly metrics
- implement food search and meal builder
- persist favorites and recipe scaling
- add basic database migrations

Current status:

- implemented for dashboard, search, session-aware logging, profile/goals, onboarding, favorite-food persistence, meal-builder persistence, recipe persistence/scaling, weight progress, and backend persistence
- `v0.5.0` was already tagged for the validated Phase 1 milestone
- the next major architecture slice is target-calculation refactoring, explicit goal-type onboarding, and safer input-to-persistence iteration

### Phase 2: ingestion and automation

- add PDF/text/image recipe import
- add nutrition label extraction from camera images
- add background job handling for slower AI tasks
- improve ingestion review and correction flows

Current status:

- started, with ingestion queue and review-state persistence in place
- camera-food-bank groundwork is now in progress with package-scan, label-ingest, and save-reviewed-food route scaffolding
- still missing the full review UI, richer job lifecycle, browser upload/camera UX, and AI-assisted correction pipeline

### Phase 2.5: calculation engine and adaptive planning

- refactor onboarding calories and macros into dedicated calculation modules
- add explicit goal-type selection for:
  - weight loss
  - maintenance
  - weight gain
- replace the current fixed macro split with goal-based baseline macro targets
- separate non-exercise maintenance from logged exercise adjustments
- add exercise estimation metadata and source confidence
- prepare versioned plan recommendations for future premium coaching agents

Current status:

- started on the current dev workflow branch
- onboarding now uses dedicated energy and macro calculation helpers instead of inline fixed-ratio logic
- explicit goal labels are clearer in the frontend onboarding and profile experience
- full editable profile management is now underway, with live profile edits recalculating targets and appending new goal-history rows
- adaptive maintenance, fiber-target persistence, and structured exercise-estimation metadata are still pending

### Phase 3: mobile packaging and polish

- keep Expo runtime healthy on browser and iPhone
- validate camera/file flows on iPhone
- optimize touch navigation and forms
- prepare native build, signing, and release workflow

Current status:

- Expo browser and iPhone preview are working locally
- native packaging, signing, and release workflow are not started yet

## Recommended implementation order

1. Finalize foundational database schema and migrations.
2. Implement backend persistence and user-context boundaries.
3. Connect frontend dashboard and meal builder to persisted backend flows.
4. Add recipe persistence and scaling UX.
5. Refactor the nutrition and exercise calculation engine around explicit goal types and versioned targets.
6. Finish full editable profile management so calculation targets and food-ingestion flows have a stable user foundation.
7. Add ingestion review flows before fully automated save behavior.
8. Add camera-assisted food-bank creation with explicit review before save.
9. Package and validate with Expo-native build/export flow after core flows are stable.

## Review of initial plan

The initial high-level plan was directionally correct but too broad in two areas:

- it under-specified state, API, and error-boundary design on the frontend
- it did not define enough normalization and auditability for the database layer

It was also optimistic about integrating auth, USDA search, multimodal ingestion, and persistence all at once.

## Improvements after review

The improved plan now does the following:

- separates core user flows from advanced AI ingestion
- treats database schema design as a first-class layer, not a backend afterthought
- explicitly sequences implementation into low-risk, testable milestones
- keeps mobile packaging constraints visible from the beginning
- adds release guidance so major and minor feature increments can be tagged cleanly

## Release and tagging guidance

After stable major or minor feature increments, create both:

- an atomic commit or small set of atomic commits
- a version tag on the stable commit

Current stable milestone:

- `v0.5.0`: Phase 1 validated milestone already created and pushed

Historical early versioning sketch:

- `v0.1.0`: foundation scaffold and architecture alignment
- `v0.2.0`: weekly metrics, persisted food logging, ingestion review queue, and current Expo runtime baseline
- `v0.3.0`: reusable meals, first-class favorites persistence, and recipe scaling
- `v0.4.0`: USDA sync and food search refinement
- `v0.5.0`: Phase 1 validated milestone and core single-user app baseline
- `v0.6.0`: calculation engine refactor, explicit goal-type onboarding, and structured exercise estimation
- `v0.7.0`: ingestion and AI-assisted extraction expansion
- `v0.8.0`: native packaging and iPhone validation

Tag only after:

- backend tests pass
- frontend checks and tests pass
- docs reflect the shipped behavior
- the feature is usable end to end, not only partially scaffolded

For any calculation-engine or plan-generation release, also require:

- [docs/CALCULATION_STRATEGY.md](/home/brianminer/workspace/svelte/docs/CALCULATION_STRATEGY.md) to match the shipped logic
- changelog entries to call out formula or target-generation behavior changes
- versioned migration notes for any user-goal or profile-schema changes
