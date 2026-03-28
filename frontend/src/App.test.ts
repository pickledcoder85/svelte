import { describe, expect, it } from 'vitest';
import { demoMeal, demoRangeSeries, demoRecipeImports } from './mock-data';

describe('frontend demo data', () => {
  it('keeps the seed meal aligned to two servings', () => {
    expect(demoMeal.serving_count).toBe(2);
    expect(demoMeal.ingredients).toHaveLength(3);
  });

  it('exposes recipe import sources and dashboard ranges', () => {
    expect(demoRecipeImports.sources).toHaveLength(3);
    expect(demoRangeSeries).toHaveLength(4);
    expect(demoRangeSeries[0].range).toBe('1D');
  });
});
