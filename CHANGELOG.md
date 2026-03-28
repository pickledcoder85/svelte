# Changelog

All notable project changes should be recorded here.

The format should remain simple:

- date
- version or unreleased marker
- grouped changes

## [Unreleased]

### Planned

- Dedicated Phase 1 completion plan covering auth hardening, favorite-food completion, meal-builder completion, recipe persistence/scaling completion, live-data cleanup, and release prep.

### Added

- Expo / React Native frontend with browser preview and Expo Go support on iPhone.
- Dashboard range controls, line chart, macro progress, and mobile-first layout refinements.
- Session-aware daily food log UI wired to persisted backend data.
- Session-backed food log API flows with end-to-end request-path tests.
- Ingestion review queue API for reading and transitioning review state.
- Ingestion review-state persistence in SQLite.
- User-aware weekly metrics persistence derived from stored logs and weights.
- Normalized SQLite persistence for users, goals, food logs, ingestion jobs, and ingestion review outputs.
- USDA integration boundary with fallback to local food data.
- Persisted daily food log integration in the Expo frontend.
- Favorites API routes for meal templates and recipes.
- Missing favorites service module wired into the backend route layer.
- Strict worker orchestration docs, including polling cadence and control-loop rules.

### Changed

- Frontend stack pivoted from Vite web scaffolding to Expo SDK 54 with web support.
- Local development now assumes Node 20 in the `svelte` conda environment for Expo compatibility.
- Backend startup docs now use `--host 0.0.0.0` to support phone access on the local network.
- Project guidance now treats Expo / React Native as the primary mobile path.
- Dashboard chart and meal scaling controls now match the current mobile UX direction more closely.

### Planned tagging

- Next candidate stable tag: `v0.2.0`
- Tag once first-class favorites persistence is integrated, roadmap/docs are reconciled, and the current feature set is validated end to end.
