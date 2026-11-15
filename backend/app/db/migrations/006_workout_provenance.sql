-- Where each workout came from, and how Relish counted it.
--
-- Three layers, never blended:
--   1. exercise_source_records: the original record from the source (e.g. Garmin), kept as is.
--   2. The source's own numbers on exercise_entries (source_calories_total, source_bmr_calories),
--      shown to the user as recorded.
--   3. Relish's interpretation: relish_resting_calories (Relish's BMR for the workout's minutes,
--      at the weight on that day) and calories_burned = the active calories Relish counts, i.e.
--      source total - Relish resting. Frozen when the workout is saved, with calc_version, so
--      later weight or profile changes never rewrite history.
--
-- Manual workouts keep source = 'manual' and calories_burned as entered.
ALTER TABLE exercise_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE exercise_entries ADD COLUMN source_id TEXT;
ALTER TABLE exercise_entries ADD COLUMN activity_type TEXT;
ALTER TABLE exercise_entries ADD COLUMN started_at TEXT;
ALTER TABLE exercise_entries ADD COLUMN distance_m REAL;
ALTER TABLE exercise_entries ADD COLUMN source_calories_total INTEGER;
ALTER TABLE exercise_entries ADD COLUMN source_bmr_calories INTEGER;
ALTER TABLE exercise_entries ADD COLUMN relish_resting_calories INTEGER;
ALTER TABLE exercise_entries ADD COLUMN weight_lbs_at_time REAL;
ALTER TABLE exercise_entries ADD COLUMN calc_version TEXT;

-- One Relish workout per source activity: re-syncing updates it instead of adding a copy.
CREATE UNIQUE INDEX idx_exercise_entries_source
ON exercise_entries (user_id, source, source_id)
WHERE source_id IS NOT NULL;

-- A record whose exercise_entry_id became NULL was deleted by the user in Relish: syncing
-- skips it from then on, so a deleted import never comes back.
CREATE TABLE exercise_source_records (
    user_id TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exercise_entry_id TEXT,
    PRIMARY KEY (user_id, source, source_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_entry_id) REFERENCES exercise_entries (id) ON DELETE SET NULL
);
