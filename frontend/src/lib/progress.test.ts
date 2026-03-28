import { describe, expect, it } from 'vitest';

import { demoExerciseEntries, demoFoodLog, demoProfileProgress, demoWeightEntries } from '../mock-data';
import { buildTrackerTotals, buildWeightProgressSummary } from './progress';

describe('progress helpers', () => {
  it('summarizes tracker totals from food and exercise data', () => {
    const summary = buildTrackerTotals(demoFoodLog, demoExerciseEntries);

    expect(summary.foodCalories).toBeCloseTo(demoFoodLog.totals.calories, 1);
    expect(summary.exerciseCalories).toBe(550);
    expect(summary.exerciseMinutes).toBe(87);
    expect(summary.netCalories).toBe(0);
    expect(summary.foodEntryCount).toBe(3);
    expect(summary.exerciseEntryCount).toBe(2);
  });

  it('summarizes weight progress from live profile data', () => {
    const summary = buildWeightProgressSummary(demoProfileProgress, demoWeightEntries);

    expect(summary.currentWeightLbs).toBe(179.4);
    expect(summary.startWeightLbs).toBe(181.2);
    expect(summary.targetWeightLbs).toBe(175);
    expect(summary.weeklyWeightChange).toBe(-0.8);
    expect(summary.weightEntryCount).toBe(4);
    expect(summary.latestRecordedAt).toBe('2026-03-28');
  });
});
