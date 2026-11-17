import { describe, expect, it } from 'vitest';

import type { WaterEntry } from '../types';
import { glasses, volumeLabel, waterByDay, waterDays, waterForDay, waterSummary } from './water';

const drink = (id: string, day: string, ml: number): WaterEntry => ({ id, logged_on: day, amount_ml: ml, created_at: `${day}T10:00:00Z` });

describe('water', () => {
  it('counts glasses and volume', () => {
    expect(glasses(1250)).toBe(5);
    expect(volumeLabel(1250, true)).toBe('1.25 L');
    expect(volumeLabel(2000, false)).toBe('68 oz');
    expect(waterSummary(1250, 2000, true)).toBe('5 of 8 glasses · 1.25 L');
    expect(waterSummary(375, 2000, false)).toBe('1.5 of 8 glasses · 13 oz');
  });

  it('adds up each day', () => {
    const entries = [drink('a', '2026-11-16', 250), drink('b', '2026-11-17', 500), drink('c', '2026-11-17', 250)];
    expect(waterByDay(entries).get('2026-11-17')).toBe(750);
    expect(waterForDay(entries, '2026-11-17').map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(waterDays('2026-11-15', '2026-11-17', entries)).toEqual([
      { date: '2026-11-15', ml: 0 },
      { date: '2026-11-16', ml: 250 },
      { date: '2026-11-17', ml: 750 }
    ]);
  });
});
