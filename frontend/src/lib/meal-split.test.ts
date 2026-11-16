import { describe, expect, it } from 'vitest';

import { blockBudgets, DEFAULT_SPLITS, isValidSplit, MEAL_STYLES, styleForSplit, type MealsPerDay } from './meal-split';

describe('meal split', () => {
  it('has valid defaults and presets', () => {
    for (const count of [3, 4, 5] as MealsPerDay[]) {
      expect(isValidSplit(count, DEFAULT_SPLITS[count])).toBe(true);
      for (const style of MEAL_STYLES) {
        expect(isValidSplit(count, style.splits[count])).toBe(true);
      }
      expect(styleForSplit(count, DEFAULT_SPLITS[count])).toBe('balanced');
    }
    expect(isValidSplit(3, [30, 30, 30])).toBe(false);
    expect(styleForSplit(3, [40, 35, 25])).toBe('taper-down');
    expect(styleForSplit(5, [15, 10, 25, 15, 35])).toBe('build-up');
    expect(styleForSplit(3, [35, 30, 35])).toBeNull(); // fine-tuned: custom
    expect(isValidSplit(5, [20, 0, 40, 10, 30])).toBe(false);
  });

  it('turns the split into calories and macros per block', () => {
    const blocks = blockBudgets(3, [25, 35, 40], 1500, { protein: 120, carbs: 118, fat: 50 });
    expect(blocks.map((b) => [b.label, b.calories, b.macros.protein, b.macros.carbs, b.macros.fat])).toEqual([
      ['Breakfast', 380, 30, 30, 13],
      ['Lunch', 520, 42, 41, 17],
      ['Dinner', 600, 48, 47, 20]
    ]);
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    expect(sum(blocks.map((b) => b.calories))).toBe(1500);
    expect(sum(blocks.map((b) => b.macros.fat))).toBe(50);
    // The review's case: 1,990 kcal no longer shows blocks totalling 2,000.
    expect(sum(blockBudgets(3, [25, 35, 40], 1990, { protein: 0, carbs: 0, fat: 0 }).map((b) => b.calories))).toBe(1990);
    expect(blockBudgets(5, [20, 10, 30, 10, 30], 1500, { protein: 0, carbs: 0, fat: 0 }).filter((b) => b.snack).map((b) => b.calories)).toEqual([150, 150]);
  });
});
