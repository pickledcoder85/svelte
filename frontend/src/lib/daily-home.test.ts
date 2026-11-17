import { describe, expect, it } from 'vitest';

import type { ExerciseEntry, FoodLogSummary, UserGoal, UserProfile } from '../types';
import {
  buildDailyExerciseSummary,
  buildDailyTargetSummary,
  dailyAllowance
} from './daily-home';

const profile: UserProfile = {
  user_id: 'user-1',
  email: 'user@example.com',
  display_name: 'User',
  timezone: 'America/New_York',
  units: 'imperial',
  setup_complete: true,
  initial_calorie_target: 2100,
  protein_target_g: 150,
  carbs_target_g: 180,
  fat_target_g: 70,
  fiber_target_g: 30
};

const goal: UserGoal = {
  id: 'goal-1',
  user_id: 'user-1',
  effective_at: '2026-04-01T00:00:00Z',
  calorie_goal: 2200,
  protein_goal: 160,
  carbs_goal: 200,
  fat_goal: 65,
  fiber_goal: 32,
  target_weight_lbs: null
};

const foodLog: FoodLogSummary = {
  date: '2026-04-01',
  entries: [],
  totals: {
    calories: 1685,
    macros: { protein: 118, carbs: 156, fat: 54 }
  }
};

const exerciseEntries: ExerciseEntry[] = [
  {
    id: 'exercise-1',
    title: 'Walk',
    duration_minutes: 30,
    calories_burned: 180,
    logged_on: '2026-04-01',
    logged_at: '07:00',
    intensity: 'Moderate'
  },
  {
    id: 'exercise-2',
    title: 'Lift',
    duration_minutes: 45,
    calories_burned: 250,
    logged_on: '2026-04-01',
    logged_at: '17:00',
    intensity: 'High'
  }
];

describe('daily home helpers', () => {
  it('builds today target and progress summary from goal, profile, log, and exercise', () => {
    expect(
      buildDailyTargetSummary({
        goal,
        profile,
        foodLog,
        exerciseEntries
      })
    ).toEqual({
      calorieTarget: 2200,
      intakeCalories: 1685,
      exerciseCalories: 430,
      netCalories: 1255,
      // 75% of 430 = 322.5, so the allowance is 2,522.5, shown as 2,520.
      workoutCaloriesAdded: 320,
      allowanceCalories: 2520,
      remainingCalories: 835,
      macroTargets: { protein: 160, carbs: 200, fat: 65 },
      macroAllowance: { protein: 160, carbs: 269, fat: 70 },
      macroPercentages: { protein: 32, carbs: 40, fat: 29 },
      fiberTarget: 32
    });
  });

  it('adds a share of logged workout calories to the allowance, rounded to 10', () => {
    expect(dailyAllowance(2240, 412, 75)).toEqual({ allowance: 2550, workoutCaloriesAdded: 310 });
    expect(dailyAllowance(2240, 412, 100)).toEqual({ allowance: 2650, workoutCaloriesAdded: 410 });
    expect(dailyAllowance(2240, 412, 50)).toEqual({ allowance: 2450, workoutCaloriesAdded: 210 });
    expect(dailyAllowance(2240, 412, 0)).toEqual({ allowance: 2240, workoutCaloriesAdded: 0 });
    expect(dailyAllowance(2240, 0, 75)).toEqual({ allowance: 2240, workoutCaloriesAdded: 0 });
    expect(dailyAllowance(2240, -50, 75)).toEqual({ allowance: 2240, workoutCaloriesAdded: 0 });
    // A target that isn't a multiple of 10 (custom goals, older targets) is never nudged.
    expect(dailyAllowance(2237, 0, 75)).toEqual({ allowance: 2237, workoutCaloriesAdded: 0 });
    expect(dailyAllowance(2237, 4, 75)).toEqual({ allowance: 2237, workoutCaloriesAdded: 0 });
    expect(dailyAllowance(2237, 412, 75)).toEqual({ allowance: 2547, workoutCaloriesAdded: 310 });
    // No target yet: no allowance, whatever was logged.
    expect(dailyAllowance(0, 550, 75)).toEqual({ allowance: 0, workoutCaloriesAdded: 0 });
  });

  it('uses the chosen share for the day summary', () => {
    const summary = buildDailyTargetSummary({ goal, profile, foodLog, exerciseEntries, workoutCaloriesShare: 0 });
    expect(summary.allowanceCalories).toBe(2200);
    expect(summary.remainingCalories).toBe(2200 - 1685);
  });

  it('summarizes exercise totals for the day', () => {
    expect(buildDailyExerciseSummary(exerciseEntries)).toEqual({
      sessionCount: 2,
      totalMinutes: 75,
      totalCalories: 430
    });
  });
});
