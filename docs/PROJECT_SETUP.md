# Project Setup

This project assumes all local work happens after activating the dedicated conda environment.

## Required environment

1. `conda activate svelte`
2. Verify Python is from the conda environment.
3. Verify Node is available from the conda environment as well.
4. Run both Python and Node package installs from that activated shell.
4. Keep Python dependencies in `pyproject.toml`.
5. Use `DATABASE_URL=sqlite:///./nutrition_os.dev.db` for disposable local development unless you intentionally want a different database file.


Node: the frontend needs Node 20.19 or newer (`engines` in `frontend/package.json`, Expo SDK 54's minimum). The `svelte` conda environment provides Node 22 LTS (`conda install -n svelte -c conda-forge "nodejs=22"`, upgraded 2026-11-14 because Node 20 reached end of life). The system Node 18 fails Expo web builds with `configs.toReversed is not a function`; always work inside `conda activate svelte`.
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

Serving the web app:

- `npm run build:web` in `frontend/` writes the web build to `frontend/dist` (gitignored) with `EXPO_PUBLIC_API_BASE_URL=/api`, so the app calls the API on the origin that served it. The shell value wins over `frontend/.env`, so your LAN development address never ends up in a production build. Developer hints (Expo Go footer, "start the backend on port 8000") only appear in development builds.
- `frontend/public/` holds the installable-app files Expo copies into every web build: `index.html` (the page template with the manifest link and iOS home-screen tags), `manifest.json`, `icons/`, and `sw.js`. The service worker registers only in production web builds over HTTPS or on localhost, caches only the app shell and content-hashed files, and never caches `/api`. To regenerate icons, render the original mascot art onto a 512 px `#f4efe4` square with ImageMagick (see the commit that added them).
- Day keys ("today", log dates, plan dates) use the device's local calendar day (`frontend/src/lib/dates.ts`), never the UTC date, and "today" refreshes when the app returns to the foreground.
- In local mode the web app remembers the email-session token in `localStorage` and restores it on launch if the server still accepts it; owner sessions are never stored. Any 401 from a data request returns local sessions to sign-in, and owner sessions to the Tailscale check.
- Setting `WEB_DIST_DIR` to that folder makes FastAPI serve the app on the same origin as the API: files from the build, the app shell for any other non-`/api` path, and JSON 404s for unknown `/api` paths. `index.html`, `sw.js`, and the manifest are sent with `Cache-Control: no-cache`; content-hashed build files are cached for a year. API responses are sent with `Cache-Control: no-store`, and every response carries `nosniff`, `no-referrer`, and `DENY` framing headers.
- Deployment steps, systemd units (`deploy/`), and the server env file are in [DEPLOY.md](DEPLOY.md).

Data safety:

- SQLite runs in WAL mode with `synchronous=NORMAL` and a 5-second busy timeout. WAL creates `*.db-wal` and `*.db-shm` files next to the database; they are part of the database and are gitignored. Never copy a live database with `cp`.
- `BACKUP_DIR` makes the server snapshot the database before every startup (startup still runs schema repairs on the live file) and keep the newest `BACKUP_KEEP` snapshots (default 14). Production refuses to start without an absolute `BACKUP_DIR`.
- For nightly snapshots (for example from cron): `python -m backend.app.db.backup --database /var/lib/relish/relish.db --dest /var/lib/relish/backups --keep 14`. Snapshots use SQLite's online backup API, so they are consistent while the app is running.
- `GET /api/export` downloads all of the owner's data as one JSON file (`relish-export-YYYY-MM-DD.json`).
- All repository access holds one re-entrant lock around the shared connection; `tests/test_sqlite_durability.py` fails if new code uses the connection without it.

For the phone and browser camera-food flow:

- set `OPENAI_API_KEY` in the backend `.env` if you want real package and label extraction instead of the demo fallback. The demo fallback (fixed fake nutrition) only exists outside production; with `APP_ENV=production` and no key, scans return `503` instead of saving made-up foods
- scans accept JPEG, PNG, WEBP, or GIF up to about 6 MB (`VISION_MAX_IMAGE_BASE64_CHARS`); other formats, including HEIC straight from an iPhone, return `400` with a readable message
- run `scripts/dev-backend.sh` so Expo Go on your phone can reach the backend on the local network and so failures are captured in `tmp/backend.log`
- use `tail -f tmp/backend.log` if you want to watch backend scan failures live while testing from the phone

Run `python -m backend.app.db.bootstrap` any time you need to create the local SQLite database file or apply schema changes.

For repeatable local iteration:

- `python -m backend.app.db.bootstrap --reset` recreates the target SQLite file from migrations (and removes its `-wal`/`-shm` files).
- The schema is one baseline migration, `backend/app/db/migrations/001_baseline.sql`. Add changes as new numbered files (`002_<change>.sql`); the server applies them at startup, each in a transaction. A database created before the baseline (2026-11-14) is refused with a message telling you to reset it.
- The app is built by `create_app()` and started with `uvicorn backend.app.main:create_app --factory` (both launch scripts do this), so importing the backend never opens a database.
- `python -m backend.app.db.bootstrap --reset --seed-dev` recreates the target SQLite file and seeds a stable local development user, baseline logs, meal-plan data, and demo recipes.
- The seeded local development user email is `dev@example.com`.
- `scripts/dev-backend.sh` defaults `DATABASE_URL` to `sqlite:///./nutrition_os.dev.db` when you do not set it explicitly.
- `scripts/dev-backend.sh` always creates `tmp/backend.log`, and that log file should be the first place to inspect backend state during live app debugging.
