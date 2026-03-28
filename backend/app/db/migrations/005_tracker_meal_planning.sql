CREATE TABLE IF NOT EXISTS exercise_entries (
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

CREATE TABLE IF NOT EXISTS meal_plan_days (
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

CREATE TABLE IF NOT EXISTS meal_plan_slots (
    id TEXT PRIMARY KEY,
    meal_plan_day_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    meal_label TEXT NOT NULL,
    title TEXT NOT NULL,
    calories INTEGER NOT NULL,
    prep_status TEXT NOT NULL,
    FOREIGN KEY (meal_plan_day_id) REFERENCES meal_plan_days (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_prep_tasks (
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

CREATE INDEX IF NOT EXISTS idx_exercise_entries_user_logged_on
    ON exercise_entries (user_id, logged_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_days_user_date
    ON meal_plan_days (user_id, plan_date ASC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_slots_day_position
    ON meal_plan_slots (meal_plan_day_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_meal_prep_tasks_user_status
    ON meal_prep_tasks (user_id, status, updated_at DESC);
