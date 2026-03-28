import { describe, expect, it } from 'vitest';
import { demoFoodStrip, demoMeal, demoRecipeImports } from './mock-data';

describe('frontend demo data', () => {
  it('keeps the seed meal aligned to two servings', () => {
    expect(demoMeal.serving_count).toBe(2);
    expect(demoMeal.ingredients).toHaveLength(3);
  });

  it('exposes recipe import sources for the recipe screen', () => {
    expect(demoRecipeImports.sources).toHaveLength(3);
    expect(demoFoodStrip.mealTemplate.servings).toBe(2);
  });
});
