# Project Setup

This project assumes all local work happens after activating the dedicated conda environment.

## Required environment

1. `conda activate svelte`
2. Verify Python is from the conda environment.
3. Verify Node is available from the conda environment as well.
4. Run both Python and Node package installs from that activated shell.
4. Keep Python dependencies in `pyproject.toml`.
5. Use `DATABASE_URL=sqlite:///./nutrition_os.dev.db` for disposable local development unless you intentionally want a different database file.

## Backend setup

1. `conda activate svelte`
2. `pip install -e ".[dev]"`
3. `python -m backend.app.db.bootstrap --reset --seed-dev`
4. `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`

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
4. Get your computer's LAN IP with `hostname -I` or `ip addr`
5. Copy `.env.example` to `.env`
6. Set `EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000/api`
7. `npm start` for Expo Go / simulator preview on the same Wi-Fi
8. `npm start -- --tunnel` if the phone is not on the same Wi-Fi or Expo Go stalls on the bundle download
9. `npm run web` for browser preview

The frontend hot-reloads on source changes. Expo Go cannot use `localhost` for the backend because `localhost` points at the phone itself, not your computer.

For browser preview on the same machine, the default backend CORS configuration now allows the common local web origins used by Vite and Expo web, including `localhost:5173`, `localhost:8081`, and `localhost:19006`. If you use a different frontend origin, set `cors_origins` in the backend environment.

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

For repeatable local iteration:

- `python -m backend.app.db.bootstrap --reset` recreates the target SQLite file from migrations.
- `python -m backend.app.db.bootstrap --reset --seed-dev` recreates the target SQLite file and seeds a stable local development user.
- The seeded local development user email is `dev@example.com`.
- `scripts/dev-backend.sh` defaults `DATABASE_URL` to `sqlite:///./nutrition_os.dev.db` when you do not set it explicitly.
