# Iteration Notes: 2026-03-29

This note is an archival record of the repo state that was reviewed before the dev DB workflow, tracker contract cleanup, and weight-entry/profile input work landed.

Most of the gaps listed below have since been addressed on `main`, but the note remains useful as a compact record of what was blocking safe DB-backed UI iteration at that point in time.

## Current state at that inspection point

Already implemented and backed by SQLite persistence:

- local auth session bootstrap through `POST /api/auth/session`
- onboarding save flow through `POST /api/profile/onboarding`
- profile update flow through `PUT /api/profile`
- goal creation and listing through `POST /api/profile/goals` and `GET /api/profile/goals`
- weight-entry listing through `GET /api/profile/weights`
- tracker exercise persistence through `POST /api/tracker/exercise`
- tracker meal-plan persistence through `POST /api/tracker/meal-plan`
- tracker meal-prep persistence through `POST /api/tracker/meal-prep`
- meal-template backend persistence through `/api/meals/templates`
- recipe create/read/update/favorite backend persistence through `/api/recipes`
- seeded default favorite foods for new users in the SQLite repository
- test isolation with per-test temporary SQLite database files in `tests/conftest.py`

## Gaps affecting local iteration at that time

### Dev database workflow

- The repo had migration/bootstrap support through `python -m backend.app.db.bootstrap`.
- The repo did not yet have a simple dev reset command for disposable local testing data.
- The repo did not yet have a dedicated seed command for recreating a known baseline user/profile/goals/logs state.
- The backend app entry point used `settings.database_path` in `backend/app/main.py`, while the DB helpers and setup docs described `DATABASE_URL`; these needed reconciliation so local DB selection was predictable.

### Frontend persistence wiring

- Onboarding, profile settings, goal creation, favorite foods, tracker exercise, meal-plan loading, meal-prep loading, and recipe browsing/favorites were already wired to live backend routes.
- Food-log wiring was out of sync: the frontend still called unauthenticated `/nutrition/food-logs/today...` endpoints, while the backend exposed authenticated `/api/nutrition/logs...` routes.
- Weight history was visible in the UI, but the frontend did not yet expose a weight-entry creation form or API helper for `POST /api/profile/weights`.
- Meal builder remained local-only preview in the UI even though backend meal-template persistence routes already existed.
- Recipe browsing/favorites were live, but recipe create/edit/import UI was still not implemented as a first-class frontend flow.
- Meal-plan "eaten" state was local UI state only and was not persisted.

## Recommended next slice from that point

Recommended order from that inspection pass:

1. Reconcile backend DB configuration so normal local development can intentionally target a disposable dev database file.
2. Add a lightweight reset/seed workflow for local development.
3. Fix frontend food-log route/auth wiring to use the current backend contract.
4. Add a minimal "create weight entry" frontend form wired to `POST /api/profile/weights`.
5. Add explicit live-vs-local-only indicators in the UI for sections that still relied on draft or preview behavior.
6. Delay broader auth expansion and major UI polish until the DB-backed input loop was reliable.

## Why this order was chosen

- The app already had enough persisted backend surface area to iterate on real inputs.
- The main blocker was not raw database capability; it was safe local workflow plus frontend/backend contract drift.
- Fixing the dev DB workflow first prevented local testing from filling a long-lived database with throwaway data.
- Fixing food-log auth and adding weight-entry create provided two small, repeatable, high-value persistence loops before tackling the larger meal-builder persistence slice.
