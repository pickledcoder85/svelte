# Changelog

All notable project changes should be recorded here.

The format should remain simple:

- date
- version or unreleased marker
- grouped changes

## [Unreleased]

### Planned

- Post-Phase-1 planning is now focused on calculation-engine refactoring, safer live input workflows, and premium agent-ready plan infrastructure.
- Explicit goal-type onboarding, calculation-engine refactor, and structured exercise-estimation work are planned and documented.

### Added

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

### Changed

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

### Planned tagging

- Current stable milestone tag already created: `v0.5.0`
- Next candidate stable tag: `v0.6.0`
- `v0.6.0` should cover explicit goal-type onboarding, calculation-module refactoring, and structured exercise-estimation groundwork.
