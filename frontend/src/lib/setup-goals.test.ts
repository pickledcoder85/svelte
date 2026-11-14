import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PACE,
  energyBarWidths,
  estimateGoalDate,
  findPreviewOption,
  formatApproximateDate,
  formatWeeklyRate,
  goalLabel,
  isPaceForGoal,
  paceLabel,
  type TargetPreview
} from './setup-goals';

const preview: TargetPreview = {
  bmr_calories: 1887,
  maintenance_calories: 2736,
  minimum_calorie_target: 1200,
  options: [
    { goal_type: 'lose', goal_pace: 'recommended', calorie_target: 2236, daily_adjustment: -500, limited_by_minimum: false, weekly_change_lbs: -1, protein_target_g: 163.3, carbs_target_g: 256, fat_target_g: 62.1 },
    { goal_type: 'maintain', goal_pace: 'steady', calorie_target: 2736, daily_adjustment: 0, limited_by_minimum: false, weekly_change_lbs: 0, protein_target_g: 145.1, carbs_target_g: 330, fat_target_g: 91.2 },
    { goal_type: 'maintain', goal_pace: 'build_muscle', calorie_target: 2736, daily_adjustment: 0, limited_by_minimum: false, weekly_change_lbs: 0, protein_target_g: 181.4, carbs_target_g: 297, fat_target_g: 82.1 }
  ]
};

describe('setup goals', () => {
  it('uses plain-language labels', () => {
    expect(goalLabel('lose')).toBe('Lose weight');
    expect(goalLabel('maintain')).toBe('Stay where I am');
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

  it('scales the energy bars to the larger value', () => {
    expect(energyBarWidths(1887, 2736)).toEqual({ rest: 69, active: 100 });
    expect(energyBarWidths(0, 0)).toEqual({ rest: 0, active: 0 });
  });
});
