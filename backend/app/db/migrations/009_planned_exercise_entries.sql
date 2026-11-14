CREATE TABLE IF NOT EXISTS planned_exercise_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL,
    planned_on TEXT NOT NULL,
    planned_at TEXT NOT NULL,
    intensity TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planned_exercise_entries_user_planned_on
    ON planned_exercise_entries (user_id, planned_on ASC, planned_at ASC, created_at ASC);
