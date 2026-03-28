# Changelog

All notable project changes should be recorded here.

The format should remain simple:

- date
- version or unreleased marker
- grouped changes

## [Unreleased]

### Added

- Repository initialized with Python backend and TypeScript frontend split.
- Mobile-first architecture direction documented.
- Backend scaffold for health, nutrition, recipes, and vision routes.
- Frontend scaffold for dashboard and meal summary screens.
- Project workflow docs: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SKILLS.md`, and setup docs.
- Layer-specific planning docs for frontend, backend, and database.
- SQLite database layer with migration bootstrap and repository helpers.
- Database schema covering users, profiles, goals, food items, logs, meals, recipes, and ingestion jobs.
- Database tests for schema initialization and repository behavior.

### Changed

- Repo structure aligned to `frontend/` and `backend/`.
- Project guidance updated to require use of the `svelte` conda environment.
- Local database setup now uses `DATABASE_URL=sqlite:///./nutrition_os.db` by default.

### Planned tagging

- Tag the current foundation once dependency installation, runtime validation, and initial smoke tests are complete.
- Prefer semantic version tags after stable feature increments.
