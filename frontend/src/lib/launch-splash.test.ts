import { describe, expect, it } from 'vitest';

import { launchSplashSize } from './launch-splash';

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
