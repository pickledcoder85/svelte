import { describe, expect, it } from 'vitest';

import { macroRing } from './macro-ring';

describe('macro ring', () => {
  it('fills the first lap up to the target', () => {
    expect(macroRing(86, 120)).toEqual({ firstLap: 86 / 120, overLap: 0, over: false, footer: '72%' });
    expect(macroRing(120, 120)).toMatchObject({ firstLap: 1, over: false, footer: '100%' });
  });

  it('starts an amber second lap past the target and says by how much', () => {
    const ring = macroRing(142, 118);
    expect(ring.firstLap).toBe(1);
    expect(ring.overLap).toBeCloseTo(24 / 118);
    expect(ring).toMatchObject({ over: true, footer: '+24 g' });
    expect(macroRing(400, 100).overLap).toBe(1); // at most one extra lap
  });

  it('has nothing to show without a target', () => {
    expect(macroRing(50, 0)).toEqual({ firstLap: 0, overLap: 0, over: false, footer: '—' });
  });
});
