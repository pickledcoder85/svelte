-- How many times a day the user eats (3, 4, or 5: breakfast, lunch, dinner, plus up to two
-- snacks between them) and how the daily calorie target splits across them. meal_split is a JSON
-- list of percents in day order (NULL: the default for meals_per_day). Macros follow the same
-- split. A preference only: it never changes the targets. Used by meal suggestions and Lazy Plan.
ALTER TABLE user_profiles ADD COLUMN meals_per_day INTEGER NOT NULL DEFAULT 3;
ALTER TABLE user_profiles ADD COLUMN meal_split TEXT;
