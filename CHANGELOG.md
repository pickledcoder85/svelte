# Changelog

All notable project changes should be recorded here.

The format should remain simple:

- date
- version or unreleased marker
- grouped changes

## [Unreleased]

### Planned

- Post-Phase-1 planning is now focused on calculation-engine consolidation, adaptive-maintenance groundwork, and premium agent-ready plan infrastructure.
- Structured exercise-estimation, versioned target generation, and richer target-source persistence remain planned and documented.
- Camera-food persistence should move toward a user-scoped foodbank plus a curated global catalog, with manual entry staying user-only and camera ingestion promoting globally only after later quality checks.
- The `Home` calorie chart should later support draggable consumed meal points so a checked meal can be re-timestamped in 30-minute increments when the user logs it after the fact.

### Added

- Scanning works in the web app (the iPhone PWA target): "Photograph package front" and "Photograph nutrition label" open the iPhone camera through a file input (`capture="environment"`), then the photo is shrunk to at most 1600 px and re-encoded as JPEG (which also converts HEIC) before upload. Previously the web app refused to scan.
- Local-mode sessions are remembered across reloads on web and restored when still valid; a rejected session (401) returns to sign-in with "Your session expired", or re-runs the Tailscale check for owner sessions. The sign-in email is no longer prefilled, and developer hints are hidden in production builds.
- FastAPI serves the built web app on the API's origin when `WEB_DIST_DIR` is set: app-shell fallback for deep links, JSON 404s for unknown `/api` paths, `no-cache` for `index.html`/`sw.js`/manifest, year-long caching for content-hashed files, path-traversal protection, and `nosniff`/`no-referrer`/`DENY` headers on every response (`no-store` on API responses).
- `npm run build:web`, systemd units and a server env template in `deploy/`, and [docs/DEPLOY.md](docs/DEPLOY.md) with the Google Cloud + Tailscale deployment, update, backup, and restore steps.
- `GET /api/export` downloads all of the owner's data (profile, goals, weights, food logs, exercise, plans, favorites, food bank, recipes, meal templates, scans) as one JSON file.
- Database snapshots with retention: automatic before each startup when `BACKUP_DIR` is set (required in production), and `python -m backend.app.db.backup` for nightly runs.
- Label and package scans use the `VISION_MODEL` setting (default `gpt-6-luna`, OpenAI's cheapest current model with image input) with `VISION_REASONING_EFFORT` (default `none`). A real test scan of a synthetic label extracted every field correctly for about $0.0002.
- Scan uploads are validated before any model call: size limit (`VISION_MAX_IMAGE_BASE64_CHARS`), real base64, and JPEG/PNG/WEBP/GIF detected from the file bytes (HEIC and other formats get a readable `400`).
- Single-owner sign-in. With `AUTH_MODE=tailscale` (required when `APP_ENV=production`), the server identifies the owner from the Tailscale Serve `Tailscale-User-Login` header, only on loopback connections and only when it matches `OWNER_EMAIL`; the app opens straight to Home with no sign-in screen. Local development keeps email sessions and gains an opt-in `DEV_AUTO_LOGIN`. The server refuses to start with unsafe auth settings.
- `GET /api/health` now reports `auth_mode`.
- `scripts/prod-backend.sh` starts the production API on `127.0.0.1` with one worker and `--no-proxy-headers`, and refuses to run unless `APP_ENV=production` and `AUTH_MODE=tailscale`.
- Tailscale-mode writes require the `X-Relish-Request: 1` header (sent by the app's `apiFetch`) and are rejected when the browser marks them cross-site.
- `DELETE /api/tracker/planned-workout-sessions/{session_id}` plus app-side create, edit, and delete for structured planned workouts with optional warmup and cooldown blocks.
- `frontend/src/lib/planned-workouts.ts` now holds the planned-workout payload, mapping, and edit-draft helpers (moved out of `App.tsx`) with unit tests.
- [docs/DEPLOYMENT_ROADMAP.md](docs/DEPLOYMENT_ROADMAP.md) records the codebase audit and the phased plan to ship Relish as a private, single-user iPhone PWA.
- Forward-compatible planned-workout persistence structure with session, block, and segment tables so warmups, multiple activity sets, and cooldowns can be modeled without replacing the current flat planner all at once.
- Structured planned-workout backend routes for listing, creating, updating, and completing nested workout sessions while the frontend still uses the flat planner compatibility layer.
- First-run onboarding now seeds a default meal plan for today with `Breakfast`, `Snack`, `Lunch`, `Snack`, and `Dinner` slots sized to the generated daily calorie target.
- Local development seed data now includes reusable demo recipes with ingredients, steps, and favorite state so the Recipes surface has realistic content during manual testing.
- Local development seed data now also includes a swim workout example so the `Home` exercise section is not empty during live manual testing.
- Daily-home helper logic and tests for today-target, exercise, and meal-plan summaries so the new landing state stays deterministic.
- Documented the intended production entry funnel as `welcome -> auth -> verification -> setup -> daily home` so future landing/auth work stays aligned.
- Product branding direction is now `Relish`, with `Gherkin` reserved for the mascot and future assistant/agent identity.
- Guided first-time profile setup flow with step cards for body basics, goal selection, goal style, activity, dietary pattern, nutrition style, allergies, and review.
- Calculation-target provenance and fiber persistence for generated profile goals, including `calculation_version`, `target_source`, and `fiber_goal`.
- App-shell menu logout action for quickly clearing the local live session and returning to profile entry.
- App-shell navigation cleanup with a profile avatar entry point, compact primary navigation, and a hamburger menu for secondary screens.
- Camera-food-bank groundwork routes for authenticated package scans, label-scan ingestion outputs, and saving accepted ingestion outputs into `food_catalog`.
- Banking-style camera-food capture flow for live phone preview, package-first capture, optional label capture, and review/save in one session.
- Multi-variant nutrition-label handling so one accepted scan can save multiple flavor variants from a single box into the food databank.
- Full editable profile flow in the Expo app so live users can update body metrics, goal inputs, and target-generation inputs after onboarding.
- Canonical calculation strategy document for onboarding calories, macro targets, exercise estimation, adaptive maintenance, and future agent-driven planning.
- Local SQLite reset/seed workflow through `python -m backend.app.db.bootstrap --reset --seed-dev` for repeatable development data.
- First live profile weight-entry save flow in the Expo app, backed by `POST /profile/weights` and immediate progress refresh.
- Dedicated backend calculation helpers for onboarding energy and macro target generation.
- Cleaner dashboard landing layout with a compact app header, high-level metric strip, a single overview chart, and macro ring cards.
- Interactive dashboard header cards for `Net Calories`, `Protein`, `Carbs`, `Fat`, and `Fiber` that now drive the main chart state.
- Expo / React Native frontend with browser preview and Expo Go support on iPhone.
- Dashboard range controls, line chart, macro progress, and mobile-first layout refinements.
- Session-aware daily food log UI wired to persisted backend data.
- First-run onboarding and session-aware profile setup flows.
- Session-backed food log API flows with end-to-end request-path tests.
- Ingestion review queue API for reading and transitioning review state.
- Ingestion review-state persistence in SQLite.
- Persisted meal templates with ingredient rows, serving counts, and recalculated totals.
- Recipe create/read/update persistence with ordered steps, assets, ingredients, favorites, and scaling support.
- User-scoped saved favorites persistence for foods, meal templates, and recipes.
- User-aware weekly metrics persistence derived from stored logs and weights.
- Normalized SQLite persistence for users, goals, food logs, ingestion jobs, and ingestion review outputs.
- USDA integration boundary with fallback to local food data.
- Persisted daily food log integration in the Expo frontend.
- Favorites API routes for meal templates and recipes.
- Missing favorites service module wired into the backend route layer.
- Strict worker orchestration docs, including polling cadence and control-loop rules.

### Fixed

- Production web builds now call the API at `/api` on their own origin: the base URL is read as a literal `process.env.EXPO_PUBLIC_API_BASE_URL` (which Expo inlines) and `npm run build:web` sets it to `/api`. Previously builds always called `http://localhost:8000/api`.
- "Today" and every other day key now use the device's local date instead of the UTC date, so food, exercise, weights, goals, plans, and scan groups no longer jump to tomorrow in the evening in US time zones. "Today" refreshes when the app returns to the foreground.
- `expo-camera`, `expo-image-picker`, and `expo-font` are now the Expo SDK 54 versions (`~17.0.10`, `~17.0.11`, `~14.0.12`) instead of SDK 55 majors; `expo install` also registered the `expo-font` config plugin in `app.json`. `frontend/package.json` declares `node >= 20.19`.
- The seeded development user's profile and goals no longer fail to load with a 500: `dev_seed` wrote `target_source='generated_onboarding'`, which the profile model rejects; it now writes `system_default`.
- Live mode no longer swaps in demo data when the dashboard, profile progress, tracker, or daily food log fails to load. Those screens now show empty data with a "could not be loaded" error, and demo data appears only in preview mode.
- Saved profile timezone, units, and display name are no longer reset to `UTC`, `imperial`, and the session name by profile loads, sign-in, onboarding, food logs, exercise and planner writes, goals, or weights. Only `PUT /profile` changes them, and omitting `display_name` there keeps the saved name.
- Starter meal plans and workouts are now created only once, when onboarding completes. Listing planned workouts or meal plans, loading the profile, and saving the profile no longer regenerate demo plans for the next four days, so deleted starter workouts stay deleted and users who skip onboarding get no demo plans.
- Deleting a planned workout that came from the legacy flat planner (including auto-generated starter workouts) now removes the structured session too, instead of returning `204` while the workout stayed listed; repeat deletes return `404`.
- Editing a planned workout no longer adds the warmup and cooldown minutes into the main set on every save.
- Stale test expectations for the `relish-api` health service name and the two seeded dev exercise entries.

### Changed

- The `svelte` conda environment now uses Node 22 LTS (22.22.2) instead of the end-of-life Node 20. `npx expo install --fix` aligned the remaining SDK 54 packages (`expo` ~54.0.37, `react-native` 0.81.5, `react-native-svg` 15.12.1, `@types/react` ~19.1.10); `expo install --check` now reports no mismatches, and `npm audit` findings dropped from 36 to 29.
- One schema: the live schema is now the single baseline migration `001_baseline.sql`, applied automatically at startup with each migration in its own transaction. Removed the per-startup schema repair code (about 1,100 lines that rebuilt tables with foreign keys off), the twelve unused `001`-`011` migration files (including two numbered `006`), and the unused `repositories/memory.py` and `repositories/nutrition.py`. Databases from before the baseline are refused with a reset instruction; reset local ones with `python -m backend.app.db.bootstrap --reset`.
- The backend now starts with `uvicorn backend.app.main:create_app --factory`; importing `backend.app.main` no longer opens the database, so tests no longer touch a developer's local database.
- SQLite now uses WAL mode, `synchronous=NORMAL`, and a 5-second busy timeout. Every repository read now holds the connection lock (now re-entrant), fixing races a concurrency test reproduced; service code no longer queries the connection directly.
- `.gitignore` covers SQLite WAL, shared-memory, and journal files and a `backups/` folder.
- In production, scans without `OPENAI_API_KEY` return `503` instead of saving fixed demo nutrition; the demo fallback remains for development and tests. Scan failures return a generic `502` message, with details only in the server log. The OpenAI HTTP client is now closed after each call.
- Production turns off `/docs`, `/redoc`, and `/openapi.json`, requires an absolute `DATABASE_URL`, and `/api/health` no longer reports the database path.
- Removed the unused `SUPABASE_URL` and `SUPABASE_ANON_KEY` settings.
- `APP_ENV` now only accepts `development`, `test`, or `production`, and `.env` is read from the repo root regardless of the working directory. `DEV_AUTO_LOGIN` applies only to requests from the same machine.
- Every API route except `/api/health` and `/api/auth/session` now requires a session, including vision scans, recipes, meal templates, food search, weekly metrics, and meal calculation, which were previously open. Expired local sessions are rejected. Email sign-up and sign-in return `404` in Tailscale mode.
- Deleting a planned workout (structured or legacy) now keeps the linked performed exercise entry, so removing a plan never erases logged exercise history.
- The current flat planned-exercise tracker flow now mirrors into the new structured planned-workout tables as a compatibility layer for future mobile planner work.
- Planned workouts no longer ask the user to enter calories manually in Tracker; the UI now derives an estimated burn from workout type and duration.
- Planned workouts can now be edited or deleted from Tracker, and editing a completed plan also keeps its linked performed exercise entry in sync.
- Planned workouts can now be marked complete or undone, with completion creating or removing the linked performed exercise entry that drives actual burn tracking.
- The Tracker screen now includes a dedicated `Planned exercise` panel so users can create future workouts directly, separate from completed exercise logs.
- Planned exercise is now a first-class backend/database layer separate from completed exercise logs, and `Home` uses date-filtered planned sessions instead of performed tracker entries.
- `Home` now supports date-by-date browsing for planned exercise and meal-plan slices, the calorie chart includes a planned-calories guide, and live users get a rolling default meal-plan window instead of a one-day onboarding-only seed.
- Meal-plan `mark as eaten` actions now persist a linked backend food-log entry for that user/date, remove that entry when unchecked, and drive `Home` calorie and macro totals from saved food-log data instead of frontend-only meal-plan math.
- Meal-plan cards on `Home` and `Meal Plan` now support structured per-slot items so the UI can show ingredient rows with quantities, macro breakdowns, and calories instead of only a meal title and total calories.
- The `Home` surface now centers on a visual daily-plan flow with combined calories/macros summary, a target-versus-consumed calorie chart, full-width planned-exercise and meal-plan sections, and meal-plan check actions that update consumed calories in place.
- The primary `Dashboard` section is now a simpler `Home` screen centered on today’s calorie target, macro split, primary actions, exercise, and meal-plan progress instead of the previous chart-heavy overview.
- The browser/phone entry experience is moving toward a lightweight welcome-first screen with a clearer primary `get started` path and a secondary demo path instead of dev-heavy wording.
- Profile setup now supports goal pace, dietary pattern, nutrition style, and allergy notes, and calorie targets now respect loss/gain pace choices instead of one fixed adjustment.
- Generated onboarding and profile-recalculation targets now flow through a single structured calculation result instead of separate loose tuples in the profile service.
- The main app shell now keeps the dashboard more focused by moving secondary destinations and session-mode controls into the navigation menu instead of a large flat section bar.
- Frontend ingestion helpers now include the live package-scan, label-ingest, and multi-save API contracts used by the current camera-food UI.
- Camera-food scanning now uses a single on-device camera flow for package capture, optional label capture, and review-backed save, while the browser acts as review/search support for the same session.
- Package-only accepted scans without nutrition now try USDA lookup during save, and multi-variant label scans preserve a `variants` array through review and save.
- `scripts/dev-backend.sh` now creates `tmp/backend.log` automatically and mirrors backend stdout/stderr there for live phone-debugging and scan failure review.
- `PUT /profile` now updates onboarding-derived profile fields, recalculates energy and macro targets, and appends a fresh goal-history row instead of only saving display settings.
- Profile goal ordering is now deterministic for same-day recalculations so the latest generated target block stays first in the API and UI.
- Browser startup now begins with an explicit entry screen that lets the user either create a live local profile session or enter preview mode with dummy data.
- Backend development CORS defaults now allow common Expo web and local browser origins so the live browser profile flow can reach `localhost:8000`.
- Onboarding now generates goal-based baseline macros instead of the previous fixed `30/40/30` split.
- Onboarding maintenance calories now use conservative non-exercise activity multipliers so future logged exercise can be layered on without double counting.
- Onboarding and profile UI now surface clearer `Weight Loss`, `Maintenance`, and `Weight Gain` goal labels.
- Tracker food logging now uses the authenticated `/nutrition/logs` contract, creates today’s log when needed, and saves real entry nutrition instead of calling the old dead `/food-logs/today` path.
- Recipe favorites now use the required authenticated session path in the frontend.
- Food-log API responses now include display-ready saved entry metadata such as food name, brand, and source for tracker rendering.
- Backend runtime database selection now follows `DATABASE_URL`, matching the migration/bootstrap layer.
- `scripts/dev-backend.sh` now defaults to `sqlite:///./nutrition_os.dev.db` when no `DATABASE_URL` is set.
- Dashboard macro rings now display the percentage inside each ring and represent each macro's share of total macro calories, not progress against macro goals.
- The fiber header card now stays visible as a placeholder metric but shows `—` when no saved fiber data exists instead of repeating the goal value.
- The first screen now prioritizes intake, targets, and missing-input visibility instead of the previous mascot-heavy hero layout.
- Dashboard visualization now uses `react-native-svg` primitives for the overview chart and header rings.
- The previous duplicate macro section below the chart was removed so the header acts as the single metric control surface.
- Frontend stack pivoted from Vite web scaffolding to Expo SDK 54 with web support.
- Local development now assumes Node 20 in the `svelte` conda environment for Expo compatibility.
- Backend startup docs now use `--host 0.0.0.0` to support phone access on the local network.
- Project guidance now treats Expo / React Native as the primary mobile path.
- Dashboard chart and meal scaling controls now match the current mobile UX direction more closely.
- Phase 1 docs now reflect the current shipped milestone and release-prep boundary.

### Notes

- Dashboard follow-up recommendations are documented in [docs/DASHBOARD_FOLLOWUPS_2026-03-29.md](/home/brianminer/workspace/svelte/docs/DASHBOARD_FOLLOWUPS_2026-03-29.md).
- Calculation-engine and future premium agent-planning direction are documented in [docs/CALCULATION_STRATEGY.md](/home/brianminer/workspace/svelte/docs/CALCULATION_STRATEGY.md).
- Camera-food implementation sequencing is documented in [docs/CAMERA_FOOD_BANK_PLAN.md](/home/brianminer/workspace/svelte/docs/CAMERA_FOOD_BANK_PLAN.md).

### Planned tagging

- Current stable milestone tag already created: `v0.5.0`
- Next candidate stable tag: `v0.6.0`
- `v0.6.0` should cover calculation-engine consolidation, adaptive-maintenance groundwork, and structured exercise-estimation groundwork.
