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
- [x] 1.5 One schema baseline (`001_baseline.sql`, generated from the live schema), startup migration runner with per-migration transactions that refuses pre-baseline databases, legacy repair code and stale migrations removed, unused repositories removed, uvicorn factory mode.

### Phase 2: installable PWA

- [x] 2.1 SDK 54 pins for `expo-camera`, `expo-image-picker`, `expo-font`; `engines.node >= 20.19`; `build:web` (added in 1.4). Then Node 22 LTS in the conda env and `expo install --fix` for `expo`, `react-native`, `react-native-svg`, `@types/react` (no mismatches left). Deferred: review the 29 `npm audit` findings for anything that ships in the web bundle, after go-live.
- [x] 2.2 Relative `/api` base URL baked into `build:web`, remembered local sessions, 401 handling, local-date `localDateKey()` replacing every UTC day key, developer copy hidden in production builds. Deferred: logging food to the date selected on Home (it still logs to today).
- [x] 2.3 Web camera capture via a file input with `capture="environment"` (`frontend/src/lib/web-photo.ts`), downscaled to 1600 px JPEG at 0.75 before upload. To verify on the iPhone in Phase 3: the camera sheet opens from the installed app, cancel leaves the screen usable, and a 48 MP photo prepares without running out of memory. Deferred: native (Expo Go) captures still upload full-size photos.
- [x] 2.4 PWA shell: images compressed to 512 px; `frontend/public/index.html` with manifest, apple-touch-icon, iOS standalone tags, and bottom safe-area padding (default status bar style, so no top inset is needed); square icons generated from the original mascot art; hand-written `public/sw.js` (no workbox) registered only in production builds over HTTPS, never caching `/api`. To verify on the iPhone in Phase 3: Add to Home Screen shows the Gherkin icon and opens full screen, and the app opens from cache with a weak signal. Deferred: an offline outbox for logging without a connection.

The service worker belongs to the live app, not development. It caches the app shell so the home-screen app opens instantly and still opens with a weak signal, and it is the base for queued offline logging. It must never cache API responses.

### Phase 3: go live

- [x] GCP e2-micro (us-central1), Tailscale with no public ports, systemd service and nightly backup timer, root-only secrets env file (2026-11-14).
- [x] One-command deploy (`scripts/deploy.sh`) with automatic rollback, and test-only CI on GitHub Actions.
- [x] Off-machine backups to a private Google Cloud Storage bucket (free tier, VM service account, no key files), and a restore drill from the bucket (2026-11-14: integrity ok, row counts match).
- [ ] iPhone: Tailscale app with on-demand VPN for the `ts.net` domain, then Safari, Share, Add to Home Screen, and sign in once inside the installed app.
- [ ] AI key spending cap.

### Phase 4: daily-use completeness

- [x] Edit and delete food-log and exercise entries (ownership checks, meal-plan slot un-ticking, plan re-opening; exercise made by a plan is edited through the plan).
- [ ] Manual custom-food create, edit, and delete.
- [ ] `GET /nutrition/logs?date=` instead of downloading every log.
- [x] Server-side calorie calculation from food and servings or grams (`POST /api/nutrition/log-food`); the older entry route still trusts the app's numbers until the Food screen moves over.
- [ ] Show weights and heights in the profile's units everywhere (Profile editor, weight history, progress), not just during setup.
- [x] Store each food's label serving plus the weight of one serving (and portions), so foods work by weight (food foundation, migration 005).

### Phase 5: scan pipeline

- [x] Barcode first: local food bank, then Open Food Facts, then USDA branded foods by GTIN/UPC. Cache results with source and attribution. (5.1, `POST /api/nutrition/barcode-lookups`.)
- [x] 5.2 Live barcode scanner in the web app (`barcode-detector@3.2.3`; the SDK 54 `expo-camera` web scanner only reads QR codes) with the zxing WASM file self-hosted, two matching reads before lookup, and "Take photo instead".
- [ ] 5.3 Label auto-capture: take the photo when the frame is sharp and still.
- [ ] 5.4 Tune both on the iPhone.
- [x] Show the Open Food Facts attribution on barcode results in the review screen.
- [ ] Known cost of the live scanner: iOS asks for camera permission again on each launch of a home-screen app (getUserMedia). If that gets annoying, consider remembering the choice to start with "Take photo".
- [ ] AI label reading only when a barcode misses or for a photographed panel, always reviewed before saving.
- [ ] Free fallback: paste label text from iOS Live Text, parsed on the server.

### Phase 6: refactor

- [ ] Split `frontend/App.tsx` (about 7,800 lines) into screens and hooks, and `backend/app/repositories/sqlite.py` by domain.
- [ ] Remove dead code (unused frontend components and API wrappers; the unused backend repositories went in 1.5).
- [ ] Generate `frontend/src/types.ts` from the OpenAPI schema.

## Feature backlog

- Cheapest-first scanning (with the Scan redesign): 1) a barcode in frame is decoded on the phone and matched bank → Open Food Facts → USDA, no AI; 2) without a barcode, a low-detail "what is this?" vision call (name and brand only) is matched against the user's bank by name; 3) only a new food gets the full label or nutrition read (or USDA for whole foods); 4) identical images are cached for retries. The result sheet shows "✓ In your food bank" with Add to today as the main action for known foods, or Save to bank and Add to today for new ones.
- Guided walkthrough after setup: highlight the real buttons one at a time and walk through the key features (scan a food, add food to today's diary, add a workout, create a meal plan, create a recipe), skippable and replayable from Settings.
- Nutrition style shapes the macro split (like the Maintain focuses): for example High protein raises protein, Low carb and Keto lower carbs within their ranges.
- Adaptive food list: rank the food bank by how often and how recently each food is logged, so usual foods sit at the top when adding food. The count is already tracked silently (`user_food_bank.use_count`, migration 005); ranking ships with the new Food screen.
- Pickle avatars: a finite set of Gherkin-style pickle characters that represent the user, picked from sex, age, build, and activity level (for example a chubby coder pickle hunched over a laptop for Sedentary, a fit runner pickle for an active woman, a grey-whiskered pickle for an older user). Rough matrix: 2 sexes × 3 age bands × 3 builds as base characters, with activity shown by pose or props, so about 18 base images plus pose variants rather than every combination. Art must match Gherkin's style (transparent PNGs like assets/mascot.png, consistent outline and shading, and they need the dark-mode outline). Needs: the art set (from the owner), a pure tested mapping from profile to avatar, use in the header avatar, welcome, and Profile, and the avatar updating as weight and activity change (a nice progress moment). Keep the tone affectionate, never mocking.
- Gherkin is the coach and nutritionist: every AI feature speaks as Gherkin. Delivery: a notification in Gherkin's voice ("Protein's a bit low this week, want ideas?"), which opens a small popup with his face and a speech bubble, a short message, one or two suggestion buttons, and a follow-up question box.
- AI ingredient suggestions ("What should I eat?"): reads what's left today (calories and each macro), diet, style, allergies, and the food bank; the user lists ingredients or photographs the fridge or pantry (same reading as the plate scan); Gherkin suggests one or two combinations with gram portions that fit the remaining target (e.g. 170 g chicken + 150 g rice + 80 g spinach = 520 kcal · P 48 C 50 F 9), with Log it or Add to dinner plan. The AI only picks combinations; Relish's engine and USDA data compute the portions and numbers. Entry points: Today's Meals ＋ ("Suggest something") and a Gherkin nudge near the limit.
- Lazy Plan (Plan → Meals → "Plan my week for me"): a few taps: how much time (almost none · a little · I like cooking), how much variety (repeat simple meals · some variety · mix it up), pick proteins, carbs, and veg from simple chips (fish, chicken, beef, pork, eggs, tofu; rice, potatoes, pasta, bread; broccoli, asparagus, squash, onions), and which meals. Gherkin builds the week: for little time and repeats, one or two sheet-pan or one-pot recipes cooked once and portioned to the daily targets; fills the prep checklist ("Sunday: roast 1.2 kg chicken thighs + 4 trays veg; portion into 8 boxes") and a shopping list in grams. The user accepts it into Plan → Meals; ✓ Ate it on Today logs each portion exactly. Needs the week planner and the food bank first.
- AI coach, toggled on or off in Settings: checks in periodically. Flags possible under-fuelling when the 7-day trend of logged intake sits near or below the recommended minimum (if the user hasn't opted out) or well under the allowance given logged activity, and the reverse when intake trends above the goal. Uses the daily allowance (`dailyAllowance`) and the workout calorie sources.
- Profile editor calorie floor: changing goal or pace in the Profile editor recalculates with the saved floor but does not show the below-the-minimum warning that setup shows; reuse the setup warning there (fetch a preview first).
- Workout allowance beyond Today: the Home 1W/1M chart target lines, the net-calories metric (`trackerTotals.netCalories`, which still subtracts 100% of workouts), and the backend weekly adherence score still use the base target. Apply `dailyAllowance` per day there so every view agrees.
- Workout logging, release 2: a quick log form (activity chips Walk, Run, Bike, Swim, Lift, Other; duration on a wheel; effort Easy / Moderate / Hard; optional distance for walk, run, and bike) that estimates calories with MET values from the Compendium of Physical Activities, as (MET − 1) × kg × hours so the baseline isn't counted twice, plus an optional "your watch says" override. Each workout stores whether its calories were estimated or from a device.
- Strava sync: import activities (with calories) through Strava's API, which most Apple Watch and Garmin users already sync to. Apple Health needs a native app and Garmin needs developer-programme approval, so Strava is the practical route for a web app.
- Adaptive expenditure: estimate real daily burn from logged intake and the weight trend (as MacroFactor does) and adjust targets over time.
- Camera permission prompt: Safari always names the site (relish.<tailnet>.ts.net) and a web page cannot change it. A native App Store version shows "Relish" Would Like to Access the Camera with its own purpose string (NSCameraUsageDescription). Until then: Safari aA → Website Settings → Camera → Allow.
- Auto-capture thresholds (`frontend/src/lib/frame-stability.ts`: motion, sharpness, contrast, steady frames) are first guesses; tune them from real use on the phone.
- Haptics for the wheel pickers: not possible in the web app on iOS 27 (the system blocks switch haptics triggered from code; tested 2026-11-15). A native App Store version would use Core Haptics (`UISelectionFeedbackGenerator`) for picker ticks.
- Dark mode follow-ups: check the iOS status bar in dark mode on the home-screen app (the `default` status-bar style may stay light); tune any screens that look off after use. Palette lives in `frontend/src/theme/palette.ts`.
- Setup weight wheel precision: whole lb/kg today; consider 0.5 kg steps for metric, or a decimal wheel set further apart.
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
