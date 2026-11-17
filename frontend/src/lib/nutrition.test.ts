import { describe, expect, it } from 'vitest';
import { demoMeal } from '../mock-data';
import { mealTotals, recipeScaleLabel, scaleMealIngredients } from './nutrition';

describe('nutrition helpers', () => {
  it('calculates meal totals and per-serving nutrition', () => {
    const totals = mealTotals(demoMeal);

    expect(totals.calories).toBe(568);
    expect(totals.per_serving_calories).toBe(284);
    expect(totals.per_serving_macros).toEqual({
      protein: 22.7,
      carbs: 42.1,
      fat: 3.6
    });
  });

  it('scales ingredients', () => {
    const scaled = scaleMealIngredients(demoMeal, 1.5);
    const halfScaled = scaleMealIngredients(demoMeal, 0.5);

    expect(scaled.serving_count).toBe(3);
    expect(scaled.ingredients[0].grams).toBe(120);
    expect(halfScaled.serving_count).toBe(1);
    expect(halfScaled.ingredients[0].grams).toBe(40);
  });

  it('formats recipe scale labels', () => {
    expect(recipeScaleLabel(1.25)).toBe('1.25x');
    expect(recipeScaleLabel(1)).toBe('1.0x');
    expect(recipeScaleLabel(2)).toBe('2.0x');
  });
});
