-- Relish schema baseline (Phase 1.5, 2026-11-14).
--
-- Generated from a fresh database created by the pre-baseline SQLiteRepository, so it
-- matches the schema the app actually used, including every in-code repair. The 001-011
-- migration files it replaces described a different, unused schema.
--
-- Add schema changes as new numbered files (002_<change>.sql, ...). They run automatically
-- at startup, each in its own transaction, and are recorded in schema_migrations.

-- table auth_sessions
CREATE TABLE auth_sessions (
                    access_token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    display_name TEXT,
                    expires_at TEXT NOT NULL,
                    provider TEXT NOT NULL
                );

-- table users
CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

-- table user_profiles
CREATE TABLE user_profiles (
                    user_id TEXT PRIMARY KEY,
                    display_name TEXT,
                    timezone TEXT NOT NULL DEFAULT 'UTC',
                    units TEXT NOT NULL DEFAULT 'imperial',
                    setup_completed_at TEXT,
                    sex TEXT,
                    age_years INTEGER,
                    height_cm REAL,
                    current_weight_lbs REAL,
                    goal_type TEXT,
                    target_weight_lbs REAL,
                    activity_level TEXT,
                    bmr_calories INTEGER,
                    tdee_calories INTEGER,
                    initial_calorie_target INTEGER,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, goal_pace TEXT, dietary_pattern TEXT, nutrition_style TEXT, allergy_notes TEXT, protein_target_g REAL, carbs_target_g REAL, fat_target_g REAL, fiber_target_g REAL, calculation_version TEXT, target_source TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table user_goals
CREATE TABLE user_goals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    effective_at TEXT NOT NULL,
                    calorie_goal INTEGER NOT NULL,
                    protein_goal REAL NOT NULL,
                    carbs_goal REAL NOT NULL,
                    fat_goal REAL NOT NULL,
                    target_weight_lbs REAL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, fiber_goal REAL, goal_type TEXT, goal_pace TEXT, calculation_version TEXT, target_source TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table weight_entries
CREATE TABLE weight_entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    weight_lbs REAL NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table weekly_metrics
CREATE TABLE weekly_metrics (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    calorie_goal INTEGER NOT NULL,
                    calories_consumed INTEGER NOT NULL,
                    protein_target REAL NOT NULL,
                    carbs_target REAL NOT NULL,
                    fat_target REAL NOT NULL,
                    protein_consumed REAL NOT NULL,
                    carbs_consumed REAL NOT NULL,
                    fat_consumed REAL NOT NULL,
                    weekly_weight_change REAL NOT NULL,
                    adherence_score INTEGER NOT NULL
                );

-- table food_logs
CREATE TABLE food_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    log_date TEXT NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, log_date),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table exercise_entries
CREATE TABLE exercise_entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    calories_burned INTEGER NOT NULL,
                    logged_on TEXT NOT NULL,
                    logged_at TEXT NOT NULL,
                    intensity TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table planned_exercise_entries
CREATE TABLE planned_exercise_entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    calories_burned INTEGER NOT NULL,
                    planned_on TEXT NOT NULL,
                    planned_at TEXT NOT NULL,
                    intensity TEXT NOT NULL,
                    completed_at TEXT,
                    completed_exercise_entry_id TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (completed_exercise_entry_id) REFERENCES exercise_entries (id) ON DELETE SET NULL
                );

-- table planned_workout_sessions
CREATE TABLE planned_workout_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    legacy_planned_exercise_entry_id TEXT UNIQUE,
                    title TEXT NOT NULL,
                    workout_type TEXT NOT NULL,
                    planned_on TEXT NOT NULL,
                    planned_at TEXT NOT NULL,
                    notes TEXT,
                    estimated_calories_burned INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'planned',
                    completed_at TEXT,
                    completed_exercise_entry_id TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (completed_exercise_entry_id) REFERENCES exercise_entries (id) ON DELETE SET NULL
                );

-- table planned_workout_blocks
CREATE TABLE planned_workout_blocks (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    block_kind TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES planned_workout_sessions (id) ON DELETE CASCADE,
                    UNIQUE (session_id, position)
                );

-- table planned_workout_segments
CREATE TABLE planned_workout_segments (
                    id TEXT PRIMARY KEY,
                    block_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    segment_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    activity_type TEXT,
                    duration_minutes INTEGER,
                    distance_value REAL,
                    distance_unit TEXT,
                    reps INTEGER,
                    intensity TEXT,
                    notes TEXT,
                    calories_estimate INTEGER,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (block_id) REFERENCES planned_workout_blocks (id) ON DELETE CASCADE,
                    UNIQUE (block_id, position)
                );

-- table food_log_entries
CREATE TABLE food_log_entries (
                    id TEXT PRIMARY KEY,
                    food_log_id TEXT NOT NULL,
                    entry_type TEXT NOT NULL,
                    food_item_id TEXT,
                    meal_template_id TEXT,
                    meal_plan_slot_id TEXT,
                    display_name_override TEXT,
                    grams REAL NOT NULL DEFAULT 0,
                    servings REAL NOT NULL DEFAULT 1,
                    calories REAL NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (food_log_id) REFERENCES food_logs (id) ON DELETE CASCADE,
                    FOREIGN KEY (meal_template_id) REFERENCES meal_templates (id) ON DELETE SET NULL,
                    FOREIGN KEY (meal_plan_slot_id) REFERENCES meal_plan_slots (id) ON DELETE SET NULL
                );

-- table meal_plan_days
CREATE TABLE meal_plan_days (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    plan_date TEXT NOT NULL,
                    label TEXT NOT NULL,
                    focus TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, plan_date),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table meal_plan_slots
CREATE TABLE meal_plan_slots (
                    id TEXT PRIMARY KEY,
                    meal_plan_day_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    meal_label TEXT NOT NULL,
                    title TEXT NOT NULL,
                    calories INTEGER NOT NULL,
                    items_json TEXT,
                    eaten_at TEXT,
                    prep_status TEXT NOT NULL,
                    FOREIGN KEY (meal_plan_day_id) REFERENCES meal_plan_days (id) ON DELETE CASCADE
                );

-- table meal_prep_tasks
CREATE TABLE meal_prep_tasks (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    portions TEXT NOT NULL,
                    status TEXT NOT NULL,
                    scheduled_for TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table ingestion_jobs
CREATE TABLE ingestion_jobs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    source_kind TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    completed_at TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table ingestion_outputs
CREATE TABLE ingestion_outputs (
                    id TEXT PRIMARY KEY,
                    ingestion_job_id TEXT NOT NULL,
                    extracted_text TEXT,
                    structured_json TEXT,
                    confidence REAL NOT NULL DEFAULT 0,
                    reviewed_at TEXT,
                    accepted_at TEXT,
                    rejected_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ingestion_job_id) REFERENCES ingestion_jobs (id) ON DELETE CASCADE
                );

-- table saved_favorites
CREATE TABLE saved_favorites (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL CHECK (entity_type IN ('recipe', 'meal_template', 'food')),
                    entity_id TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE (user_id, entity_type, entity_id)
                );

-- table food_catalog
CREATE TABLE food_catalog (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    brand TEXT,
                    calories REAL NOT NULL,
                    serving_size REAL NOT NULL,
                    serving_unit TEXT NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    source TEXT NOT NULL
                );

-- table default_favorite_foods
CREATE TABLE default_favorite_foods (
                    food_id TEXT PRIMARY KEY,
                    food_name TEXT NOT NULL,
                    brand TEXT,
                    calories REAL NOT NULL,
                    serving_size REAL NOT NULL,
                    serving_unit TEXT NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    source TEXT NOT NULL,
                    display_order INTEGER NOT NULL
                );

-- table user_default_favorite_food_seed_runs
CREATE TABLE user_default_favorite_food_seed_runs (
                    user_id TEXT PRIMARY KEY,
                    seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

-- table meal_templates
CREATE TABLE meal_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    serving_count REAL NOT NULL,
                    favorite INTEGER NOT NULL DEFAULT 0,
                    calories REAL NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fat REAL NOT NULL,
                    per_serving_calories REAL NOT NULL,
                    per_serving_protein REAL NOT NULL,
                    per_serving_carbs REAL NOT NULL,
                    per_serving_fat REAL NOT NULL
                );

-- table meal_template_ingredients
CREATE TABLE meal_template_ingredients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    meal_template_id TEXT NOT NULL REFERENCES meal_templates(id) ON DELETE CASCADE,
                    food_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    grams REAL NOT NULL,
                    calories_per_100g REAL NOT NULL,
                    protein_per_100g REAL NOT NULL,
                    carbs_per_100g REAL NOT NULL,
                    fat_per_100g REAL NOT NULL
                );

-- table recipes
CREATE TABLE recipes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    default_yield REAL NOT NULL,
                    favorite INTEGER NOT NULL DEFAULT 0
                );

-- table recipe_steps
CREATE TABLE recipe_steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                    position INTEGER NOT NULL,
                    step_text TEXT NOT NULL
                );

-- table recipe_assets
CREATE TABLE recipe_assets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL,
                    url TEXT,
                    content TEXT
                );

-- table recipe_ingredients
CREATE TABLE recipe_ingredients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                    food_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    grams REAL NOT NULL,
                    calories_per_100g REAL NOT NULL,
                    protein_per_100g REAL NOT NULL,
                    carbs_per_100g REAL NOT NULL,
                    fat_per_100g REAL NOT NULL
                );

-- index idx_users_email
CREATE INDEX idx_users_email ON users (email);

-- index idx_user_goals_user_effective
CREATE INDEX idx_user_goals_user_effective ON user_goals (user_id, effective_at DESC);

-- index idx_weight_entries_user_recorded
CREATE INDEX idx_weight_entries_user_recorded ON weight_entries (user_id, recorded_at);

-- index idx_food_logs_user_date
CREATE INDEX idx_food_logs_user_date ON food_logs (user_id, log_date);

-- index idx_exercise_entries_user_logged_on
CREATE INDEX idx_exercise_entries_user_logged_on
                    ON exercise_entries (user_id, logged_on DESC, created_at DESC);

-- index idx_planned_exercise_entries_user_planned_on
CREATE INDEX idx_planned_exercise_entries_user_planned_on
                    ON planned_exercise_entries (user_id, planned_on ASC, planned_at ASC, created_at ASC);

-- index idx_planned_workout_sessions_user_planned_on
CREATE INDEX idx_planned_workout_sessions_user_planned_on
                    ON planned_workout_sessions (user_id, planned_on ASC, planned_at ASC, created_at ASC);

-- index idx_planned_workout_blocks_session_position
CREATE INDEX idx_planned_workout_blocks_session_position
                    ON planned_workout_blocks (session_id, position ASC);

-- index idx_planned_workout_segments_block_position
CREATE INDEX idx_planned_workout_segments_block_position
                    ON planned_workout_segments (block_id, position ASC);

-- index idx_food_log_entries_log
CREATE INDEX idx_food_log_entries_log ON food_log_entries (food_log_id);

-- index idx_food_log_entries_food_item
CREATE INDEX idx_food_log_entries_food_item ON food_log_entries (food_item_id);

-- index idx_food_log_entries_meal_template
CREATE INDEX idx_food_log_entries_meal_template ON food_log_entries (meal_template_id);

-- index idx_meal_plan_days_user_date
CREATE INDEX idx_meal_plan_days_user_date
                    ON meal_plan_days (user_id, plan_date ASC);

-- index idx_meal_plan_slots_day_position
CREATE INDEX idx_meal_plan_slots_day_position
                    ON meal_plan_slots (meal_plan_day_id, position ASC);

-- index idx_meal_prep_tasks_user_status
CREATE INDEX idx_meal_prep_tasks_user_status
                    ON meal_prep_tasks (user_id, status, updated_at DESC);

-- index idx_ingestion_jobs_user_status
CREATE INDEX idx_ingestion_jobs_user_status ON ingestion_jobs (user_id, status);

-- index idx_ingestion_outputs_job
CREATE INDEX idx_ingestion_outputs_job ON ingestion_outputs (ingestion_job_id);

-- index idx_ingestion_outputs_reviewed_at
CREATE INDEX idx_ingestion_outputs_reviewed_at ON ingestion_outputs (reviewed_at, created_at DESC);

-- index idx_ingestion_outputs_pending_review
CREATE INDEX idx_ingestion_outputs_pending_review
                    ON ingestion_outputs (created_at DESC, id)
                    WHERE reviewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL;

-- index idx_saved_favorites_user_type_created
CREATE INDEX idx_saved_favorites_user_type_created
                    ON saved_favorites (user_id, entity_type, created_at DESC);

-- index idx_saved_favorites_entity
CREATE INDEX idx_saved_favorites_entity
                    ON saved_favorites (entity_type, entity_id);

-- index idx_default_favorite_foods_order
CREATE INDEX idx_default_favorite_foods_order
                    ON default_favorite_foods (display_order ASC, food_name ASC);

-- index idx_food_log_entries_meal_plan_slot
CREATE INDEX idx_food_log_entries_meal_plan_slot
                    ON food_log_entries (meal_plan_slot_id)
                ;

-- index idx_food_log_entries_meal_plan_slot_unique
CREATE UNIQUE INDEX idx_food_log_entries_meal_plan_slot_unique
                    ON food_log_entries (meal_plan_slot_id)
                    WHERE meal_plan_slot_id IS NOT NULL
                ;

