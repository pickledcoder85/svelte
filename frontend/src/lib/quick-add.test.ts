import { describe, expect, it } from 'vitest';

import { formatServings, logPayload, previewNutrition, servingsFor, stepServings } from './quick-add';

const bar = { calories: 190, macros: { protein: 4, carbs: 29, fat: 7 }, serving_grams: 40 };

describe('quick add amount', () => {
  it('steps by half servings between 0.5 and 20', () => {
    expect(stepServings(1, 1)).toBe(1.5);
    expect(stepServings(0.5, -1)).toBe(0.5);
    expect(stepServings(20, 1)).toBe(20);
  });

  it('previews servings and grams', () => {
    expect(previewNutrition(bar, { mode: 'servings', servings: 2 })).toEqual({
      calories: 380,
      macros: { protein: 8, carbs: 58, fat: 14 }
    });
    expect(previewNutrition(bar, { mode: 'grams', grams: 60 })?.calories).toBe(285);
    expect(servingsFor({ serving_grams: null }, { mode: 'grams', grams: 60 })).toBeNull();
    expect(servingsFor(bar, { mode: 'grams', grams: 0 })).toBeNull();
  });

  it('builds the log request and labels servings', () => {
    expect(logPayload('f', '2026-11-15', { mode: 'servings', servings: 1.5 })).toEqual({
      food_id: 'f',
      log_date: '2026-11-15',
      servings: 1.5
    });
    expect(logPayload('f', '2026-11-15', { mode: 'grams', grams: 55 })).toEqual({ food_id: 'f', log_date: '2026-11-15', grams: 55 });
    expect(formatServings(1)).toBe('1 serving');
    expect(formatServings(1.5)).toBe('1.5 servings');
  });
});
