# Camera Food Bank Plan

This document defines the recommended `camera-food-bank-v1` slice that should follow the current camera-ingestion groundwork.

The purpose of this slice is to let a user create reusable foods from package photos and nutrition-label scans, review the extracted data, save the result to the app database, and immediately use the saved food in logging and planning flows.

## Product goal

The camera flow should make it fast to build a personal food bank from real packaged foods.

The target user experience is:

1. Open `Add Food by Camera`.
2. Point the camera at the front of the package.
3. Try to identify the product and match it against existing foods.
4. If a confident match exists, show it with a clear success state and let the user use the existing food.
5. If no confident match exists, prompt the user to scan the nutrition label.
6. Extract serving and macro data from the label.
7. Show a review screen before saving anything.
8. Save the reviewed item into the food database.
9. Offer next actions such as:
   - add to today's log
   - save as favorite
   - use in meal prep or meal planning later

## Why this matters

This feature is the fastest path to improving the app's food data quality with real user data.

It supports:

- rapid food-bank growth for a real profile
- better food logging with less manual entry
- stronger meal prep and meal planning inputs
- a tighter loop between saved foods, nutrition totals, and target calculations

## Current reusable scaffolding

The repo already contains pieces that should be extended rather than replaced:

- `POST /api/vision/package` now exists for authenticated package-front scan scaffolding in [backend/app/routes/vision.py](/home/brianminer/workspace/svelte/backend/app/routes/vision.py).
- `POST /api/vision/label/ingest` now persists label-scan outputs for review in [backend/app/routes/vision.py](/home/brianminer/workspace/svelte/backend/app/routes/vision.py).
- The current vision service returns structured placeholder extraction shapes in [backend/app/services/vision.py](/home/brianminer/workspace/svelte/backend/app/services/vision.py).
- Ingestion review queue routes already exist in [backend/app/routes/ingestion.py](/home/brianminer/workspace/svelte/backend/app/routes/ingestion.py).
- Ingestion output models already support extracted text, structured JSON, confidence, and review state in [backend/app/models/ingestion.py](/home/brianminer/workspace/svelte/backend/app/models/ingestion.py).
- SQLite already persists `ingestion_jobs` and `ingestion_outputs` in [backend/app/repositories/sqlite.py](/home/brianminer/workspace/svelte/backend/app/repositories/sqlite.py).
- SQLite already persists foods in `food_catalog` via `save_food_item` in [backend/app/repositories/sqlite.py](/home/brianminer/workspace/svelte/backend/app/repositories/sqlite.py).
- The frontend already has ingestion review UI and ingestion API helpers in [frontend/src/components/IngestionReviewPanel.tsx](/home/brianminer/workspace/svelte/frontend/src/components/IngestionReviewPanel.tsx) and [frontend/src/lib/api.ts](/home/brianminer/workspace/svelte/frontend/src/lib/api.ts).

Important limitations:

- the current `vision` service is still a demo placeholder and does not yet call a real multimodal extraction client
- the current package scan candidate confidence values are synthetic
- there is no dedicated camera-first ingestion UX in the frontend yet

## Recommended v1 workflow

### Stage 1: package-front identification

The first capture should focus on the front of the product package.

Expected extraction goals:

- product name
- brand
- packaging cues
- optional barcode later

Expected outcome:

- high-confidence existing match
- medium-confidence candidate list
- or no useful match

If a high-confidence match exists:

- show the matched food
- show a clear success state
- let the user confirm `Use existing food`
- optionally favorite it or add it to today's log

If no confident match exists:

- guide the user to scan the nutrition label next

### Stage 2: nutrition-label extraction

The second capture should focus on the nutrition label.

For `v1`, extraction should target:

- serving size text
- calories
- protein
- carbs
- fat
- fiber if clearly visible

Optional later fields:

- servings per container
- sodium
- sugar
- ingredient list

### Stage 3: review before save

Do not auto-save camera-created foods.

Every low-confidence or newly created item should open a review screen where the user can edit:

- name
- brand
- serving size
- serving unit
- calories
- protein
- carbs
- fat
- fiber if supported

The review screen should also show:

- extraction confidence
- original extracted text
- source images later when asset storage exists

### Stage 4: persistence and next actions

After review, the app should save the food into the database and then offer:

- add to today's log
- save as favorite
- keep for future search and meal building

## Matching strategy

Use a conservative duplicate-detection flow before creating a new food.

Suggested `v1` matching order:

1. exact or near-exact normalized brand plus product name
2. fuzzy product-name match
3. serving-size similarity as a secondary signal
4. calories-per-serving similarity as a secondary signal

Decision thresholds:

- high confidence: show one likely match first
- medium confidence: show candidate list and allow selection
- low confidence: continue to nutrition-label scan and review

## Data model direction

The current database already contains:

- `food_catalog`
- `ingestion_jobs`
- `ingestion_outputs`

`camera-food-bank-v1` should extend those concepts rather than bypass them.

Recommended additions:

- richer `ingestion_jobs` source metadata for package-front versus label scans
- stronger linkage from accepted ingestion outputs to created food items
- optional source-asset references for original package and label images
- explicit provenance fields for foods created from camera ingestion

## API direction

Recommended backend additions for `v1`:

- upgrade `POST /api/vision/package` from placeholder extraction to real analysis
- upgrade `POST /api/vision/label/ingest` from placeholder extraction to real analysis
- consider explicit job registration only if the flow needs a richer lifecycle
- keep a stable route for saving a reviewed ingestion output into the food catalog

The architectural requirement is stable:

- package analysis
- label analysis
- review state
- save reviewed output into a real food item

## Frontend direction

Recommended `v1` screens:

1. camera entry screen
2. package-front capture screen
3. possible match results screen
4. nutrition-label capture screen
5. extracted nutrition review screen
6. save success screen with next actions

The browser version should support image upload as a fallback for development and testing.

The device version should use explicit camera capture flows once the Expo camera stack is wired.

## Guardrails

`camera-food-bank-v1` should follow these rules:

- never auto-save low-confidence extractions
- always show a review step before creating a new food
- keep raw extracted data for debugging and auditability
- prefer matching and reuse over creating duplicates
- treat package matching and label parsing as separate stages

## Out of scope for v1

Do not try to solve these immediately:

- full barcode-database integration
- fully automated save behavior with no review step
- micronutrient-complete label parsing
- premium coaching-agent decisions tied directly into ingestion
- perfect OCR before shipping the review flow

## Recommended implementation order

1. Finalize the current package-scan, label-ingest, and save-reviewed-food groundwork.
2. Add browser image-upload support for package and label ingestion.
3. Add package-front analysis and match-candidate UI flow.
4. Upgrade label extraction beyond the current demo placeholder.
5. Add reviewed-food save flow into the frontend.
6. Connect saved foods directly into food logging and favorites.
7. Validate the flow on device camera capture after the browser path works.

## Roadmap relationship

This feature should be treated as the next major ingestion expansion after the current profile and calculation foundations are stable.

It directly supports:

- nutrition tracking quality
- food-bank growth
- meal prep and meal planning inputs
- later premium agent workflows that rely on better user food data
