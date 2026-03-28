CREATE TABLE IF NOT EXISTS default_favorite_foods (
    food_id TEXT PRIMARY KEY,
    food_name TEXT NOT NULL,
    brand TEXT,
    calories REAL NOT NULL,
    serving_size REAL NOT NULL,
    serving_unit TEXT NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL,
    source TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_default_favorite_food_seed_runs (
    user_id TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_default_favorite_foods_order
    ON default_favorite_foods (display_order ASC, food_name ASC);

INSERT OR IGNORE INTO default_favorite_foods (
    food_id, food_name, brand, calories, serving_size,
    serving_unit, protein, carbs, fat, source, display_order
) VALUES
    ('food-oats', 'Rolled oats', NULL, 389, 100, 'g', 16.9, 66.3, 6.9, 'CUSTOM', 1),
    ('food-greek-yogurt', 'Greek yogurt, plain nonfat', NULL, 59, 100, 'g', 10.3, 3.6, 0.4, 'CUSTOM', 2),
    ('food-blueberries', 'Blueberries', NULL, 57, 100, 'g', 0.7, 14.5, 0.3, 'CUSTOM', 3),
    ('food-chicken-breast', 'Chicken breast, skinless', NULL, 165, 100, 'g', 31.0, 0.0, 3.6, 'CUSTOM', 4),
    ('food-chicken-thighs', 'Chicken thighs, skinless', NULL, 209, 100, 'g', 26.0, 0.0, 10.9, 'CUSTOM', 5),
    ('food-beef-ground-80-20', 'Beef, ground (80/20)', NULL, 254, 100, 'g', 17.2, 0.0, 20.0, 'CUSTOM', 6),
    ('food-carrots', 'Carrots', NULL, 41, 100, 'g', 0.9, 9.6, 0.2, 'CUSTOM', 7),
    ('food-apples-granny-smith', 'Apple, Granny Smith', NULL, 52, 100, 'g', 0.3, 13.8, 0.2, 'CUSTOM', 8),
    ('food-bread-whole-wheat', 'Bread, whole wheat', NULL, 247, 100, 'g', 13.0, 41.0, 4.2, 'CUSTOM', 9),
    ('food-eggs-whole', 'Eggs, whole', NULL, 143, 100, 'g', 12.6, 0.7, 9.5, 'CUSTOM', 10),
    ('food-strawberries', 'Strawberries', NULL, 32, 100, 'g', 0.7, 7.7, 0.3, 'CUSTOM', 11),
    ('food-bananas', 'Bananas', NULL, 89, 100, 'g', 1.1, 22.8, 0.3, 'CUSTOM', 12),
    ('food-rice-white', 'Rice, white', NULL, 130, 100, 'g', 2.4, 28.2, 0.3, 'CUSTOM', 13),
    ('food-potatoes', 'Potatoes', NULL, 77, 100, 'g', 2.0, 17.0, 0.1, 'CUSTOM', 14),
    ('food-salmon', 'Salmon', NULL, 208, 100, 'g', 20.0, 0.0, 13.0, 'CUSTOM', 15),
    ('food-broccoli', 'Broccoli', NULL, 34, 100, 'g', 2.8, 6.6, 0.4, 'CUSTOM', 16),
    ('food-avocado', 'Avocado', NULL, 160, 100, 'g', 2.0, 8.5, 14.7, 'CUSTOM', 17),
    ('food-peanut-butter', 'Peanut butter', NULL, 588, 100, 'g', 25.1, 20.0, 50.4, 'CUSTOM', 18),
    ('food-milk-2pct', 'Milk, 2%', NULL, 50, 100, 'g', 3.4, 4.8, 2.0, 'CUSTOM', 19),
    ('food-spinach', 'Spinach', NULL, 23, 100, 'g', 2.9, 3.6, 0.4, 'CUSTOM', 20),
    ('food-cottage-cheese', 'Cottage cheese', NULL, 98, 100, 'g', 11.1, 3.4, 4.3, 'CUSTOM', 21);
