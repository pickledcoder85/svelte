-- Water: a daily goal on the profile (ml; 2,000 = 8 glasses by default) and each drink logged.
ALTER TABLE user_profiles ADD COLUMN water_goal_ml INTEGER NOT NULL DEFAULT 2000;

CREATE TABLE water_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    logged_on TEXT NOT NULL,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_water_entries_user_day ON water_entries (user_id, logged_on);
