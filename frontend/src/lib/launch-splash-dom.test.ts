import { describe, expect, it, vi } from 'vitest';

import { LAUNCH_SPLASH_FADE_MS, LAUNCH_SPLASH_MIN_MS, dismissLaunchSplash, splashHoldMs } from './launch-splash-dom';

function fakeSplash() {
  const classes = new Set<string>();
  const remove = vi.fn();
  const scheduled: Array<[() => void, number]> = [];
  const doc = {
    getElementById: (id: string) =>
      id === 'launch-splash' ? { classList: { add: (name: string) => classes.add(name) }, remove } : null
  };
  const schedule = (callback: () => void, ms: number) => scheduled.push([callback, ms]);
  return { classes, remove, scheduled, doc, schedule };
}

describe('dismissLaunchSplash', () => {
  it('keeps Gherkin up for the minimum time, then fades and removes the splash', () => {
    const { classes, remove, scheduled, doc, schedule } = fakeSplash();
    expect(dismissLaunchSplash(doc, schedule, 600)).toBe(true);
    expect(classes.has('is-hidden')).toBe(false);
    expect(scheduled[0][1]).toBe(LAUNCH_SPLASH_MIN_MS - 600);
    scheduled[0][0](); // the hold ends
    expect(classes.has('is-hidden')).toBe(true);
    expect(scheduled[1][1]).toBeGreaterThan(LAUNCH_SPLASH_FADE_MS);
    scheduled[1][0]();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('fades straight away when the app took longer than the minimum', () => {
    const { classes, scheduled, doc, schedule } = fakeSplash();
    dismissLaunchSplash(doc, schedule, LAUNCH_SPLASH_MIN_MS + 400);
    expect(classes.has('is-hidden')).toBe(true);
    expect(scheduled).toHaveLength(1); // only the removal
  });

  it('works out the hold', () => {
    expect(splashHoldMs(0)).toBe(LAUNCH_SPLASH_MIN_MS);
    expect(splashHoldMs(LAUNCH_SPLASH_MIN_MS * 2)).toBe(0);
  });

  it('does nothing when there is no splash (native, or already dismissed)', () => {
    expect(dismissLaunchSplash({ getElementById: () => null })).toBe(false);
    expect(dismissLaunchSplash(undefined)).toBe(false);
  });
});
