-- The language the app showed when this phone subscribed to reminders: reminders use the
-- profile's chosen language, or this one while no language has been chosen.
ALTER TABLE push_subscriptions ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
