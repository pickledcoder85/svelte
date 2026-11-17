-- Shopping lists: saved from a meal plan (or started by hand), ticked off in the store, and
-- deleted by the user (never automatically).
CREATE TABLE shopping_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_shopping_lists_user ON shopping_lists (user_id, created_at);

-- amount is display text ("12 large eggs (600 g)", "450 g"); role is the aisle group
-- (protein, carb, veg, fruit, fat, other).
CREATE TABLE shopping_list_items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'other',
    checked INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE
);

CREATE INDEX idx_shopping_list_items_list ON shopping_list_items (list_id, position);
