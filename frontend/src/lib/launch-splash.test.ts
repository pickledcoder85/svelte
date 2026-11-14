import { describe, expect, it } from 'vitest';

import { MIN_SPLASH_MS, holdSplashForFonts, launchSplashSize, splashHoldRemaining } from './launch-splash';

describe('launch splash size', () => {
  it('uses 70% of a phone-width screen', () => {
    expect(launchSplashSize(390)).toEqual({ width: 273, height: 382.2 });
  });

  it('caps at 300 px on wide screens', () => {
    expect(launchSplashSize(1440)).toEqual({ width: 300, height: 420 });
  });

  it('never goes negative', () => {
    expect(launchSplashSize(0)).toEqual({ width: 0, height: 0 });
  });
});

describe('holding the splash for fonts', () => {
  it('holds until the font loads', () => {
    expect(holdSplashForFonts({ fontLoaded: false, fontError: false, waitExpired: false })).toBe(true);
    expect(holdSplashForFonts({ fontLoaded: true, fontError: false, waitExpired: false })).toBe(false);
  });

  it('never hangs on a failed or slow font', () => {
    expect(holdSplashForFonts({ fontLoaded: false, fontError: true, waitExpired: false })).toBe(false);
    expect(holdSplashForFonts({ fontLoaded: false, fontError: false, waitExpired: true })).toBe(false);
  });
});

describe('minimum splash hold', () => {
  it('holds returning users until the minimum has passed since launch', () => {
    expect(MIN_SPLASH_MS).toBe(500);
    expect(splashHoldRemaining({ elapsedMs: 120, firstTimeSetup: false })).toBe(380);
    expect(splashHoldRemaining({ elapsedMs: 499.2, firstTimeSetup: false })).toBe(1);
  });

  it('adds no wait when launch already took long enough', () => {
    expect(splashHoldRemaining({ elapsedMs: 500, firstTimeSetup: false })).toBe(0);
    expect(splashHoldRemaining({ elapsedMs: 2400, firstTimeSetup: false })).toBe(0);
  });

  it('sends first-time setup straight to the welcome card', () => {
    expect(splashHoldRemaining({ elapsedMs: 50, firstTimeSetup: true })).toBe(0);
  });
});
