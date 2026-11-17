-- How a workout's calories were counted: 'estimated' (Relish, from MET values), 'device' (the
-- user's watch total, minus Relish's resting calories), or NULL (older manual entries and
-- imports, which say so through their source). `met` is the MET value used for an estimate.
ALTER TABLE exercise_entries ADD COLUMN calories_method TEXT;
ALTER TABLE exercise_entries ADD COLUMN met REAL;
