import { describe, expect, it } from 'vitest';

import { shouldRegisterServiceWorker } from './service-worker';

const production = {
  platform: 'web',
  isDevelopmentBuild: false,
  hasServiceWorker: true,
  protocol: 'https:',
  hostname: 'relish.tail1234.ts.net'
};

describe('service worker registration', () => {
  it('registers for production web builds over HTTPS', () => {
    expect(shouldRegisterServiceWorker(production)).toBe(true);
    expect(shouldRegisterServiceWorker({ ...production, protocol: 'http:', hostname: 'localhost' })).toBe(true);
  });

  it('skips development builds, native apps, insecure origins, and old browsers', () => {
    expect(shouldRegisterServiceWorker({ ...production, isDevelopmentBuild: true })).toBe(false);
    expect(shouldRegisterServiceWorker({ ...production, platform: 'ios' })).toBe(false);
    expect(shouldRegisterServiceWorker({ ...production, protocol: 'http:', hostname: '192.168.1.10' })).toBe(false);
    expect(shouldRegisterServiceWorker({ ...production, hasServiceWorker: false })).toBe(false);
  });
});
