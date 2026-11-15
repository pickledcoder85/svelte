import { describe, expect, it } from 'vitest';

import { formatAllergySelection, missingOtherAllergy, parseAllergySelection } from './allergies';

describe('allergies', () => {
  it('round-trips choices and Other text without false matches', () => {
    expect(parseAllergySelection('Other: eggplant')).toEqual({ selected: ['other'], otherText: 'eggplant' });
    expect(parseAllergySelection('Wheat; Other: buckwheat')).toEqual({ selected: ['wheat', 'other'], otherText: 'buckwheat' });
    expect(parseAllergySelection('Peanut; Tree nuts')).toEqual({ selected: ['peanut', 'tree_nuts'], otherText: '' });
    for (const note of ['Other: eggplant', 'Wheat; Other: buckwheat', 'Milk; Egg; Other: almond milk']) {
      const parsed = parseAllergySelection(note);
      expect(formatAllergySelection(parsed.selected, parsed.otherText)).toBe(note);
    }
  });

  it('keeps older free text as Other instead of guessing', () => {
    expect(parseAllergySelection('no peanuts please')).toEqual({ selected: ['other'], otherText: 'no peanuts please' });
  });

  it('treats an empty note as None', () => {
    expect(parseAllergySelection(null)).toEqual({ selected: ['none'], otherText: '' });
    expect(parseAllergySelection('  ')).toEqual({ selected: ['none'], otherText: '' });
    expect(formatAllergySelection(['none'], '')).toBeNull();
  });

  it('flags Other with nothing typed', () => {
    expect(missingOtherAllergy(['other'], '  ')).toBe(true);
    expect(missingOtherAllergy(['other'], 'soy')).toBe(false);
    expect(missingOtherAllergy(['milk'], '')).toBe(false);
  });
});
