import { describe, expect, it } from 'vitest';

import { fatShareFor, macroAllowance } from './macro-allowance';

// The same examples as tests/test_macro_allowance.py, so both sides agree.
describe('macro allowance', () => {
  it('keeps protein, gives fat its share of the allowance, and carbs the rest', () => {
    expect(macroAllowance({ protein: 150, carbs: 102, fat: 42 }, 1500, 1800, 0.25)).toEqual({ protein: 150, carbs: 159, fat: 50 });
  });

  it('keeps a fat floor that is already above the share', () => {
    expect(macroAllowance({ protein: 150, carbs: 60, fat: 60 }, 1500, 1800, 0.25)).toEqual({ protein: 150, carbs: 135, fat: 60 });
  });

  it('grows a custom low-fat goal by the extra only', () => {
    expect(macroAllowance({ protein: 150, carbs: 275, fat: 33 }, 2000, 2100, 0.25)).toEqual({ protein: 150, carbs: 294, fat: 36 });
  });

  it('leaves days without workout calories alone', () => {
    const base = { protein: 150, carbs: 102, fat: 42 };
    expect(macroAllowance(base, 1500, 1500, 0.25)).toBe(base);
    expect(macroAllowance(base, 0, 1800, 0.25)).toBe(base);
  });

  it('uses the goal’s fat share', () => {
    expect(fatShareFor('lose', 'recommended')).toBe(0.25);
    expect(fatShareFor('maintain', 'fuel_training')).toBe(0.22);
    expect(fatShareFor('maintain', null)).toBe(0.3);
    expect(fatShareFor(null, null)).toBe(0.25);
  });
});
