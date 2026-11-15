-- Which meal a logged food belongs to: breakfast, lunch, dinner, or snack (NULL: not given;
-- shown under "Other"). Today's Meals groups food by it.
ALTER TABLE food_log_entries ADD COLUMN meal_slot TEXT;

-- Food logged by ticking a planned meal takes that meal's label when it is one of the four.
UPDATE food_log_entries
SET meal_slot = (
    SELECT lower(slots.meal_label) FROM meal_plan_slots slots WHERE slots.id = food_log_entries.meal_plan_slot_id
)
WHERE meal_slot IS NULL
  AND meal_plan_slot_id IS NOT NULL
  AND (
    SELECT lower(slots.meal_label) FROM meal_plan_slots slots WHERE slots.id = food_log_entries.meal_plan_slot_id
  ) IN ('breakfast', 'lunch', 'dinner', 'snack');

CREATE TRIGGER food_log_entries_meal_slot_from_plan
AFTER INSERT ON food_log_entries
WHEN NEW.meal_slot IS NULL AND NEW.meal_plan_slot_id IS NOT NULL
BEGIN
    UPDATE food_log_entries
    SET meal_slot = (
        SELECT CASE WHEN lower(meal_label) IN ('breakfast', 'lunch', 'dinner', 'snack') THEN lower(meal_label) END
        FROM meal_plan_slots WHERE id = NEW.meal_plan_slot_id
    )
    WHERE id = NEW.id;
END;
