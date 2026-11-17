import { describe, expect, it } from 'vitest';

import type { ExerciseEntry, FoodLogSummary, WeightEntry } from '../types';
import {
  averageMacros,
  buildDaySeries,
  calorieSummary,
  historyDayLabel,
  rangeStart,
  weeklyRate,
  weightTrend
} from './trends';

const log = (date: string, calories: number, protein = 0): FoodLogSummary => ({
  log_id: date,
  date,
  entries: [{ id: date, food_id: 'f', food_name: 'x', brand: null, source: 'CUSTOM', grams: 0, calories, macros: { protein, carbs: 0, fat: 0 }, logged_at: '' }],
  totals: { calories, macros: { protein, carbs: 0, fat: 0 } }
});
const ride: ExerciseEntry = { id: 'r', title: 'Ride', duration_minutes: 60, calories_burned: 600, logged_on: '2026-11-14', logged_at: '', intensity: 'High' };
const weigh = (day: string, lbs: number): WeightEntry => ({ id: day, user_id: 'u', recorded_at: day, weight_lbs: lbs });

describe('trends', () => {
  it('builds one point per day with the allowance', () => {
    const days = buildDaySeries({
      start: rangeStart('2026-11-15', '1W'),
      today: '2026-11-15',
      logs: [log('2026-11-14', 1800, 120), log('2026-11-15', 900)],
      exercise: [ride],
      calorieTarget: 1500,
      sharePercent: 75
    });
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-11-09');
    expect(days[5]).toMatchObject({ date: '2026-11-14', eaten: 1800, logged: true, workoutCalories: 600, baseTarget: 1500, allowance: 1950 });
    expect(days[4]).toMatchObject({ logged: false, eaten: 0, allowance: 1500 });

    const summary = calorieSummary(days);
    expect(summary).toEqual({ loggedDays: 2, averageEaten: 1350, averageAllowance: 1725, daysOnTarget: 1, daysOver: 0 });
    expect(averageMacros(days).protein).toBe(60);
  });

  it('smooths the weight trend and handles gaps', () => {
    const points = weightTrend([weigh('2026-11-01', 180), weigh('2026-11-02', 182), weigh('2026-11-05', 178), weigh('2026-11-05', 177)]);
    expect(points.map((p) => p.weight)).toEqual([180, 182, 177]); // the day's last weigh-in counts
    expect(points[0].trend).toBe(180);
    expect(points[1].trend).toBe(180.2); // 10% of the way
    // Three days later: 1 - 0.9^3 = 27.1% of the way from 180.2 to 177.
    expect(points[2].trend).toBe(179.3);
  });

  it('gives a weekly rate from the trend', () => {
    const entries = Array.from({ length: 15 }, (_, day) => weigh(`2026-11-${String(day + 1).padStart(2, '0')}`, 185 - day * 0.2));
    const rate = weeklyRate(weightTrend(entries));
    expect(rate).not.toBeNull();
    expect(rate!).toBeLessThan(0);
    expect(weeklyRate(weightTrend([weigh('2026-11-01', 180)]))).toBeNull();
    expect(weeklyRate(weightTrend([weigh('2026-11-01', 180), weigh('2026-11-02', 179)]))).toBeNull();
  });

  it('labels history days', () => {
    expect(historyDayLabel('2026-11-15', '2026-11-15')).toBe('Today');
    expect(historyDayLabel('2026-11-14', '2026-11-15')).toBe('Yesterday');
    expect(historyDayLabel('2026-11-10', '2026-11-15')).toBe('Tue, Nov 10');
  });
});
