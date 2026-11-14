CREATE TABLE IF NOT EXISTS planned_workout_sessions (
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

CREATE TABLE IF NOT EXISTS planned_workout_blocks (
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

CREATE TABLE IF NOT EXISTS planned_workout_segments (
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

CREATE INDEX IF NOT EXISTS idx_planned_workout_sessions_user_planned_on
    ON planned_workout_sessions (user_id, planned_on ASC, planned_at ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_planned_workout_blocks_session_position
    ON planned_workout_blocks (session_id, position ASC);

CREATE INDEX IF NOT EXISTS idx_planned_workout_segments_block_position
    ON planned_workout_segments (block_id, position ASC);

INSERT INTO planned_workout_sessions (
    id,
    user_id,
    legacy_planned_exercise_entry_id,
    title,
    workout_type,
    planned_on,
    planned_at,
    notes,
    estimated_calories_burned,
    status,
    completed_at,
    completed_exercise_entry_id,
    created_at,
    updated_at
)
SELECT
    legacy.id,
    legacy.user_id,
    legacy.id,
    legacy.title,
    CASE
        WHEN lower(legacy.title) LIKE '%swim%' THEN 'swim'
        WHEN lower(legacy.title) LIKE '%bike%' OR lower(legacy.title) LIKE '%ride%' OR lower(legacy.title) LIKE '%cycle%' THEN 'bike'
        WHEN lower(legacy.title) LIKE '%run%' OR lower(legacy.title) LIKE '%jog%' THEN 'run'
        WHEN lower(legacy.title) LIKE '%lift%' OR lower(legacy.title) LIKE '%strength%' OR lower(legacy.title) LIKE '%weight%' THEN 'weights'
        ELSE 'custom'
    END,
    legacy.planned_on,
    legacy.planned_at,
    NULL,
    legacy.calories_burned,
    CASE
        WHEN legacy.completed_at IS NULL THEN 'planned'
        ELSE 'completed'
    END,
    legacy.completed_at,
    legacy.completed_exercise_entry_id,
    legacy.created_at,
    legacy.updated_at
FROM planned_exercise_entries AS legacy
WHERE NOT EXISTS (
    SELECT 1
    FROM planned_workout_sessions AS sessions
    WHERE sessions.id = legacy.id
);

INSERT INTO planned_workout_blocks (
    id,
    session_id,
    block_kind,
    position,
    title,
    notes,
    created_at,
    updated_at
)
SELECT
    sessions.id || '-activity',
    sessions.id,
    'activity',
    0,
    'Main set',
    NULL,
    sessions.created_at,
    sessions.updated_at
FROM planned_workout_sessions AS sessions
WHERE sessions.legacy_planned_exercise_entry_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM planned_workout_blocks AS blocks
      WHERE blocks.id = sessions.id || '-activity'
  );

INSERT INTO planned_workout_segments (
    id,
    block_id,
    position,
    segment_type,
    title,
    activity_type,
    duration_minutes,
    distance_value,
    distance_unit,
    reps,
    intensity,
    notes,
    calories_estimate,
    created_at,
    updated_at
)
SELECT
    sessions.id || '-activity-1',
    sessions.id || '-activity',
    0,
    'time',
    sessions.title,
    sessions.workout_type,
    legacy.duration_minutes,
    NULL,
    NULL,
    NULL,
    legacy.intensity,
    NULL,
    legacy.calories_burned,
    sessions.created_at,
    sessions.updated_at
FROM planned_workout_sessions AS sessions
JOIN planned_exercise_entries AS legacy
  ON legacy.id = sessions.legacy_planned_exercise_entry_id
WHERE NOT EXISTS (
    SELECT 1
    FROM planned_workout_segments AS segments
    WHERE segments.id = sessions.id || '-activity-1'
);
