import { describe, expect, it } from 'vitest';
import { demoMeal, demoRecipe } from '../mock-data';
import { mealTotals, progressPercent, scaleMealIngredients, scaleMacros } from './nutrition';

describe('nutrition utilities', () => {
  it('calculates meal totals and per-serving values', () => {
    const totals = mealTotals(demoMeal);

    expect(totals.calories).toBe(568);
    expect(totals.per_serving_calories).toBe(284);
    expect(totals.per_serving_macros).toEqual({
      protein: 22.7,
      carbs: 42.1,
      fat: 3.6
    });
  });

  it('scales macros', () => {
    expect(scaleMacros({ protein: 10, carbs: 20, fat: 30 }, 1.5)).toEqual({
      protein: 15,
      carbs: 30,
      fat: 45
    });
  });

  it('scales meal ingredients', () => {
    const scaled = scaleMealIngredients(demoMeal, 2);

    expect(scaled.serving_count).toBe(4);
    expect(scaled.ingredients[0].grams).toBe(160);
  });

  it('caps progress at 100 percent', () => {
    expect(progressPercent(10360, 14800)).toBe(70);
    expect(progressPercent(500, 0)).toBe(0);
  });

  it('keeps recipe metadata available for scaling previews', () => {
    expect(demoRecipe.title).toContain('Overnight');
  });
});
