# Nutrition OS Starter

This repository is a greenfield nutrition app starter with an Expo / React Native frontend in `frontend/`, a Python FastAPI backend, and hot-reloading local development for browser and iPhone preview.

## Product coverage

- Cross-platform Expo / React Native architecture with browser preview and Expo Go support on iPhone.
- Weekly dashboard for calorie goals, calories consumed, macro targets, and adherence trends.
- USDA-backed nutrition search API route for standardized calorie and macro data.
- Session-aware auth scaffolding and environment-backed provider config.
- Meal builder utilities for ingredient weights, serving counts, and per-serving calorie/macro totals.
- Recipe favorites flow with support for direct text entry, uploaded documents, and step photos.
- Recipe scaling utilities for `1.25x`, `1.5x`, and `2.0x`.
- Multimodal ingestion endpoint for nutrition label photos.
- Health-check API route for quick local backend verification.

## Stack

- Frontend: Expo / React Native TypeScript app with web support and hot reload.
- Backend: Python FastAPI application managed through the `svelte` conda environment.
- Database: SQLite by default for local development, with a checked-in migration file and repository helpers.
- Mobile runtime: Expo Go during development, with native build/export options later.
- Auth: Supabase or another hosted auth provider.
- Nutrition source: USDA FoodData Central API.
- AI backend: multimodal model for nutrition-label extraction and OCR-based recipe ingestion.

## Development commands

Backend:

- `conda activate svelte`
- `pip install -e ".[dev]"`
- `python -m backend.app.db.bootstrap`
- `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`
- `pytest`

Frontend:

- `conda activate svelte`
- `cd frontend`
- `npm install`
- `npm start`
- `npm start -- --tunnel`
- `npm run web`
- `npm run check`
- `npm test`

The frontend and backend both support hot reload in local development. `npm start` opens the Expo dev server for phone and simulator preview, `npm start -- --tunnel` is the safer fallback when the phone cannot reach the local LAN, and `npm run web` opens the Expo web build in the browser.

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
8. Get your computer's LAN IP with `hostname -I` or `ip addr`.
9. In `frontend/`, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000/api`.
10. Run the backend with `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`.
11. For browser preview, run the frontend from `frontend/` with `npm run web`.
12. For iPhone preview on the same Wi-Fi, run `npm start` in `frontend/` and scan the QR code with Expo Go.
13. If the phone is not on the same Wi-Fi or Expo Go stalls on the bundle download, run `npm start -- --tunnel` instead.
14. Verify the backend at `http://localhost:8000/api/health`.

## Engineering guidance

- Process guidance lives in `AGENTS.md`, `SKILLS.md`, and `CONTRIBUTING.md`.
- Environment and startup guidance lives in `docs/PROJECT_SETUP.md`.
- Architecture planning lives in `docs/ARCHITECTURE_ROADMAP.md`, `docs/FRONTEND_PLAN.md`, `docs/BACKEND_PLAN.md`, and `docs/DATABASE_PLAN.md`.
- Release history and planned tagging live in `CHANGELOG.md`.
- Use feature branches and atomic commits once git is initialized locally.
- Add tests for business logic changes before merge.
- Treat mobile-first UX and Expo / React Native compatibility as baseline constraints, not later enhancements.

## Current limitations

- Expo SDK 54 is pinned because this environment now uses Node 20 and Expo Go support is required during development.
- The OpenAI vision integration is scaffolded and expects compatible API credentials.
- Persistence exists in the database layer, but routes are not yet wired through it.
- Auth persistence and production sign-in screens still need implementation.
