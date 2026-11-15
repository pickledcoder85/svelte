-- The weight of one serving, and each user's own food bank.
--
-- Foods keep their label serving as printed (serving_text, nutrition per serving). When the
-- serving's weight is known it is stored in serving_grams (grams, or millilitres when
-- serving_basis is 'ml'), so any food can be logged or planned by weight. portions_json holds
-- other handy measures for whole foods, e.g. [{"label": "1 cup", "grams": 123}].
ALTER TABLE food_catalog ADD COLUMN serving_text TEXT;
ALTER TABLE food_catalog ADD COLUMN serving_grams REAL;
ALTER TABLE food_catalog ADD COLUMN serving_basis TEXT;
ALTER TABLE food_catalog ADD COLUMN portions_json TEXT;

UPDATE food_catalog SET serving_grams = serving_size, serving_basis = 'g'
WHERE serving_grams IS NULL AND lower(trim(serving_unit)) IN ('g', 'gram', 'grams', 'grm');
UPDATE food_catalog SET serving_grams = serving_size, serving_basis = 'ml'
WHERE serving_grams IS NULL AND lower(trim(serving_unit)) IN ('ml', 'mlt', 'millilitre', 'milliliter');

-- The foods a user has scanned, saved, or logged. Searching USDA does not add to it.
CREATE TABLE user_food_bank (
    user_id TEXT NOT NULL,
    food_id TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT,
    PRIMARY KEY (user_id, food_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES food_catalog (id) ON DELETE CASCADE
);
CREATE INDEX idx_user_food_bank_recent ON user_food_bank (user_id, last_used_at DESC);

-- Foods already logged go into that user's bank.
INSERT OR IGNORE INTO user_food_bank (user_id, food_id, added_at, last_used_at)
SELECT fl.user_id, e.food_item_id, MIN(e.created_at), MAX(e.created_at)
FROM food_log_entries e
JOIN food_logs fl ON fl.id = e.food_log_id
JOIN food_catalog f ON f.id = e.food_item_id
WHERE e.food_item_id IS NOT NULL
GROUP BY fl.user_id, e.food_item_id;

-- Before this, scanned foods weren't linked to who scanned them. On this single-owner server
-- every user with scans gets the scanned foods.
INSERT OR IGNORE INTO user_food_bank (user_id, food_id)
SELECT DISTINCT j.user_id, f.id
FROM food_catalog f
JOIN ingestion_jobs j
WHERE f.source IN ('LABEL_SCAN', 'OPEN_FOOD_FACTS');
