# Project Setup

This project assumes all local work happens after activating the dedicated conda environment.

## Required environment

1. `conda activate svelte`
2. Verify Python is from the conda environment.
3. Verify Node is available from the conda environment as well.
4. Run both Python and Node package installs from that activated shell.
4. Keep Python dependencies in `pyproject.toml`.
5. Use `DATABASE_URL=sqlite:///./nutrition_os.db` for local development unless you intentionally want a different database file.

## Backend setup

1. `conda activate svelte`
2. `pip install -e ".[dev]"`
3. `python -m backend.app.db.bootstrap`
4. `uvicorn backend.app.main:app --reload --port 8000`

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
4. `npm start` for Expo Go / simulator preview
5. `npm run web` for browser preview

The frontend hot-reloads on source changes. Expo Go requires `EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000/api` so the phone can reach the backend on your machine.

## Mobile-first constraint

- Build layouts and flows as phone-first screens.
- Keep browser APIs and plugin choices compatible with Expo / React Native web support.
- Avoid desktop-only interaction patterns that would force major mobile refactors later.

## Environment variables

Create `.env` from `.env.example` and define:

- `USDA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Run `python -m backend.app.db.bootstrap` any time you need to create the local SQLite database file or apply schema changes.
