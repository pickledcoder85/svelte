import type { ExerciseEntry, FoodLogSummary, ProfileProgress, WeightEntry } from '../types';

export interface TrackerTotalsSummary {
  foodCalories: number;
  exerciseCalories: number;
  exerciseMinutes: number;
  netCalories: number;
  foodEntryCount: number;
  exerciseEntryCount: number;
}

export interface WeightProgressSummary {
  currentWeightLbs: number | null;
  startWeightLbs: number | null;
  targetWeightLbs: number | null;
  weeklyWeightChange: number;
  weightEntryCount: number;
  latestRecordedAt: string | null;
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildTrackerTotals(
  foodLog: FoodLogSummary,
  exerciseEntries: ExerciseEntry[]
): TrackerTotalsSummary {
  const exerciseCalories = roundToTenth(
    exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)
  );
  const exerciseMinutes = exerciseEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  const foodCalories = roundToTenth(foodLog.totals.calories);

  return {
    foodCalories,
    exerciseCalories,
    exerciseMinutes,
    netCalories: roundToTenth(Math.max(foodCalories - exerciseCalories, 0)),
    foodEntryCount: foodLog.entries.length,
    exerciseEntryCount: exerciseEntries.length
  };
}

export function buildWeightProgressSummary(
  progress: ProfileProgress | null,
  weightEntries: WeightEntry[]
): WeightProgressSummary {
  const currentWeightLbs = progress?.current_weight_lbs ?? weightEntries.at(-1)?.weight_lbs ?? null;
  const startWeightLbs = progress?.start_weight_lbs ?? weightEntries.at(0)?.weight_lbs ?? null;
  const targetWeightLbs = progress?.target_weight_lbs ?? null;
  const weeklyWeightChange =
    progress?.weekly_weight_change ??
    (currentWeightLbs !== null && startWeightLbs !== null
      ? roundToTenth(currentWeightLbs - startWeightLbs)
      : 0);

  return {
    currentWeightLbs,
    startWeightLbs,
    targetWeightLbs,
    weeklyWeightChange,
    weightEntryCount: progress?.weight_entries ?? weightEntries.length,
    latestRecordedAt: weightEntries.at(-1)?.recorded_at ?? null
  };
}
