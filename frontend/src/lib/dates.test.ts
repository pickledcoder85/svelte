import { afterEach, describe, expect, it, vi } from 'vitest';

import { addDaysToDateKey, localDateKey, localDateKeyForTimestamp, parseDateKey } from './dates';

afterEach(() => {
  vi.useRealTimers();
});

describe('local date keys', () => {
  it('uses the local calendar day, not the UTC day', () => {
    // 9:30 pm local on Apr 1 is already Apr 2 in UTC for any US time zone.
    const lateEvening = new Date(2026, 3, 1, 21, 30);
    expect(localDateKey(lateEvening)).toBe('2026-04-01');
    vi.useFakeTimers();
    vi.setSystemTime(lateEvening);
    expect(localDateKey()).toBe('2026-04-01');
  });

  it('pads months and days', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds days across month, year, and DST boundaries', () => {
    expect(addDaysToDateKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToDateKey('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDaysToDateKey('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDaysToDateKey('not-a-date', 1)).toBe('not-a-date');
  });

  it('parses only YYYY-MM-DD keys', () => {
    expect(parseDateKey('2026-04-01')?.getDate()).toBe(1);
    expect(parseDateKey('2026-4-1')).toBeNull();
  });

  it('groups timestamps by local day', () => {
    const instant = new Date(2026, 3, 1, 23, 45).toISOString();
    expect(localDateKeyForTimestamp(instant)).toBe('2026-04-01');
    expect(localDateKeyForTimestamp('garbage-value')).toBe('garbage-va');
  });
});
