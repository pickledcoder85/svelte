import { describe, expect, it } from 'vitest';

import type { FoodLogEntry } from '../types';
import { scaleEntryToGrams } from './entry-edits';

const oats: FoodLogEntry = {
  id: 'entry-1',
  food_id: 'food-oats',
  food_name: 'Rolled oats',
  brand: null,
  source: 'CUSTOM',
  grams: 80,
  calories: 311.2,
  macros: { protein: 13.5, carbs: 53, fat: 5.5 },
  logged_at: '2026-04-01T08:00:00Z',
  servings: 1
};

describe('entry edits', () => {
  it('scales calories and macros with the new amount', () => {
    expect(scaleEntryToGrams(oats, 40)).toEqual({
      grams: 40,
      servings: 0.5,
      calories: 155.6,
      protein: 6.75,
      carbs: 26.5,
      fat: 2.75
    });
    expect(scaleEntryToGrams(oats, 160)?.calories).toBe(622.4);
  });

  it('does not drift when an amount is shrunk and restored', () => {
    const small: FoodLogEntry = { ...oats, grams: 100, calories: 7, macros: { protein: 0.4, carbs: 1.4, fat: 0.1 }, servings: 1 };
    const shrunk = scaleEntryToGrams(small, 5)!;
    const restored = scaleEntryToGrams(
      { ...small, grams: shrunk.grams, servings: shrunk.servings, calories: shrunk.calories, macros: shrunk },
      100
    )!;
    expect(restored).toEqual({ grams: 100, servings: 1, calories: 7, protein: 0.4, carbs: 1.4, fat: 0.1 });
  });

  it('rejects amounts that cannot be scaled', () => {
    expect(scaleEntryToGrams(oats, 0.0004)).toBeNull();
    expect(scaleEntryToGrams(oats, 0)).toBeNull();
    expect(scaleEntryToGrams(oats, Number.NaN)).toBeNull();
    expect(scaleEntryToGrams({ ...oats, grams: 0 }, 50)).toBeNull();
  });

});
