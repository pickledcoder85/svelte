import { describe, expect, it } from 'vitest';

import type { PlannedExerciseEntry } from '../types';
import {
  buildOptimisticPlannedWorkoutSession,
  buildPlannedWorkoutEditDraft,
  buildPlannedWorkoutPayload,
  inferWorkoutTypeFromTitle,
  mapPlannedWorkoutSessionToEntry,
  sortPlannedWorkoutSessions
} from './planned-workouts';

function buildSession(id: string, warmupMinutes: number, mainMinutes: number, cooldownMinutes: number) {
  return buildOptimisticPlannedWorkoutSession(
    id,
    buildPlannedWorkoutPayload({
      title: 'Tempo run',
      workoutType: 'run',
      mainMinutes,
      warmupMinutes,
      cooldownMinutes,
      plannedOn: '2026-04-07',
      plannedAt: '06:00',
      estimatedCaloriesBurned: 400,
      intensity: 'High'
    })
  );
}

describe('planned workout helpers', () => {
  it('maps a session to an entry whose duration is the total of every block', () => {
    const entry = mapPlannedWorkoutSessionToEntry(buildSession('s1', 10, 30, 8));
    expect(entry.duration_minutes).toBe(48);
    expect(entry.intensity).toBe('High');
  });

  it('prefills the edit draft with the main set only, not the total duration', () => {
    const session = buildSession('s1', 10, 30, 8);
    const draft = buildPlannedWorkoutEditDraft(mapPlannedWorkoutSessionToEntry(session), session);
    expect(draft).toEqual({
      title: 'Tempo run',
      mainMinutes: 30,
      warmupEnabled: true,
      warmupMinutes: 10,
      cooldownEnabled: true,
      cooldownMinutes: 8
    });
  });

  it('keeps the duration stable across repeated edit-and-save cycles', () => {
    let session = buildSession('s1', 10, 30, 8);
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const draft = buildPlannedWorkoutEditDraft(mapPlannedWorkoutSessionToEntry(session), session);
      session = buildOptimisticPlannedWorkoutSession(
        session.id,
        buildPlannedWorkoutPayload({
          title: draft.title,
          workoutType: 'run',
          mainMinutes: draft.mainMinutes,
          warmupMinutes: draft.warmupEnabled ? draft.warmupMinutes : 0,
          cooldownMinutes: draft.cooldownEnabled ? draft.cooldownMinutes : 0,
          plannedOn: session.planned_on,
          plannedAt: session.planned_at,
          estimatedCaloriesBurned: session.estimated_calories_burned,
          intensity: 'High'
        })
      );
    }
    expect(mapPlannedWorkoutSessionToEntry(session).duration_minutes).toBe(48);
  });

  it('uses defaults for warmup and cooldown when the session has none', () => {
    const session = buildSession('s2', 0, 25, 0);
    const draft = buildPlannedWorkoutEditDraft(mapPlannedWorkoutSessionToEntry(session), session);
    expect(draft.mainMinutes).toBe(25);
    expect(draft.warmupEnabled).toBe(false);
    expect(draft.warmupMinutes).toBe(10);
    expect(draft.cooldownEnabled).toBe(false);
    expect(draft.cooldownMinutes).toBe(8);
  });

  it('falls back to the entry duration when no session is loaded', () => {
    const entry: PlannedExerciseEntry = {
      id: 'legacy-1',
      title: 'Walk',
      duration_minutes: 35,
      calories_burned: 200,
      planned_on: '2026-04-07',
      planned_at: '07:00',
      intensity: 'Moderate',
      completed_at: null,
      completed_exercise_entry_id: null
    };
    expect(buildPlannedWorkoutEditDraft(entry, undefined).mainMinutes).toBe(35);
  });

  it('infers workout types from titles and sorts sessions by date and time', () => {
    expect(inferWorkoutTypeFromTitle('Morning Swim')).toBe('swim');
    expect(inferWorkoutTypeFromTitle('Upper body lift')).toBe('weights');
    expect(inferWorkoutTypeFromTitle('Yoga')).toBe('custom');
    const later = { ...buildSession('b', 0, 20, 0), planned_on: '2026-04-08' };
    const earlier = buildSession('a', 0, 20, 0);
    expect(sortPlannedWorkoutSessions([later, earlier]).map((session) => session.id)).toEqual(['a', 'b']);
  });
});
