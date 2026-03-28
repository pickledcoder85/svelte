import { describe, expect, it } from 'vitest';
import { demoMeal } from './mock-data';

describe('frontend demo data', () => {
  it('keeps the seed meal aligned to two servings', () => {
    expect(demoMeal.serving_count).toBe(2);
    expect(demoMeal.ingredients).toHaveLength(3);
  });
});
