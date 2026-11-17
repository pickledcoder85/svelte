-- Reminder notifications (Web Push): the phone's push subscriptions and the reminder times.
CREATE TABLE push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_success_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- One row per reminder time, in the user's time zone ("10:00"). last_sent_on is the local
-- date it last went out (or was skipped because the goal was already met), so it fires once.
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    local_time TEXT NOT NULL,
    last_sent_on TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, kind, local_time),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
