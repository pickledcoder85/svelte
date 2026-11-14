# Deployment Roadmap: private single-user iPhone PWA

Recorded 2026-11-14 from a full codebase audit (backend, frontend, and deployment research, with an adversarial review of the findings).

## Target

Relish runs as a private, single-user Progressive Web App installed on the owner's iPhone home screen. No App Store, no TestFlight, no 7-day sideload signing. Main jobs:

- scan barcodes, packaging, and nutrition labels to build a personal food bank
- track and persist daily calories and exercise

## Decisions

| Topic | Decision |
|---|---|
| Client | Expo web export, installed as an iOS home-screen PWA |
| Backend | FastAPI serves both `/api/*` and the built web app from one HTTPS origin (no CORS) |
| Database | SQLite file on the VM's persistent disk, WAL mode, single uvicorn worker |
| Hosting | Google Cloud Always Free `e2-micro` VM in a US region (`us-west1`, `us-central1`, or `us-east1`) |
| Network access | Tailscale only (`tailscale serve` for HTTPS on `*.ts.net`); no public ports |
| Login | Tailscale identity only (no password): the owner's Tailscale login must match `OWNER_EMAIL`; Supabase dropped. Optional Face ID passkey later |
| Vision model | OpenAI, cheapest current non-deprecated model with image input, set through `VISION_MODEL`: `gpt-6-luna` ($0.10 / $0.50 per 1M tokens) with reasoning effort `none`. `gpt-5-nano` and `gpt-5.4-nano` were rejected because OpenAI has deprecated them (shutdowns Dec 11, 2026 and Apr 1, 2027). Measured cost: about $0.0002 per label scan |
| Backups | Litestream or nightly `sqlite3 .backup` to a free R2/B2 bucket, plus a JSON export endpoint |
| Secrets | Root-only env file loaded by systemd (see below); GCP Secret Manager optional |
| Existing data | None of the local `.db` files hold real data, so the schema can be rebuilt from a clean baseline |
| Package pins | Approved: realign `expo-camera`, `expo-image-picker`, `expo-font` to SDK 54 inside `conda activate svelte` |

Decided 2026-11-14: keep OpenAI for label photos, using the lowest-cost multimodal model through a setting.

### Why not a home PC

A sleeping or powered-off PC makes the API unreachable. The PWA shell can still open from its cache, but nothing can load or save. A free always-on VM avoids that.

### SQLite on a server

SQLite stores the database as an ordinary file on disk, not in RAM. On a VM the boot disk persists across restarts. Container platforms without an attached volume (Render free, Fly or Railway without a volume) wipe the file on every redeploy. Never run two server processes against the same file, and never put it on a network filesystem.

### Secrets on the VM

- Keep secrets out of git and out of the image. `.env` is already gitignored.
- On the VM, store them in `/etc/relish/relish.env`, owned by root with mode `0600`, and load them with systemd `EnvironmentFile=`. The app runs as a dedicated non-root `relish` user that cannot read the file directly; systemd injects the values at start.
- Optional: GCP Secret Manager. Its free allowance covers 6 active secret versions and 10,000 access operations a month. A startup script uses the VM's service account to fetch secrets into the env file. This is useful if you want rotation and audit logs. For one user the env file is enough.
- Production must refuse to start when a required secret is missing, instead of silently falling back to demo behaviour.
- Set a hard monthly spending cap on any AI API key.
- Store the owner password as a hash (`hashlib.scrypt`, no new dependency) and never the plain text.

## Audit summary

The app works locally (backend 71/71 tests, frontend 78/78 after Phase 0.1 and 0.2), but it is not deployable yet:

1. Login has no password: the token is a hash of the email and never expires. Scan, recipe, and meal-template write endpoints need no login.
2. Demo meal plans and workouts are regenerated on read paths and can turn into real logs.
3. Profile timezone and units are reset to UTC and imperial on every profile load.
4. Without an OpenAI key, scans silently return fake nutrition that can be saved.
5. Live-mode failures in the app show demo data as if it were real.
6. "Today" is computed in UTC in 18 frontend places and several backend places.
7. The web build ignores `EXPO_PUBLIC_API_BASE_URL` (`frontend/src/lib/api.ts`), and the session token is held only in memory.
8. Camera capture is disabled on web (`frontend/src/components/IngestionReviewPanel.tsx`).
9. Two schemas exist: the live schema is created inline in `backend/app/repositories/sqlite.py`, while `backend/app/db/migrations` describes a different one.
10. No PWA manifest, icons, service worker, deploy files, or backups.

## Phases

Each slice is its own `feature/` or `fix/` branch from `main`, per AGENTS.md.

### Phase 0: stabilize

- [x] 0.1 Planned-workout delete and edit fixes, helpers moved to `frontend/src/lib/planned-workouts.ts` with tests.
- [x] 0.2 Stale test expectations (`relish-api`, two seeded exercise entries).
- [x] 0.3 Stop demo auto-generation on read paths (`services/profile.py`, `services/tracker.py`). Starter plans are now created only once, at onboarding. Deferred: an onboarding opt-in toggle for starter plans.
- [x] 0.4 Split `save_user_identity` into insert-if-missing (`ensure_user_identity`) and an explicit profile update used only by `PUT /profile`.
- [x] 0.5 Show mock data only in preview mode; show a real error state in live mode (`frontend/src/lib/live-fallback.ts`). Deferred to Phase 2.2: preview-mode actions (add exercise, toggle meal, favorite) still report success without saving, and the 401 handling that returns to sign-in.

### Phase 1: deploy-ready backend

- [x] 1.1 Single-owner auth (option B, decided 2026-11-14): Tailscale identity header checked against `OWNER_EMAIL` on loopback connections, no password; email sign-up only in local mode; auth required on every router except `/health` and `/auth`; expired local sessions rejected; unsafe auth settings fail at startup. Deferred: optional Face ID passkey (option C), and removing the local email-session code once tests no longer need it.
- [x] 1.2 Production settings: `APP_ENV` validation, repo-root `.env`, `/docs` `/redoc` `/openapi.json` off in production, absolute `DATABASE_URL` required in production, trimmed `/health`, vision returns `503` without a key in production (demo results only in development), image size and format validation, HTTP client closed per call, generic `502` messages, `VISION_MODEL` and `VISION_REASONING_EFFORT` settings, Supabase settings removed. Deferred: a shared long-lived HTTP client (not needed for one user).
- [x] 1.3 SQLite durability: WAL, `synchronous=NORMAL`, `busy_timeout`, every repository connection use under a re-entrant lock (with a static test), `*.db-wal`/`*.db-shm` in `.gitignore`, startup snapshot (`BACKUP_DIR`, required in production) plus a nightly backup CLI, and `GET /api/export`. Off-machine copies (Litestream or rclone to R2/B2) are part of Phase 3.
- [x] 1.4 FastAPI serves the web build (`WEB_DIST_DIR`) with SPA fallback, cache rules, and security headers; `npm run build:web`; systemd units, nightly backup timer, and server env template in `deploy/`; [DEPLOY.md](DEPLOY.md).
- [ ] 1.5 Clean schema baseline: the live schema becomes migration 001, migrations run at startup, legacy repair code and the stale migrations are removed (safe because no real data exists).

### Phase 2: installable PWA

- [ ] 2.1 SDK 54 package pins, `engines.node >= 20.19`, `build:web` script.
- [ ] 2.2 Relative `/api` base URL, persisted session, sign-in copy cleanup, `localDateKey()` replacing UTC "today".
- [ ] 2.3 Web camera capture via file input (`capture=environment`), downscaled to about 1600 px JPEG before upload.
- [ ] 2.4 Manifest, apple-touch-icon, square icons, iOS meta tags, `viewport-fit=cover` and safe areas, service worker (app shell only, never `/api`), compressed images.

The service worker belongs to the live app, not development. It caches the app shell so the home-screen app opens instantly and still opens with a weak signal, and it is the base for queued offline logging. It must never cache API responses.

### Phase 3: go live

- [ ] GCP e2-micro in a US region, Tailscale with no public ports, systemd, secrets env file, backups to R2/B2, one restore drill.
- [ ] iPhone: Tailscale app with on-demand VPN for the `ts.net` domain, then Safari, Share, Add to Home Screen, and sign in once inside the installed app.
- [ ] AI key spending cap.

### Phase 4: daily-use completeness

- [ ] Edit and delete food-log and exercise entries (with ownership checks).
- [ ] Manual custom-food create, edit, and delete.
- [ ] `GET /nutrition/logs?date=` instead of downloading every log.
- [ ] Server-side calorie calculation from food and grams.
- [ ] Normalize food units to per 100 g plus serving grams.

### Phase 5: scan pipeline

- [ ] Barcode first: local food bank, then Open Food Facts, then USDA branded foods by GTIN/UPC. Cache results with source and attribution.
- [ ] Self-hosted zxing WASM for barcode decoding on iOS Safari.
- [ ] AI label reading only when a barcode misses or for a photographed panel, always reviewed before saving.
- [ ] Free fallback: paste label text from iOS Live Text, parsed on the server.

### Phase 6: refactor

- [ ] Split `frontend/App.tsx` (about 7,800 lines) into screens and hooks, and `backend/app/repositories/sqlite.py` by domain.
- [ ] Remove dead code (`repositories/memory.py`, `repositories/nutrition.py`, unused components and API wrappers).
- [ ] Generate `frontend/src/types.ts` from the OpenAPI schema.

## Feature backlog

- "Pickle Jar" re-scan: scanning a food already in the bank logs it in one tap; recent and frequent foods shelf.
- Copy yesterday or repeat a meal.
- Optional exercise add-back to the daily calorie target.
- Exercise import without the App Store: an iOS Shortcuts automation posts Apple Health workouts and steps to a token-protected endpoint. Strava activities already sync to Apple Health, so this also covers Strava.
- Direct Strava sync (optional, see below).
- Gherkin's Brine Streak: a logging streak and mascot mood driven by real calorie balance.
- One-tap data export ("Jar Backup").

### Strava notes

- Strava's API supports a personal app in "Single Player Mode" (athlete capacity 1), authorized with OAuth. Rate limits are per app (currently listed as 400 requests per 15 minutes and 4,000 a day).
- The June 2026 API agreement reportedly requires a Strava subscription for personal API apps. Confirm in the agreement before building.
- Strava webhooks need a public HTTPS endpoint, which a Tailscale-only server does not have. Pull new activities when the app opens or on a timer instead, or expose only the webhook path publicly.
- The OAuth refresh token is a secret and goes in the secrets env file or the database, never in git.
