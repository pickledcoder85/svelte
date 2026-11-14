import type { PlannedExerciseEntry, PlannedWorkoutSession } from '../types';

export function buildDemoPlannedWorkoutSessions(entries: PlannedExerciseEntry[]): PlannedWorkoutSession[] {
  return entries.map((entry) =>
    buildOptimisticPlannedWorkoutSession(entry.id, buildPlannedWorkoutPayload({
      title: entry.title,
      workoutType: inferWorkoutTypeFromTitle(entry.title),
      mainMinutes: entry.duration_minutes,
      warmupMinutes: 0,
      cooldownMinutes: 0,
      plannedOn: entry.planned_on,
      plannedAt: entry.planned_at,
      estimatedCaloriesBurned: entry.calories_burned,
      intensity: entry.intensity
    }), entry.completed_at ?? null, entry.completed_exercise_entry_id ?? null)
  );
}

export function inferWorkoutTypeFromTitle(title: string): PlannedWorkoutSession['workout_type'] {
  const normalized = title.toLowerCase();
  if (normalized.includes('swim')) {
    return 'swim';
  }
  if (normalized.includes('bike') || normalized.includes('ride') || normalized.includes('cycle')) {
    return 'bike';
  }
  if (normalized.includes('run') || normalized.includes('jog')) {
    return 'run';
  }
  if (normalized.includes('lift') || normalized.includes('strength') || normalized.includes('weight')) {
    return 'weights';
  }
  return 'custom';
}

export function buildPlannedWorkoutPayload({
  title,
  workoutType,
  mainMinutes,
  warmupMinutes,
  cooldownMinutes,
  plannedOn,
  plannedAt,
  estimatedCaloriesBurned,
  intensity
}: {
  title: string;
  workoutType: PlannedWorkoutSession['workout_type'];
  mainMinutes: number;
  warmupMinutes: number;
  cooldownMinutes: number;
  plannedOn: string;
  plannedAt: string;
  estimatedCaloriesBurned: number;
  intensity: PlannedExerciseEntry['intensity'];
}) {
  const blocks: Array<{
    block_kind: 'warmup' | 'activity' | 'cooldown';
    title: string;
    segments: Array<{
      segment_type: 'time';
      title: string;
      activity_type: PlannedWorkoutSession['workout_type'];
      duration_minutes: number;
      intensity: PlannedExerciseEntry['intensity'];
      calories_estimate: number;
    }>;
  }> = [];
  if (warmupMinutes > 0) {
    blocks.push({
      block_kind: 'warmup',
      title: 'Warmup',
      segments: [
        {
          segment_type: 'time',
          title: defaultWarmupTitle(workoutType),
          activity_type: workoutType,
          duration_minutes: warmupMinutes,
          intensity: 'Low',
          calories_estimate: Math.round(estimatedCaloriesBurned * 0.15)
        }
      ]
    });
  }
  blocks.push({
    block_kind: 'activity',
    title: 'Main set',
    segments: [
      {
        segment_type: 'time',
        title,
        activity_type: workoutType,
        duration_minutes: mainMinutes,
        intensity,
        calories_estimate: Math.round(estimatedCaloriesBurned * 0.7)
      }
    ]
  });
  if (cooldownMinutes > 0) {
    blocks.push({
      block_kind: 'cooldown',
      title: 'Cooldown',
      segments: [
        {
          segment_type: 'time',
          title: defaultCooldownTitle(workoutType),
          activity_type: workoutType,
          duration_minutes: cooldownMinutes,
          intensity: 'Low',
          calories_estimate: Math.round(estimatedCaloriesBurned * 0.15)
        }
      ]
    });
  }
  return {
    title,
    workout_type: workoutType,
    planned_on: plannedOn,
    planned_at: plannedAt,
    notes: null,
    estimated_calories_burned: estimatedCaloriesBurned,
    blocks
  };
}

export function buildOptimisticPlannedWorkoutSession(
  id: string,
  payload: ReturnType<typeof buildPlannedWorkoutPayload>,
  completedAt: string | null = null,
  completedExerciseEntryId: string | null = null
): PlannedWorkoutSession {
  return {
    id,
    user_id: 'local-user',
    title: payload.title,
    workout_type: payload.workout_type,
    planned_on: payload.planned_on,
    planned_at: payload.planned_at,
    notes: payload.notes,
    estimated_calories_burned: payload.estimated_calories_burned,
    status: completedAt ? 'completed' : 'planned',
    completed_at: completedAt,
    completed_exercise_entry_id: completedExerciseEntryId,
    blocks: payload.blocks.map((block, blockIndex) => ({
      id: `${id}-${block.block_kind}-${blockIndex}`,
      session_id: id,
      block_kind: block.block_kind,
      position: blockIndex,
      title: block.title,
      notes: null,
      segments: block.segments.map((segment, segmentIndex) => ({
        id: `${id}-${block.block_kind}-${segmentIndex}`,
        block_id: `${id}-${block.block_kind}-${blockIndex}`,
        position: segmentIndex,
        segment_type: segment.segment_type,
        title: segment.title,
        activity_type: segment.activity_type,
        duration_minutes: segment.duration_minutes,
        intensity: segment.intensity,
        calories_estimate: segment.calories_estimate
      }))
    }))
  };
}

export function mapPlannedWorkoutSessionToEntry(session: PlannedWorkoutSession): PlannedExerciseEntry {
  const durationMinutes = session.blocks.reduce(
    (sum, block) =>
      sum +
      block.segments.reduce(
        (segmentSum, segment) => segmentSum + (typeof segment.duration_minutes === 'number' ? segment.duration_minutes : 0),
        0
      ),
    0
  );
  const mainSegment =
    session.blocks.find((block) => block.block_kind === 'activity')?.segments[0] ??
    session.blocks[0]?.segments[0] ??
    null;
  return {
    id: session.id,
    title: session.title,
    duration_minutes: durationMinutes,
    calories_burned: session.estimated_calories_burned,
    planned_on: session.planned_on,
    planned_at: session.planned_at,
    intensity: mainSegment?.intensity ?? 'Moderate',
    completed_at: session.completed_at ?? null,
    completed_exercise_entry_id: session.completed_exercise_entry_id ?? null,
    created_at: session.created_at,
    updated_at: session.updated_at
  };
}

export function sortPlannedWorkoutSessions(sessions: PlannedWorkoutSession[]): PlannedWorkoutSession[] {
  return [...sessions].sort((left, right) =>
    `${left.planned_on}T${left.planned_at}`.localeCompare(`${right.planned_on}T${right.planned_at}`)
  );
}

export function defaultWarmupTitle(workoutType: PlannedWorkoutSession['workout_type']): string {
  switch (workoutType) {
    case 'run':
      return 'Easy jog';
    case 'swim':
      return 'Easy swim';
    case 'bike':
      return 'Easy spin';
    case 'weights':
      return 'Mobility and activation';
    default:
      return 'Warmup';
  }
}

export function defaultCooldownTitle(workoutType: PlannedWorkoutSession['workout_type']): string {
  switch (workoutType) {
    case 'run':
      return 'Walk cooldown';
    case 'swim':
      return 'Easy swim cooldown';
    case 'bike':
      return 'Easy spin cooldown';
    case 'weights':
      return 'Breathing and mobility';
    default:
      return 'Cooldown';
  }
}

export type PlannedWorkoutEditDraft = {
  title: string;
  mainMinutes: number;
  warmupEnabled: boolean;
  warmupMinutes: number;
  cooldownEnabled: boolean;
  cooldownMinutes: number;
};

function firstSegmentMinutes(
  session: PlannedWorkoutSession | undefined,
  blockKind: 'warmup' | 'activity' | 'cooldown'
): number | null {
  const minutes = session?.blocks.find((block) => block.block_kind === blockKind)?.segments[0]?.duration_minutes;
  return typeof minutes === 'number' && minutes > 0 ? minutes : null;
}

/**
 * Builds the edit-form draft for a planned workout. The main-set minutes come from the
 * activity block only; `entry.duration_minutes` is the total across warmup, main set and
 * cooldown, so using it would re-add the warmup/cooldown on every edit-and-save.
 */
export function buildPlannedWorkoutEditDraft(
  entry: PlannedExerciseEntry,
  session: PlannedWorkoutSession | undefined
): PlannedWorkoutEditDraft {
  const warmupMinutes = firstSegmentMinutes(session, 'warmup');
  const cooldownMinutes = firstSegmentMinutes(session, 'cooldown');
  const activityMinutes = firstSegmentMinutes(session, 'activity');
  const fallbackMainMinutes = Math.max(
    (entry.duration_minutes || 0) - (warmupMinutes ?? 0) - (cooldownMinutes ?? 0),
    0
  );
  return {
    title: entry.title,
    mainMinutes: activityMinutes ?? (fallbackMainMinutes || 25),
    warmupEnabled: warmupMinutes !== null,
    warmupMinutes: warmupMinutes ?? 10,
    cooldownEnabled: cooldownMinutes !== null,
    cooldownMinutes: cooldownMinutes ?? 8
  };
}
