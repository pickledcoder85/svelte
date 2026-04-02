# Camera Food Bank Plan

This document now captures the current `camera-food-bank-v1` implementation state and the recommended follow-up work.

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

## Current implementation status

The repo now includes the main `v1` camera-food flow end to end:

- `POST /api/vision/package` performs authenticated package-front analysis in [backend/app/routes/vision.py](/home/brianminer/workspace/svelte/backend/app/routes/vision.py).
- `POST /api/vision/label/ingest` persists label-scan outputs for review in [backend/app/routes/vision.py](/home/brianminer/workspace/svelte/backend/app/routes/vision.py).
- The vision service uses the configured OpenAI multimodal endpoint when `OPENAI_API_KEY` is present, with deterministic fallback responses for local development in [backend/app/services/vision.py](/home/brianminer/workspace/svelte/backend/app/services/vision.py).
- Ingestion review queue routes already exist in [backend/app/routes/ingestion.py](/home/brianminer/workspace/svelte/backend/app/routes/ingestion.py).
- Ingestion output models already support extracted text, structured JSON, confidence, and review state in [backend/app/models/ingestion.py](/home/brianminer/workspace/svelte/backend/app/models/ingestion.py).
- SQLite already persists `ingestion_jobs` and `ingestion_outputs` in [backend/app/repositories/sqlite.py](/home/brianminer/workspace/svelte/backend/app/repositories/sqlite.py).
- SQLite already persists foods in `food_catalog` via `save_food_item` in [backend/app/repositories/sqlite.py](/home/brianminer/workspace/svelte/backend/app/repositories/sqlite.py).
- The frontend already has ingestion review UI and ingestion API helpers in [frontend/src/components/IngestionReviewPanel.tsx](/home/brianminer/workspace/svelte/frontend/src/components/IngestionReviewPanel.tsx) and [frontend/src/lib/api.ts](/home/brianminer/workspace/svelte/frontend/src/lib/api.ts).

The `v1` UX now includes:

- a single camera session on device for package-first capture, optional label capture, review, and save
- grouped recent scans for revisiting prior outputs without a large pending queue
- summary-card review by default, with edit only when correction is needed
- multi-variant label detection with one saved food per variant
- USDA fallback when a package-only scan is saved without nutrition data

Current limitations:

- package scan candidate confidence values are still synthetic heuristics, not calibrated model scores
- duplicate detection and package-match ranking still need refinement
- the browser path is review-first, not a full fallback capture flow
- saved-food follow-up actions such as `Add to today's log` or `Favorite` are still minimal

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

The review screen should emphasize:

- one clear detected-result summary card by default
- variant cards when the label represents multiple flavors or rows
- edit-only-on-demand correction before save

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
- split persistence between a user-scoped foodbank and a curated global food catalog instead of treating `food_catalog` as one shared bucket

Recommended persistence rules:

- camera-ingested foods should save into the current user's foodbank first
- manual or custom food entry should remain user-scoped only and should not write directly into the global nutrition catalog
- USDA foods can remain global
- camera-ingested foods should only promote into the global catalog after later duplicate-detection, normalization, and confidence checks

## API direction

Implemented backend direction for `v1`:

- `POST /api/vision/package` now performs real analysis when the multimodal backend is configured
- `POST /api/vision/label/ingest` now performs real analysis when the multimodal backend is configured
- `POST /api/ingestion/outputs/{id}/save-food` persists either one saved food or a set of variant foods
- package-only reviewed saves can enrich nutrition from USDA before persistence

The architectural requirement is stable:

- package analysis
- label analysis
- review state
- save reviewed output into a real food item

## Frontend direction

Current `v1` screens and states:

1. camera entry action inside the ingestion flow
2. package-front capture screen
3. nutrition-label capture screen with `Skip Label`
4. detected-result review screen
5. save success state with recent scans and searchability

The browser version now acts primarily as a review and search surface for the same live session.

The device version is the primary capture experience.

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

1. Improve duplicate detection and package-match ranking so existing foods are reused more confidently.
2. Add richer post-save actions such as `Add to today's log` and `Favorite`.
3. Improve extraction normalization for messy multi-row or partially obscured labels.
4. Add optional source-asset storage only if debugging and auditability need it later.
5. Validate more real-world scans and tune prompts conservatively from observed misses.

## Roadmap relationship

This feature should be treated as the next major ingestion expansion after the current profile and calculation foundations are stable.

It directly supports:

- nutrition tracking quality
- food-bank growth
- meal prep and meal planning inputs
- later premium agent workflows that rely on better user food data
