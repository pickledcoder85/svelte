import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PACE,
  estimateGoalDate,
  findPreviewOption,
  formatApproximateDate,
  formatWeeklyRate,
  goalLabel,
  isPaceForGoal,
  needsFloorWarning,
  withCalorieFloor,
  paceLabel,
  type TargetPreview
} from './setup-goals';

const preview: TargetPreview = {
  bmr_calories: 1887,
  maintenance_calories: 2736,
  recommended_minimum_calories: 1500,
  options: [
    { goal_type: 'lose', goal_pace: 'recommended', calorie_target: 2236, daily_adjustment: -500, weekly_change_lbs: -1, protein_target_g: 163.3, carbs_target_g: 256, fat_target_g: 62.1, below_recommended_minimum: false, floor_calorie_target: 2236, floor_weekly_change_lbs: -1, floor_protein_target_g: 163.3, floor_carbs_target_g: 256, floor_fat_target_g: 62.1 },
    { goal_type: 'maintain', goal_pace: 'steady', calorie_target: 2736, daily_adjustment: 0, weekly_change_lbs: 0, protein_target_g: 145.1, carbs_target_g: 330, fat_target_g: 91.2, below_recommended_minimum: false, floor_calorie_target: 2736, floor_weekly_change_lbs: 0, floor_protein_target_g: 145.1, floor_carbs_target_g: 330, floor_fat_target_g: 91.2 },
    { goal_type: 'maintain', goal_pace: 'build_muscle', calorie_target: 2736, daily_adjustment: 0, weekly_change_lbs: 0, protein_target_g: 181.4, carbs_target_g: 297, fat_target_g: 82.1, below_recommended_minimum: false, floor_calorie_target: 2736, floor_weekly_change_lbs: 0, floor_protein_target_g: 181.4, floor_carbs_target_g: 297, floor_fat_target_g: 82.1 }
  ]
};

describe('setup goals', () => {
  it('uses plain-language labels', () => {
    expect(goalLabel('lose')).toBe('Lose Weight');
    expect(goalLabel('maintain')).toBe('Maintain Weight');
    expect(paceLabel('lose', 'extreme')).toBe('Fast');
    expect(paceLabel('maintain', 'build_muscle')).toBe('Build muscle');
    expect(paceLabel('gain', null)).toBe('Lean');
  });

  it('keeps paces and focuses with their own goal', () => {
    expect(isPaceForGoal('lose', 'recommended')).toBe(true);
    expect(isPaceForGoal('lose', 'lean')).toBe(false);
    expect(isPaceForGoal('maintain', 'fuel_training')).toBe(true);
    expect(isPaceForGoal('maintain', null)).toBe(false);
    expect(DEFAULT_PACE).toEqual({ lose: 'recommended', maintain: 'steady', gain: 'lean' });
  });

  it('finds the preview for a goal, falling back to its default pace', () => {
    expect(findPreviewOption(preview, 'lose', 'recommended')?.calorie_target).toBe(2236);
    expect(findPreviewOption(preview, 'maintain', 'lean')?.goal_pace).toBe('steady');
    expect(findPreviewOption(null, 'lose', 'recommended')).toBeNull();
  });

  it('formats weekly rates in the chosen units', () => {
    expect(formatWeeklyRate(-1, 'imperial')).toBe('about 1 lb a week');
    expect(formatWeeklyRate(-1, 'metric')).toBe('about 0.45 kg a week');
    expect(formatWeeklyRate(0.4, 'imperial')).toBe('about 0.4 lb a week');
    expect(formatWeeklyRate(0.4, 'metric')).toBe('about 0.2 kg a week');
    expect(formatWeeklyRate(0, 'imperial')).toBe('');
  });

  it('estimates when a goal weight is reached, only in the right direction', () => {
    const today = new Date(2026, 10, 14);
    expect(estimateGoalDate(200, 188, -1, today)).toEqual({ weeks: 12, date: new Date(2027, 1, 6) });
    expect(estimateGoalDate(200, 210, -1, today)).toBeNull();
    expect(estimateGoalDate(150, 155, 0.4, today)?.weeks).toBe(13);
    expect(estimateGoalDate(150, 150, 0.4, today)).toBeNull();
    expect(formatApproximateDate(new Date(2027, 1, 6))).toBe('early-February 2027');
    expect(formatApproximateDate(new Date(2027, 1, 15))).toBe('mid-February 2027');
  });

  it('applies the recommended minimum only when the floor is on', () => {
    const fast = {
      ...preview.options[0],
      goal_pace: 'extreme' as const,
      calorie_target: 1052,
      daily_adjustment: -1000,
      weekly_change_lbs: -2,
      below_recommended_minimum: true,
      floor_calorie_target: 1500,
      floor_weekly_change_lbs: -1.1,
      floor_protein_target_g: 160,
      floor_carbs_target_g: 120,
      floor_fat_target_g: 42
    };
    expect(withCalorieFloor(fast, 'off')?.calorie_target).toBe(1052);
    const floored = withCalorieFloor(fast, 'recommended');
    expect(floored?.calorie_target).toBe(1500);
    expect(floored?.daily_adjustment).toBe(-552);
    expect(floored?.weekly_change_lbs).toBe(-1.1);
    expect(withCalorieFloor(null, 'recommended')).toBeNull();

    expect(needsFloorWarning(fast, 'recommended', false)).toBe(true);
    expect(needsFloorWarning(fast, 'recommended', true)).toBe(false);
    expect(needsFloorWarning(fast, 'off', false)).toBe(false);
    expect(needsFloorWarning(preview.options[0], 'recommended', false)).toBe(false);
  });
});
