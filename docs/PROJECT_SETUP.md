# Project Setup

This project assumes all local work happens after activating the dedicated conda environment.

## Required environment

1. `conda activate svelte`
2. Verify Python is from the conda environment.
3. Run both Python and Node package installs from that activated shell.
4. Keep Python dependencies in `pyproject.toml`.

## Backend setup

1. `conda activate svelte`
2. `pip install -e ".[dev]"`
3. `uvicorn backend.app.main:app --reload --port 8000`

The backend serves:

- `GET /api/health`
- `GET /api/nutrition/weekly-metrics`
- `GET /api/nutrition/foods/search?q=...`
- `POST /api/nutrition/meals/calculate`
- `POST /api/recipes/import`
- `POST /api/vision/label`

## Frontend setup

1. `conda activate svelte`
2. `cd frontend`
3. `npm install`
4. `npm run dev`

The frontend hot-reloads on source changes.

## Mobile-first constraint

- Build layouts and flows as phone-first screens.
- Keep browser APIs and plugin choices compatible with later Capacitor packaging for iPhone.
- Avoid desktop-only interaction patterns that would force major mobile refactors later.

## Environment variables

Create `.env` from `.env.example` and define:

- `USDA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
