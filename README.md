# Nutrition OS Starter

This repository is a greenfield nutrition app starter with a dedicated `frontend/` TypeScript app, a `backend/` Python FastAPI API, and hot-reloading local development.

## Product coverage

- Cross-platform web app architecture that can be packaged for iPhone with Capacitor.
- Weekly dashboard for calorie goals, calories consumed, macro targets, and adherence trends.
- USDA-backed nutrition search API route for standardized calorie and macro data.
- Session-aware auth scaffolding and environment-backed provider config.
- Meal builder utilities for ingredient weights, serving counts, and per-serving calorie/macro totals.
- Recipe favorites flow with support for direct text entry, uploaded documents, and step photos.
- Recipe scaling utilities for `1.25x`, `1.5x`, and `2.0x`.
- Multimodal ingestion endpoint for nutrition label photos.
- Health-check API route for quick local backend verification.

## Stack

- Frontend: TypeScript mobile-first app with hot reload.
- Backend: Python FastAPI application managed through the `svelte` conda environment.
- Database: SQLite by default for local development, with a checked-in migration file and repository helpers.
- Mobile packaging: Capacitor for iPhone deployment once the web app is stable.
- Auth: Supabase or another hosted auth provider.
- Nutrition source: USDA FoodData Central API.
- AI backend: multimodal model for nutrition-label extraction and OCR-based recipe ingestion.

## Development commands

Backend:

- `conda activate svelte`
- `pip install -e ".[dev]"`
- `python -m backend.app.db.bootstrap`
- `uvicorn backend.app.main:app --reload --port 8000`
- `pytest`

Frontend:

- `conda activate svelte`
- `cd frontend`
- `npm install`
- `npm run dev`
- `npm run check`
- `npm test`

The frontend and backend both support hot reload in local development.

## Database model to implement next

Core tables:

- `profiles`
- `sessions`
- `food_catalog`
- `daily_logs`
- `meal_templates`
- `meal_ingredients`
- `recipe_favorites`
- `recipe_assets`

Recommended relational notes:

- `food_catalog` stores USDA and label-scan foods with source metadata and confidence.
- `meal_templates` and `meal_ingredients` support reusable meals and computed serving nutrition.
- `recipe_favorites` stores normalized steps plus imported assets.
- `daily_logs` ties consumed foods and meals to authenticated users for weekly rollups.

## Local setup

1. `conda activate svelte`.
2. Install Python dependencies with `pip install -e ".[dev]"`.
3. Initialize the local database with `python -m backend.app.db.bootstrap`.
4. `cd frontend`.
5. Install frontend dependencies with `npm install`.
6. Return to the repo root.
7. Copy `.env.example` to `.env` and set API credentials.
8. Run the backend with `uvicorn backend.app.main:app --reload --port 8000`.
9. Run the frontend from `frontend/` with `npm run dev`.
10. Open the app in the browser and verify the backend at `http://localhost:8000/api/health`.
11. Add Capacitor once the web build is ready for iPhone packaging.

## Engineering guidance

- Process guidance lives in `AGENTS.md`, `SKILLS.md`, and `CONTRIBUTING.md`.
- Environment and startup guidance lives in `docs/PROJECT_SETUP.md`.
- Architecture planning lives in `docs/ARCHITECTURE_ROADMAP.md`, `docs/FRONTEND_PLAN.md`, `docs/BACKEND_PLAN.md`, and `docs/DATABASE_PLAN.md`.
- Release history and planned tagging live in `CHANGELOG.md`.
- Use feature branches and atomic commits once git is initialized locally.
- Add tests for business logic changes before merge.
- Treat mobile-first UX and Capacitor compatibility as baseline constraints, not later enhancements.

## Current limitations

- No package install was performed in this environment.
- The OpenAI vision integration is scaffolded and expects compatible API credentials.
- Persistence exists in the database layer, but routes are not yet wired through it.
- Auth persistence and production sign-in screens still need implementation.
