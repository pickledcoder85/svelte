import { describe, expect, it } from 'vitest';

import { hapticTap, MIN_TAP_INTERVAL_MS, shouldTap } from './haptics';

describe('haptics', () => {
  it('limits taps to one per short interval', () => {
    expect(shouldTap(1000, 0)).toBe(true);
    expect(shouldTap(1000 + MIN_TAP_INTERVAL_MS - 1, 1000)).toBe(false);
    expect(shouldTap(1000 + MIN_TAP_INTERVAL_MS, 1000)).toBe(true);
  });

  it('does nothing without a page (tests, native)', () => {
    expect(() => hapticTap(5000)).not.toThrow();
  });
});
