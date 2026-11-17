-- Whether the user picked a language in Settings. Until they do, the app follows the phone's
-- language (the stored `language` is only a default). A profile already set to Spanish counts
-- as chosen.
ALTER TABLE user_profiles ADD COLUMN language_chosen INTEGER NOT NULL DEFAULT 0;
UPDATE user_profiles SET language_chosen = 1 WHERE language <> 'en';
