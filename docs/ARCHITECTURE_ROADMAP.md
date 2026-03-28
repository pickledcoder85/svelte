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
- release and tagging guidance

## Product direction

The project targets a personal-use nutrition and weight loss application with:

- mobile-first UX
- responsive web delivery
- future Capacitor packaging for iPhone
- a Python backend to keep the system simple
- a database model that can begin small and grow without major rewrites

## Architecture summary

- `frontend/`: TypeScript application for dashboard, meal builder, recipe management, auth flows, and mobile-ready interaction patterns
- `backend/`: Python FastAPI application for auth/session handling, nutrition APIs, USDA integration, recipe import, and multimodal ingestion orchestration
- database: relational store for users, foods, meals, recipes, logs, and ingestion metadata

## Layer plans

- Frontend plan: [FRONTEND_PLAN.md](/home/brianminer/workspace/svelte/docs/FRONTEND_PLAN.md)
- Backend plan: [BACKEND_PLAN.md](/home/brianminer/workspace/svelte/docs/BACKEND_PLAN.md)
- Database plan: [DATABASE_PLAN.md](/home/brianminer/workspace/svelte/docs/DATABASE_PLAN.md)

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

### Phase 2: ingestion and automation

- add PDF/text/image recipe import
- add nutrition label extraction from camera images
- add background job handling for slower AI tasks
- improve ingestion review and correction flows

### Phase 3: mobile packaging and polish

- add Capacitor shell
- validate camera/file flows on iPhone
- optimize touch navigation and forms
- prepare build, signing, and release workflow

## Recommended implementation order

1. Finalize foundational database schema and migrations.
2. Implement backend persistence and user-context boundaries.
3. Connect frontend dashboard and meal builder to persisted backend flows.
4. Add recipe persistence and scaling UX.
5. Add ingestion review flows before fully automated save behavior.
6. Package and validate with Capacitor after core flows are stable.

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

Suggested early versioning approach:

- `v0.1.0`: foundation scaffold and architecture alignment
- `v0.2.0`: auth, weekly metrics, and persisted food logging
- `v0.3.0`: reusable meals, favorites, and recipe scaling
- `v0.4.0`: USDA sync and food search refinement
- `v0.5.0`: image/document ingestion and AI-assisted extraction
- `v0.6.0`: Capacitor packaging and iPhone validation

Tag only after:

- backend tests pass
- frontend checks and tests pass
- docs reflect the shipped behavior
- the feature is usable end to end, not only partially scaffolded
