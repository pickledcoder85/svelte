import { describe, expect, it } from 'vitest';

import type { WeightEntry } from '../types';
import { translatorFor } from '../i18n/dictionaries';
import { displayWeight, initialWeighInIndexes, weighInColumns, weighInLbs, weighInSummary } from './weigh-in';

const entry = (day: string, lbs: number): WeightEntry => ({ id: day, user_id: 'u', recorded_at: day, weight_lbs: lbs });

const en = translatorFor('en');
const es = translatorFor('es');

describe('weigh-in', () => {
  it('starts at the last weight, to the tenth', () => {
    const idx = initialWeighInIndexes('imperial', 181.4);
    const cols = weighInColumns('imperial');
    expect([cols[0].values[idx[0]], cols[1].values[idx[1]]]).toEqual([181, 4]);
    expect(weighInLbs('imperial', idx)).toBe(181.4);
  });

  it('works in kilograms and saves pounds', () => {
    const idx = initialWeighInIndexes('metric', 181.4); // 82.3 kg
    const cols = weighInColumns('metric');
    expect([cols[0].values[idx[0]], cols[1].values[idx[1]]]).toEqual([82, 3]);
    expect(weighInLbs('metric', idx)).toBeCloseTo(181.4, 0);
    expect(displayWeight(181.4, 'metric')).toBe(82.3);
  });

  it('starts at a typical weight with no history', () => {
    const cols = weighInColumns('imperial');
    const idx = initialWeighInIndexes('imperial', null);
    expect(cols[0].values[idx[0]]).toBe(165);
  });

  it('summarises the last weigh-in and the week', () => {
    expect(weighInSummary([], 'imperial', '2026-11-15', en)).toBeNull();
    const entries = [entry('2026-11-07', 182.6), entry('2026-11-14', 181.4)];
    expect(weighInSummary(entries, 'imperial', '2026-11-15', en)).toBe('Last: 181.4 lb on Nov 14 · −1.2 lb in a week');
    expect(weighInSummary(entries, 'imperial', '2026-11-15', es)).toBe('Último: 181,4 lb el 14 de nov · −1,2 lb en una semana');
    expect(weighInSummary([entry('2026-11-15', 181)], 'imperial', '2026-11-15', en)).toBe('Last: 181 lb today');
  });
});
