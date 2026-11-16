-- How a logged food was counted, when it was ("2 large eggs (100 g)"); NULL for weighed foods
-- or once the amount is edited. Today shows it under the food's name.
ALTER TABLE food_log_entries ADD COLUMN quantity_label TEXT;
