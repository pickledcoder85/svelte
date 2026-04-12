import { describe, expect, it } from 'vitest';

import type { ExerciseEntry, FoodLogSummary, MealPlanDay, UserGoal, UserProfile } from '../types';
import {
  buildDailyExerciseSummary,
  buildDailyMealPlanSummary,
  buildDailyTargetSummary
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

const mealPlanDay: MealPlanDay = {
  id: 'plan-1',
  label: 'Wed',
  focus: 'Recovery day',
  plan_date: '2026-04-01',
  slots: [
    { id: 'breakfast', meal_label: 'Breakfast', title: 'Egg scramble', calories: 410, prep_status: 'Needs prep' },
    { id: 'lunch', meal_label: 'Lunch', title: 'Chicken salad', calories: 520, prep_status: 'Prepped' },
    { id: 'dinner', meal_label: 'Dinner', title: 'Protein pasta', calories: 690, prep_status: 'Flexible' }
  ]
};

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
      remainingCalories: 945,
      macroTargets: { protein: 160, carbs: 200, fat: 65 },
      macroPercentages: { protein: 32, carbs: 40, fat: 29 },
      fiberTarget: 32
    });
  });

  it('summarizes today meal plan and next remaining meal', () => {
    expect(buildDailyMealPlanSummary(mealPlanDay, { breakfast: '2026-04-01T07:30:00' })).toEqual({
      hasPlan: true,
      dayLabel: 'Wed',
      focus: 'Recovery day',
      plannedMeals: 3,
      completedMeals: 1,
      plannedCalories: 1620,
      plannedMacros: { protein: 0, carbs: 0, fat: 0 },
      nextMealTitle: 'Chicken salad'
    });
  });

  it('summarizes exercise totals for the day', () => {
    expect(buildDailyExerciseSummary(exerciseEntries)).toEqual({
      sessionCount: 2,
      totalMinutes: 75,
      totalCalories: 430
    });
  });
});
