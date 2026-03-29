import { describe, expect, it } from 'vitest';

import { demoRecipeCatalog } from '../mock-data';
import { filterRecipesFuzzy, sortRecipesAlphabetically } from './recipes';

describe('recipe helpers', () => {
  it('sorts recipes alphabetically by title', () => {
    const sorted = sortRecipesAlphabetically(demoRecipeCatalog);

    expect(sorted.map((recipe) => recipe.title)).toEqual([
      'Citrus Chicken Bowl',
      'Overnight Oats Base',
      'Summer Berry Parfait'
    ]);
  });

  it('filters recipes fuzzily by title', () => {
    const filtered = filterRecipesFuzzy(demoRecipeCatalog, 'parf');

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe('Summer Berry Parfait');
  });

  it('matches recipe ingredients when the title does not match directly', () => {
    const filtered = filterRecipesFuzzy(demoRecipeCatalog, 'granola');

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe('Summer Berry Parfait');
  });
});
