-- Share (percent) of logged workout calories added to the day's calorie allowance:
-- 100, 75 (default; workout estimates tend to run high), 50, or 0 (off).
ALTER TABLE user_profiles ADD COLUMN workout_calories_share INTEGER NOT NULL DEFAULT 75;
