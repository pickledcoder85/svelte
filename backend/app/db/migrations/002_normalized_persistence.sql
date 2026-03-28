CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    units TEXT NOT NULL DEFAULT 'imperial',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    effective_at TEXT NOT NULL,
    calorie_goal INTEGER NOT NULL,
    protein_goal REAL NOT NULL,
    carbs_goal REAL NOT NULL,
    fat_goal REAL NOT NULL,
    target_weight_lbs REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weight_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    weight_lbs REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS food_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, log_date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS food_log_entries (
    id TEXT PRIMARY KEY,
    food_log_id TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    food_item_id TEXT,
    meal_template_id TEXT,
    grams REAL NOT NULL DEFAULT 0,
    servings REAL NOT NULL DEFAULT 1,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_log_id) REFERENCES food_logs (id) ON DELETE CASCADE,
    FOREIGN KEY (meal_template_id) REFERENCES meal_templates (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
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

CREATE TABLE IF NOT EXISTS ingestion_outputs (
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

CREATE INDEX IF NOT EXISTS idx_user_goals_user_effective ON user_goals (user_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_recorded ON weight_entries (user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_log ON food_log_entries (food_log_id);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_food_item ON food_log_entries (food_item_id);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_meal_template ON food_log_entries (meal_template_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_status ON ingestion_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_ingestion_outputs_job ON ingestion_outputs (ingestion_job_id);
