import { describe, expect, it } from 'vitest';

import type { GarminStatus } from '../types';
import { agoText, garminStatusText, garminSyncIsStale, workoutSourceLabel } from './garmin';

const now = new Date('2026-11-15T18:00:00Z');
const base: GarminStatus = {
  configured: true,
  last_attempt_at: null,
  last_success_at: null,
  last_status: null,
  last_error: null,
  last_imported: 0
};

describe('garmin status', () => {
  it('is stale when never synced or older than 15 minutes, never when not connected', () => {
    expect(garminSyncIsStale(base, now)).toBe(true);
    expect(garminSyncIsStale({ ...base, last_success_at: '2026-11-15T17:50:00Z' }, now)).toBe(false);
    expect(garminSyncIsStale({ ...base, last_success_at: '2026-11-15T17:40:00Z' }, now)).toBe(true);
    expect(garminSyncIsStale({ ...base, configured: false }, now)).toBe(false);
    expect(garminSyncIsStale(null, now)).toBe(false);
  });

  it('says how long ago in plain words', () => {
    expect(agoText(0.5)).toBe('just now');
    expect(agoText(5)).toBe('5 min ago');
    expect(agoText(125)).toBe('2 hr ago');
    expect(agoText(60 * 24)).toBe('1 day ago');
    expect(agoText(60 * 50)).toBe('2 days ago');
  });

  it('describes each state', () => {
    expect(garminStatusText(null, now)).toBe('Checking…');
    expect(garminStatusText({ ...base, configured: false }, now)).toMatch(/^Not connected/);
    expect(garminStatusText(base, now)).toBe('Not synced yet.');
    expect(garminStatusText({ ...base, last_status: 'ok', last_success_at: '2026-11-15T17:55:00Z' }, now)).toBe(
      'Last synced 5 min ago.'
    );
    expect(
      garminStatusText(
        { ...base, last_status: 'error', last_error: "Couldn't reach Garmin.", last_success_at: '2026-11-15T16:00:00Z' },
        now
      )
    ).toBe("Sync failed: Couldn't reach Garmin. Last synced 2 hr ago.");
  });

  it('labels imported workouts only', () => {
    expect(workoutSourceLabel('garmin')).toBe('Garmin');
    expect(workoutSourceLabel('manual')).toBeNull();
    expect(workoutSourceLabel(undefined)).toBeNull();
  });
});
