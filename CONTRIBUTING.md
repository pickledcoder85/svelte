# Contributing

## Workflow

1. Initialize or sync git locally.
2. Create a fresh feature branch before starting work.
3. Implement one logical change set at a time.
4. Add or update tests.
5. Run `pytest` from the repo root and `npm run check` plus `npm test` from `frontend/`.
6. Commit atomically with an imperative message.
7. Merge back to `main` only after review.

## Local standards

- Keep environment variables in `.env`, never in committed source files.
- Prefer shared utilities for nutrition calculations and recipe scaling.
- Keep FastAPI route handlers small and delegate business logic to Python service modules.
- Keep frontend API calls and presentation components separated inside `frontend/src/`.
