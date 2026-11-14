# Relish

Fitness & Nutrition, with Gherkin as the house mascot and assistant identity.

This repository is a greenfield nutrition app starter with an Expo / React Native frontend in `frontend/`, a Python FastAPI backend, and hot-reloading local development for browser and iPhone preview.

## Product coverage

- Cross-platform Expo / React Native architecture with browser preview and Expo Go support on iPhone.
- Weekly dashboard for calorie goals, calories consumed, macro targets, and adherence trends.
- Session-aware daily food logging with persisted totals and weekly metrics.
- Goal-based nutrition planning direction documented for future onboarding and profile target generation.
- USDA-backed nutrition search API route for standardized calorie and macro data.
- Session-aware auth scaffolding and environment-backed provider config.
- Persisted meal templates with ingredient rows, serving counts, and per-serving calorie/macro totals.
- Recipe create/read/update flows with persisted steps, assets, ingredients, favorites, and scaling utilities for `1.25x`, `1.5x`, and `2.0x`.
- Multimodal ingestion endpoints for package-front and nutrition-label analysis.
- Camera-food review/save flow that can persist single-label scans, USDA-backed package-only scans, and multi-variant label scans into the food databank from a live phone capture session.
- Health-check API route for quick local backend verification.

## Stack

- Frontend: Expo / React Native TypeScript app with web support and hot reload.
- Backend: Python FastAPI application managed through the `svelte` conda environment.
- Database: SQLite by default for local development, with a checked-in migration file and repository helpers.
- Mobile runtime: Expo Go during development, with native build/export options later.
- Auth: single owner. In production, Tailscale identifies the owner (`AUTH_MODE=tailscale`, `OWNER_EMAIL`); local development keeps email sessions or `DEV_AUTO_LOGIN`. See [docs/PROJECT_SETUP.md](docs/PROJECT_SETUP.md#environment-variables).
- Nutrition source: USDA FoodData Central API.
- AI backend: multimodal model for package-front and nutrition-label extraction, plus OCR-style recipe ingestion.

## Development commands

Backend:

- `conda activate svelte`
- `pip install -e ".[dev]"`
- `python -m backend.app.db.bootstrap --reset --seed-dev`
- `scripts/dev-backend.sh`
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

The frontend and backend both support hot reload in local development. `scripts/dev-backend.sh` starts the backend, binds it for LAN phone access, and mirrors stdout/stderr into `tmp/backend.log`. `npm start` opens the Expo dev server for phone and simulator preview, `npm start -- --tunnel` is the safer fallback when the phone cannot reach the local LAN, and `npm run web` opens the Expo web build in the browser.

## Database model in place

Core tables now in use:

- `saved_favorites`
- `recipe_assets`
- `meal_templates`
- `meal_template_ingredients`
- `recipes`
- `recipe_steps`
- `recipe_ingredients`
- richer `ingestion_outputs` metadata
- richer `weight_entries` history usage

Relational notes:

- `food_catalog` stores USDA and label-scan foods with source metadata and confidence.
- `meal_templates` and `meal_template_ingredients` support reusable meals and computed serving nutrition.
- `recipes` stays normalized through `recipe_steps`, `recipe_ingredients`, and `recipe_assets`.
- `saved_favorites` provides the user-scoped favorite state for foods, meals, and recipes.
- `food_logs` and `food_log_entries` tie consumed foods and meals to authenticated users for weekly rollups.

## Local setup

1. `conda activate svelte`.
2. Install Python dependencies with `pip install -e ".[dev]"`.
3. Initialize the local development database with `python -m backend.app.db.bootstrap --reset --seed-dev`.
4. `cd frontend`.
5. Install frontend dependencies with `npm install`.
6. Return to the repo root.
7. Copy `.env.example` to `.env` and set API credentials. New sign-in variables: `AUTH_MODE` (`local` for development, `tailscale` in production), `OWNER_EMAIL` (the single owner's Tailscale login), and `DEV_AUTO_LOGIN` (local only, skips the sign-in screen).
8. Get your computer's LAN IP with `hostname -I` or `ip addr`.
9. In `frontend/`, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000/api`.
10. Run the backend with `scripts/dev-backend.sh`.
11. For browser preview, run the frontend from `frontend/` with `npm run web`.
12. For iPhone preview on the same Wi-Fi, run `npm start` in `frontend/` and scan the QR code with Expo Go.
13. If the phone is not on the same Wi-Fi or Expo Go stalls on the bundle download, run `npm start -- --tunnel` instead.
14. For live phone debugging, review `tmp/backend.log` first. The backend runner creates it automatically if missing.
14. Verify the backend at `http://localhost:8000/api/health`.

For disposable local testing data, set `DATABASE_URL=sqlite:///./nutrition_os.dev.db` and use `python -m backend.app.db.bootstrap --reset --seed-dev` whenever you want a clean baseline.

## Engineering guidance

- Process guidance lives in `AGENTS.md`, `SKILLS.md`, and `CONTRIBUTING.md`.
- Environment and startup guidance lives in `docs/PROJECT_SETUP.md`.
- Deployment (Google Cloud VM, Tailscale, systemd, backups) lives in `docs/DEPLOY.md`.
- Architecture planning lives in `docs/ARCHITECTURE_ROADMAP.md`, `docs/FRONTEND_PLAN.md`, `docs/BACKEND_PLAN.md`, and `docs/DATABASE_PLAN.md`.
- Release history and planned tagging live in `CHANGELOG.md`.
- Nutrition and exercise target-generation strategy lives in [docs/CALCULATION_STRATEGY.md](/home/brianminer/workspace/svelte/docs/CALCULATION_STRATEGY.md).
- Use feature branches and atomic commits once git is initialized locally.
- Add tests for business logic changes before merge.
- Treat mobile-first UX and Expo / React Native compatibility as baseline constraints, not later enhancements.

## Current limitations

- Expo SDK 54 is pinned because this environment now uses Node 20 and Expo Go support is required during development.
- Camera-food scanning uses the configured `OPENAI_API_KEY` for package-front and nutrition-label extraction when available, with deterministic fallback responses when it is not configured.
- Recipe import review UX and native packaging/signing workflows remain beyond the Phase 1 milestone.
