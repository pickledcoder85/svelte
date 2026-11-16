import { describe, expect, it } from 'vitest';

import { blockBudgets, DEFAULT_SPLITS, isValidSplit, moveHandle, SPLIT_PRESETS, type MealsPerDay } from './meal-split';

describe('meal split', () => {
  it('has valid defaults and presets', () => {
    for (const count of [3, 4, 5] as MealsPerDay[]) {
      expect(isValidSplit(count, DEFAULT_SPLITS[count])).toBe(true);
      for (const preset of SPLIT_PRESETS[count]) {
        expect(isValidSplit(count, preset.split)).toBe(true);
      }
    }
    expect(isValidSplit(3, [30, 30, 30])).toBe(false);
    expect(isValidSplit(5, [20, 0, 40, 10, 30])).toBe(false);
  });

  it('moves a handle between two neighbours only, snapped to 5', () => {
    // Breakfast | Lunch boundary from 25 to 33 → 35.
    expect(moveHandle(3, [25, 35, 40], 0, 33)).toEqual([35, 25, 40]);
    // Lunch | Dinner boundary to 70: lunch 45, dinner 30.
    expect(moveHandle(3, [25, 35, 40], 1, 70)).toEqual([25, 45, 30]);
  });

  it('keeps each block at its minimum', () => {
    expect(moveHandle(3, [25, 35, 40], 0, 0)).toEqual([10, 50, 40]);
    expect(moveHandle(3, [25, 35, 40], 0, 100)).toEqual([50, 10, 40]);
    // A snack can go down to 5.
    expect(moveHandle(5, [20, 10, 30, 10, 30], 0, 30)).toEqual([25, 5, 30, 10, 30]);
    expect(moveHandle(3, [25, 35, 40], 5, 50)).toEqual([25, 35, 40]);
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
