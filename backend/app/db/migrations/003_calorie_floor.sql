-- Whether daily calorie targets stop at the recommended minimum (1,200 women / 1,500 men)
-- or use the calculation as is ('off', chosen knowingly during setup or in Settings).
ALTER TABLE user_profiles ADD COLUMN calorie_floor TEXT NOT NULL DEFAULT 'recommended';
