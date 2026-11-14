import { describe, expect, it, vi } from 'vitest';

import { LAUNCH_SPLASH_FADE_MS, dismissLaunchSplash } from './launch-splash-dom';

describe('dismissLaunchSplash', () => {
  it('fades the splash, then removes it after the fade', () => {
    const classes = new Set<string>();
    const remove = vi.fn();
    const scheduled: Array<[() => void, number]> = [];
    const doc = {
      getElementById: (id: string) =>
        id === 'launch-splash' ? { classList: { add: (name: string) => classes.add(name) }, remove } : null
    };

    expect(dismissLaunchSplash(doc, (callback, ms) => scheduled.push([callback, ms]))).toBe(true);
    expect(classes.has('is-hidden')).toBe(true);
    expect(remove).not.toHaveBeenCalled();
    expect(scheduled[0][1]).toBeGreaterThan(LAUNCH_SPLASH_FADE_MS);
    scheduled[0][0]();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no splash (native, or already dismissed)', () => {
    expect(dismissLaunchSplash({ getElementById: () => null })).toBe(false);
    expect(dismissLaunchSplash(undefined)).toBe(false);
  });
});
