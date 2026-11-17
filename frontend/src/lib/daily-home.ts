import type { FoodLogSummary, MacroTargets, UserGoal, UserProfile } from '../types';
import { fatShareFor, macroAllowance } from './macro-allowance';

type ExerciseLike = {
  duration_minutes: number;
  calories_burned: number;
};

export interface DailyTargetSummary {
  /** The base daily target (diet plus everyday movement). */
  calorieTarget: number;
  intakeCalories: number;
  /** Calories from workouts logged today, exact as logged. */
  exerciseCalories: number;
  netCalories: number;
  /** The part of today's workouts added to the allowance (the share, rounded with the allowance). */
  workoutCaloriesAdded: number;
  /** Today's allowance: the target plus the added workout calories, to the nearest 10. */
  allowanceCalories: number;
  /** Allowance minus food eaten. */
  remainingCalories: number;
  /** The base macro targets (no workouts). */
  macroTargets: MacroTargets;
  /** Today's macro targets at the allowance: protein stays, fat gets its share, carbs the rest. */
  macroAllowance: MacroTargets;
  macroPercentages: MacroTargets;
  fiberTarget: number;
}

export interface DailyExerciseSummary {
  sessionCount: number;
  totalMinutes: number;
  totalCalories: number;
}

/** Workout calories shares a user can choose (percent of logged workout calories). */
export const WORKOUT_CALORIE_SHARES = [100, 75, 50, 0] as const;
export type WorkoutCaloriesShare = (typeof WORKOUT_CALORIE_SHARES)[number];
/** Default share: workout calorie estimates (watches, machines, formulas) tend to run high. */
export const DEFAULT_WORKOUT_CALORIES_SHARE: WorkoutCaloriesShare = 75;

/**
 * Today's calorie allowance: the base target plus a share of the calories from logged workouts.
 * Only the added part is rounded (to the nearest 10), so the target itself is never nudged and
 * no workouts means exactly the target. Logged workouts themselves stay exact. Without a target
 * (still loading, or preview mode) there is no allowance yet.
 */
export function dailyAllowance(
  calorieTarget: number,
  workoutCalories: number,
  sharePercent: number
): { allowance: number; workoutCaloriesAdded: number } {
  if (calorieTarget <= 0) {
    return { allowance: 0, workoutCaloriesAdded: 0 };
  }
  const share = Math.min(100, Math.max(0, sharePercent)) / 100;
  const workoutCaloriesAdded = Math.round((Math.max(0, workoutCalories) * share) / 10) * 10;
  return { allowance: calorieTarget + workoutCaloriesAdded, workoutCaloriesAdded };
}

export function calculateMacroPercentages(targets: MacroTargets): MacroTargets {
  const totalMacroCalories = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
  if (totalMacroCalories <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round(((targets.protein * 4) / totalMacroCalories) * 100),
    carbs: Math.round(((targets.carbs * 4) / totalMacroCalories) * 100),
    fat: Math.round(((targets.fat * 9) / totalMacroCalories) * 100)
  };
}

export function buildDailyTargetSummary({
  goal,
  profile,
  foodLog,
  exerciseEntries,
  workoutCaloriesShare = DEFAULT_WORKOUT_CALORIES_SHARE
}: {
  goal: UserGoal | null;
  profile: UserProfile | null;
  foodLog: FoodLogSummary;
  exerciseEntries: ExerciseLike[];
  /** Percent of logged workout calories added to the day's allowance. */
  workoutCaloriesShare?: number;
}): DailyTargetSummary {
  const calorieTarget = Math.round(goal?.calorie_goal ?? profile?.initial_calorie_target ?? 0);
  const macroTargets = {
    protein: Math.round(goal?.protein_goal ?? profile?.protein_target_g ?? 0),
    carbs: Math.round(goal?.carbs_goal ?? profile?.carbs_target_g ?? 0),
    fat: Math.round(goal?.fat_goal ?? profile?.fat_target_g ?? 0)
  };
  const intakeCalories = Math.round(foodLog.totals.calories ?? 0);
  const exerciseCalories = Math.round(
    exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)
  );
  const netCalories = intakeCalories - exerciseCalories;
  const { allowance, workoutCaloriesAdded } = dailyAllowance(calorieTarget, exerciseCalories, workoutCaloriesShare);

  return {
    calorieTarget,
    intakeCalories,
    exerciseCalories,
    netCalories,
    workoutCaloriesAdded,
    allowanceCalories: allowance,
    remainingCalories: allowance - intakeCalories,
    macroTargets,
    macroAllowance: macroAllowance(macroTargets, calorieTarget, allowance, fatShareFor(profile?.goal_type, profile?.goal_pace)),
    macroPercentages: calculateMacroPercentages(macroTargets),
    fiberTarget: Math.round(goal?.fiber_goal ?? profile?.fiber_target_g ?? 0)
  };
}

export function buildDailyExerciseSummary(exerciseEntries: ExerciseLike[]): DailyExerciseSummary {
  return {
    sessionCount: exerciseEntries.length,
    totalMinutes: exerciseEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0),
    totalCalories: exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)
  };
}
