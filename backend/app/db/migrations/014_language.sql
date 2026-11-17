-- Language: the app's display language ('en' English, 'es' Colombian Spanish).
ALTER TABLE user_profiles ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
