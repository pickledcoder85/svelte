# Database Plan

## Initial plan

The database should support a single-user or low-user-count nutrition app cleanly while remaining extensible.

The first practical implementation uses SQLite by default for local development, with a migration file under `backend/app/db/migrations/` and a small repository helper layer.

Core responsibilities:

- persist user identity and settings
- store standardized food records
- persist food logs, meals, and recipes
- support auditability for USDA and AI-derived nutrition data
- enable weekly metrics aggregation

### Initial entities

- users
- sessions
- food_catalog
- daily_logs
- meal_templates
- meal_ingredients
- recipe_favorites
- recipe_assets

## Review of initial plan

The initial plan captures the main nouns but it is not normalized enough for safe evolution.

Main issues:

- `daily_logs` is too broad and should be split into log headers and entries
- ingestion provenance is missing
- recipe instructions and ingredients need stronger normalization
- goals and weight history need explicit tables for trend analytics

## Improved plan

### Recommended core tables

- `users`
- `user_profiles`
- `user_goals`
- `weight_entries`
- `auth_sessions`
- `food_items`
- `food_item_sources`
- `food_logs`
- `food_log_entries`
- `meal_templates`
- `meal_template_ingredients`
- `recipes`
- `recipe_steps`
- `recipe_ingredients`
- `recipe_assets`
- `saved_favorites`
- `ingestion_jobs`
- `ingestion_outputs`

### Key design decisions

#### Food normalization

- keep one `food_items` table for canonical food records
- store provenance and confidence in `food_item_sources`
- support multiple sources for the same canonical item when needed

#### Logging model

- `food_logs` holds the log header for a user and date
- `food_log_entries` holds foods or meals consumed in that log
- weekly metrics should be derived from persisted entries, not only cached snapshots

#### Meal model

- `meal_templates` stores reusable user-defined meals
- `meal_template_ingredients` stores ingredient composition with grams and source food ids
- derived totals can be cached but should remain reproducible from ingredients

#### Recipe model

- `recipes` stores recipe metadata and ownership
- `recipe_steps` stores ordered instructions
- `recipe_ingredients` stores amounts and food references
- `recipe_assets` stores uploaded text, image, or document references

#### Ingestion model

- `ingestion_jobs` tracks lifecycle, source type, and status
- `ingestion_outputs` stores extracted text, structured nutrition, confidence, and review state

#### Goals and analytics

- `user_goals` should be versioned over time, not overwritten in place
- `weight_entries` enables trend and adherence analytics

### Storage choice

Recommended progression:

- start with SQLite for local development and fast iteration
- move to PostgreSQL later only if multi-user growth or deployment demands it

SQLite is the cleaner default for this product right now because:

- local setup stays trivial
- the repository layer can still enforce constraints and migrations
- the schema can remain PostgreSQL-friendly if a future migration is needed

Migration files live in `backend/app/db/migrations/`.

## Implementation steps

### Step 1: foundational schema

- create users, profiles, goals, sessions
- create canonical food tables
- create meal and recipe core tables

### Step 2: logging and analytics

- create food logs and entries
- create weight entries
- derive weekly metrics queries

### Step 3: ingestion and provenance

- create ingestion job and output tables
- create source and confidence tracking for foods
- store correction and review metadata

### Step 4: performance and integrity

- add indexes for user/date lookups
- add uniqueness and foreign-key constraints
- add migration and seed strategy
- add archival rules only if real growth demands them

## Definition of done for database milestones

### Foundational schema done

- all core foreign keys exist
- naming is consistent across backend and database models
- migrations can recreate the schema from scratch

### Analytics schema done

- weekly metrics can be derived with stable queries
- goals and weight history preserve historical changes
- user-owned data can be scoped without ambiguity

### Ingestion schema done

- source provenance is queryable
- corrected outputs can be distinguished from raw extraction outputs
- ingestion records link cleanly to foods or recipes created from them
