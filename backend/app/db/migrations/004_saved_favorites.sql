CREATE TABLE IF NOT EXISTS saved_favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('recipe', 'meal_template')),
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_favorites_user_type_created
    ON saved_favorites (user_id, entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_favorites_entity
    ON saved_favorites (entity_type, entity_id);
