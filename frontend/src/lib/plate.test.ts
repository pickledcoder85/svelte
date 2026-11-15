import { describe, expect, it } from 'vitest';

import type { PlateItem } from '../types';
import { itemNutrition, plateTotal, stepGrams } from './plate';

const chicken: PlateItem = {
  name: 'grilled chicken breast',
  estimated_grams: 150,
  food: {
    id: 'usda-1', name: 'Chicken breast, roasted', brand: null, calories: 165, serving_size: 100, serving_unit: 'g',
    serving_grams: 100, macros: { protein: 31, carbs: 0, fat: 3.6 }, source: 'USDA', favorite: false
  },
  estimate: { calories: 250, protein: 45, carbs: 0, fat: 6 }
};
const rice: PlateItem = { name: 'white rice', estimated_grams: 180, food: null, estimate: { calories: 234, protein: 4, carbs: 50, fat: 1 } };

describe('plate items', () => {
  it('uses USDA per-gram nutrition when matched', () => {
    expect(itemNutrition(chicken, 150)).toEqual({ calories: 248, macros: { protein: 47, carbs: 0, fat: 5 }, fromUsda: true });
  });

  it('scales the estimate when there is no match', () => {
    expect(itemNutrition(rice, 90)).toEqual({ calories: 117, macros: { protein: 2, carbs: 25, fat: 1 }, fromUsda: false });
  });

  it('steps grams by ten, within limits, and totals the plate', () => {
    expect(stepGrams(150, 1)).toBe(160);
    expect(stepGrams(10, -1)).toBe(10);
    expect(stepGrams(155, -1)).toBe(150);
    expect(plateTotal([{ item: chicken, grams: 150 }, { item: rice, grams: 180 }])).toBe(248 + 234);
  });
});
