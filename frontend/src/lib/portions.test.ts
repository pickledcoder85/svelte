import { describe, expect, it } from 'vitest';

import { countLabel, countText, ingredientLine } from './portions';

describe('counted foods', () => {
  it('writes counts with halves', () => {
    expect(countText(2)).toBe('2');
    expect(countText(0.5)).toBe('½');
    expect(countText(1.5)).toBe('1½');
  });

  it('labels counted and weighed ingredients', () => {
    const eggs = { name: 'eggs', grams: 100, count: 2, unit: 'large egg', unit_plural: 'large eggs' };
    expect(countLabel(eggs)).toBe('2 large eggs');
    expect(countLabel({ ...eggs, count: 1 })).toBe('1 large egg');
    expect(ingredientLine(eggs)).toBe('2 large eggs (100 g) · eggs');
    expect(ingredientLine({ name: 'chicken thigh', grams: 152.4 })).toBe('152 g chicken thigh');
    expect(countLabel({ count: null, unit: null })).toBeNull();
  });
});
