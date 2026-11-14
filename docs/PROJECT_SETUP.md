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
4. `scripts/dev-backend.sh`

Use `scripts/dev-backend.sh` as the default local backend runner. It:

- starts uvicorn on `0.0.0.0:8000`
- creates `tmp/` if it does not exist
- creates or refreshes `tmp/backend.log`
- mirrors backend stdout and stderr into `tmp/backend.log` for scan/debug review

When debugging live phone scans or session creation, check `tmp/backend.log` first.

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
- `VISION_MODEL` (default `gpt-6-luna`, the cheapest current OpenAI model with image input) and `VISION_REASONING_EFFORT` (default `none`)
- `AUTH_MODE`, `OWNER_EMAIL`, `DEV_AUTO_LOGIN` (sign-in, see below)

Sign-in:

- `APP_ENV` accepts only `development`, `test`, or `production`; any other value (for example `prod`) stops the server at startup.
- Local development defaults to `AUTH_MODE=local`, which keeps the email sign-up / sign-in screen and the bearer sessions used by the tests.
- To skip the sign-in screen locally, set `OWNER_EMAIL=<any email>` and `DEV_AUTO_LOGIN=true`. Requests without a valid session are treated as that owner, but only when they come from this machine (loopback). Phones and other devices on the Wi-Fi still see the sign-in screen.
- Production uses `APP_ENV=production`, `AUTH_MODE=tailscale`, and `OWNER_EMAIL=<your Tailscale login email>`, started with `scripts/prod-backend.sh` behind `tailscale serve`. The server trusts the `Tailscale-User-Login` header that Tailscale Serve adds, only on loopback connections, and only when it matches `OWNER_EMAIL`. Email sign-up returns `404`, and the app opens without a sign-in screen.
- `scripts/prod-backend.sh` runs uvicorn on `127.0.0.1` with one worker and `--no-proxy-headers`. That flag is required: uvicorn trusts `X-Forwarded-For` from loopback by default, and Tailscale Serve sets it to the phone's tailnet address, which would make the loopback check reject every owner request. Never widen `FORWARDED_ALLOW_IPS`.
- In Tailscale mode every write (`POST`, `PUT`, `PATCH`, `DELETE`) must carry `X-Relish-Request: 1` and must not be marked cross-site by the browser (`Sec-Fetch-Site`). The app's `apiFetch` adds the header. This stops other websites from making changes through the device's Tailscale identity.
- The server refuses to start with unsafe combinations: production without `AUTH_MODE=tailscale`, production with `DEV_AUTO_LOGIN=true`, or `AUTH_MODE=tailscale` / `DEV_AUTO_LOGIN=true` without `OWNER_EMAIL`.
- The backend reads `.env` from the repo root regardless of the working directory.
- The pytest `app` fixture uses fixed local test settings and ignores `.env`, so local auth flags do not change test results.

For the phone and browser camera-food flow:

- set `OPENAI_API_KEY` in the backend `.env` if you want real package and label extraction instead of the demo fallback. The demo fallback (fixed fake nutrition) only exists outside production; with `APP_ENV=production` and no key, scans return `503` instead of saving made-up foods
- scans accept JPEG, PNG, WEBP, or GIF up to about 6 MB (`VISION_MAX_IMAGE_BASE64_CHARS`); other formats, including HEIC straight from an iPhone, return `400` with a readable message
- run `scripts/dev-backend.sh` so Expo Go on your phone can reach the backend on the local network and so failures are captured in `tmp/backend.log`
- use `tail -f tmp/backend.log` if you want to watch backend scan failures live while testing from the phone

Run `python -m backend.app.db.bootstrap` any time you need to create the local SQLite database file or apply schema changes.

For repeatable local iteration:

- `python -m backend.app.db.bootstrap --reset` recreates the target SQLite file from migrations.
- `python -m backend.app.db.bootstrap --reset --seed-dev` recreates the target SQLite file and seeds a stable local development user, baseline logs, meal-plan data, and demo recipes.
- The seeded local development user email is `dev@example.com`.
- `scripts/dev-backend.sh` defaults `DATABASE_URL` to `sqlite:///./nutrition_os.dev.db` when you do not set it explicitly.
- `scripts/dev-backend.sh` always creates `tmp/backend.log`, and that log file should be the first place to inspect backend state during live app debugging.
