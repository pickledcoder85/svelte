import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import { buildCalorieBudget, formatSigned } from './calorie-budget';
import type { DailyTargetSummary } from './daily-home';

const en = translatorFor('en');
const es = translatorFor('es');

function summary(extra: Partial<DailyTargetSummary>): DailyTargetSummary {
  return {
    calorieTarget: 1500,
    intakeCalories: 1090,
    exerciseCalories: 0,
    netCalories: 0,
    workoutCaloriesAdded: 0,
    allowanceCalories: 1500,
    remainingCalories: 410,
    macroTargets: { protein: 0, carbs: 0, fat: 0 },
    macroAllowance: { protein: 0, carbs: 0, fat: 0 },
    macroPercentages: { protein: 0, carbs: 0, fat: 0 },
    fiberTarget: 0,
    ...extra
  };
}

describe('calorie budget', () => {
  it('adds workouts on top of the target and explains the target', () => {
    const budget = buildCalorieBudget({
      summary: summary({ exerciseCalories: 615, workoutCaloriesAdded: 460, allowanceCalories: 1960, remainingCalories: 870 }),
      sharePercent: 75,
      bmrCalories: 1890,
      maintenanceCalories: 2460,
      workouts: [{ id: 'r', title: 'Indoor ride', calories_burned: 615, source: 'garmin' }],
      t: en
    });
    expect(budget.headline).toBe('870 kcal left');
    expect(budget.caption).toBe('Eaten 1,090 · Workouts +460');
    expect(budget.lines.map((l) => [l.label, formatSigned(l, en)])).toEqual([
      ['Target', '1,500'],
      ['Workouts (75%)', '+460'],
      ['Allowance', '1,960'],
      ['Eaten', '−1,090'],
      ['Remaining', '870']
    ]);
    expect(budget.lines[1].detail).toBe('Indoor ride · Garmin');
    expect(budget.burn?.bars.map((b) => [b.label, b.value])).toEqual([
      ['At rest (BMR)', 1890],
      ['Daily activity', 570],
      ['Workouts (active)', 615]
    ]);
    expect(budget.burn?.pace).toBe(-960);
    expect(budget.burn?.paceLabel).toBe('Your pace (deficit)');
    expect(budget.workoutCaloriesKept).toBe(155);
    expect(budget.progress).toBeCloseTo(1090 / 1960);
  });

  it('without workouts the workout and allowance lines disappear', () => {
    const budget = buildCalorieBudget({ summary: summary({}), sharePercent: 75, workouts: [], t: en });
    expect(budget.lines.map((l) => l.key)).toEqual(['target', 'eaten', 'remaining']);
    expect(budget.caption).toBe('Eaten 1,090');
    expect(budget.burn).toBeNull(); // no BMR yet
  });

  it('says over, not a negative left', () => {
    const budget = buildCalorieBudget({
      summary: summary({ intakeCalories: 1620, remainingCalories: -120 }),
      sharePercent: 75,
      workouts: [],
      t: en
    });
    expect(budget.over).toBe(true);
    expect(budget.headline).toBe('120 kcal over');
    expect(budget.lines.at(-1)).toMatchObject({ label: 'Over', value: 120 });
    expect(budget.progress).toBe(1);
  });

  it('labels the share when workouts are off', () => {
    const budget = buildCalorieBudget({
      summary: summary({ exerciseCalories: 300 }),
      sharePercent: 0,
      workouts: [{ id: 'w', title: 'Walk', calories_burned: 300 }],
      t: en
    });
    expect(budget.lines[1]).toMatchObject({ label: 'Workouts (off)', value: 0 });
    expect(budget.workoutCaloriesKept).toBe(300);
  });

  it('no target means nothing to fill', () => {
    const budget = buildCalorieBudget({
      summary: summary({ calorieTarget: 0, allowanceCalories: 0, intakeCalories: 0, remainingCalories: 0 }),
      sharePercent: 75,
      workouts: [],
      t: en
    });
    expect(budget.progress).toBe(0);
  });

  it('speaks Spanish with Colombian number formatting', () => {
    const budget = buildCalorieBudget({
      summary: summary({ exerciseCalories: 615, workoutCaloriesAdded: 460, allowanceCalories: 1960, remainingCalories: 870 }),
      sharePercent: 75,
      bmrCalories: 1890,
      maintenanceCalories: 2460,
      workouts: [{ id: 'r', title: 'Indoor ride', calories_burned: 615, source: 'garmin' }],
      t: es
    });
    expect(budget.headline).toBe('Le quedan 870 kcal');
    expect(budget.caption).toBe('Consumido 1.090 · Entrenamientos +460');
    expect(budget.lines.map((l) => [l.label, formatSigned(l, es)])[3]).toEqual(['Consumido', '−1.090']);
    expect(budget.burn?.paceLabel).toBe('Su ritmo (déficit)');
  });
});
