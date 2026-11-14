ALTER TABLE food_log_entries ADD COLUMN meal_plan_slot_id TEXT;
ALTER TABLE food_log_entries ADD COLUMN display_name_override TEXT;

CREATE INDEX IF NOT EXISTS idx_food_log_entries_meal_plan_slot
    ON food_log_entries (meal_plan_slot_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_log_entries_meal_plan_slot_unique
    ON food_log_entries (meal_plan_slot_id)
    WHERE meal_plan_slot_id IS NOT NULL;
