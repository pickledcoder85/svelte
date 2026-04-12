# Planned Workout Structure

This document defines the next durable backend/database contract for planned workouts.

The current mobile UI still uses the flat `planned exercise` form, but the persistence layer now stores a richer workout structure so the app can grow into warmups, multiple main activities, and cooldowns without another schema reset.

## Design goals

- keep planned workouts mobile-friendly
- support warmup, main work, and cooldown as first-class parts of one session
- allow multiple different activities inside a single planned workout
- preserve compatibility with the current flat `planned exercise` API while the richer planner UI is being built

## Core model

### Session

One planned workout for one user on one date/time.

Recommended fields:

- `id`
- `user_id`
- `title`
- `workout_type`: `weights | swim | bike | run | custom`
- `planned_on`
- `planned_at`
- `notes`
- `estimated_calories_burned`
- `status`: `planned | completed | skipped`
- `completed_at`
- `completed_exercise_entry_id`

### Block

An ordered section inside the session.

Current supported block kinds:

- `warmup`
- `activity`
- `cooldown`

Each block has:

- `id`
- `session_id`
- `block_kind`
- `position`
- `title`
- `notes`

### Segment

An ordered instruction row inside a block.

Current supported segment types:

- `time`
- `distance`
- `activity`
- `reps`

Each segment can carry:

- `id`
- `block_id`
- `position`
- `segment_type`
- `title`
- `activity_type`
- `duration_minutes`
- `distance_value`
- `distance_unit`
- `reps`
- `intensity`
- `notes`
- `calories_estimate`

## Current compatibility layer

The existing `/tracker/planned-exercise` API still returns the flat shape used by the current Tracker and Home screens:

- `title`
- `duration_minutes`
- `calories_burned`
- `planned_on`
- `planned_at`
- `intensity`

That flat entry now mirrors into the structured tables as:

- one `planned_workout_session`
- one `activity` block titled `Main set`
- one `time` segment carrying the legacy title, duration, intensity, and calorie estimate

The backend now also exposes the first structured session routes:

- `GET /api/tracker/planned-workout-sessions`
- `POST /api/tracker/planned-workout-sessions`
- `PUT /api/tracker/planned-workout-sessions/{session_id}`
- `PATCH /api/tracker/planned-workout-sessions/{session_id}/completion`

The current mobile UI does not use these routes yet.

## Future API direction

The future planner API should use session-based contracts rather than a single flat row:

### `GET /api/tracker/planned-workout-sessions`

Returns nested sessions with blocks and segments.

### `POST /api/tracker/planned-workout-sessions`

Creates a session with:

- top-level session metadata
- optional warmup block
- one or more activity blocks/segments
- optional cooldown block

### `PUT /api/tracker/planned-workout-sessions/{session_id}`

Updates the full session structure in one request.

### `PATCH /api/tracker/planned-workout-sessions/{session_id}/completion`

Marks the plan complete or incomplete and links/unlinks the performed workout record.

## Mobile UX implication

The intended mobile flow is:

1. tap `Plan Exercise`
2. choose a workout type: `Weights`, `Swim`, `Bike`, or `Run`
3. enter a type-specific planner
4. optionally add `Warmup`
5. add one or more main activity segments
6. optionally add `Cooldown`

Warmup and cooldown should offer quick-add defaults instead of forcing manual entry every time.

## Deferred work

- build session/block/segment API routes
- migrate the current Tracker planner UI from the flat form to the structured planner
- add type-specific warmup and cooldown templates
- support multiple main-set segments for intervals, drills, and supersets
- distinguish planned structure from completed execution details when the user performs only part of the planned session
