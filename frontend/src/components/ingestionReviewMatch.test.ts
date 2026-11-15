import { describe, expect, it } from 'vitest';

import { applyAlternative, buildAcceptedNutritionPayload, buildNutritionDraft, describeAlternative, matchInfo } from './ingestionReviewHelpers';

const scan = {
  package_text: 'QUAKER OATS',
  product_name: 'Old Fashioned Oats',
  brand_name: 'Quaker',
  serving_size: '1/2 cup (40 g)',
  calories: 150,
  macros: { protein: 5, carbs: 27, fat: 3 },
  serving_grams: 40,
  data_source: 'open_food_facts',
  nutrition_from: 'match',
  nutrition_found: true,
  matched_food_id: 'off-1',
  match_note: 'Matched to Old Fashioned Oats from Open Food Facts. Check it.',
  alternatives: [
    { product_name: 'Old Fashioned Oats', brand_name: 'Great Value', calories: 140, macros: { protein: 4, carbs: 26, fat: 2 }, serving_size: '40 g', data_source: 'usda', food_id: 'usda-9' }
  ]
};

describe('package matches on the review screen', () => {
  it('reads the match, a miss, and ordinary scans', () => {
    expect(matchInfo(scan)).toMatchObject({ kind: 'match', note: scan.match_note });
    expect(matchInfo({ nutrition_found: false })).toEqual({ kind: 'missing', note: null, alternatives: [] });
    expect(matchInfo({ calories: 100 }).kind).toBeNull();
    expect(describeAlternative(scan.alternatives[0])).toBe('Great Value Old Fashioned Oats · 140 kcal');
  });

  it('switches to an alternative and keeps the old match to switch back', () => {
    const next = applyAlternative(scan, 0) as Record<string, any>;
    expect(next.brand_name).toBe('Great Value');
    expect(next.calories).toBe(140);
    expect(next.matched_food_id).toBe('usda-9');
    expect(next.match_note).toMatch(/from USDA/);
    expect(next.alternatives[0]).toMatchObject({ brand_name: 'Quaker', calories: 150, food_id: 'off-1' });
    expect(buildNutritionDraft(next).calories).toBe('140');
    // The saved payload carries the matched food so the server can reuse it.
    expect(buildAcceptedNutritionPayload(buildNutritionDraft(next), next).structured_json).toMatchObject({ matched_food_id: 'usda-9' });
    expect(applyAlternative(scan, 5)).toBe(scan);
  });

  it('switching back to a food-bank match names your food bank', () => {
    const bankFirst = { ...scan, data_source: null, matched_food_id: 'food-label-abc' };
    const back = applyAlternative(applyAlternative(bankFirst, 0), 0) as Record<string, any>;
    expect(back.matched_food_id).toBe('food-label-abc');
    expect(back.match_note).toMatch(/from your food bank/);
  });
});
