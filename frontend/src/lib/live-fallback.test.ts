import { describe, expect, it } from 'vitest';

import { fallbackForMode, liveLoadErrorMessage } from './live-fallback';

describe('live fallback helpers', () => {
  it('returns demo data only in preview mode', () => {
    expect(fallbackForMode('preview', 'demo', 'empty')).toBe('demo');
    expect(fallbackForMode('live', 'demo', 'empty')).toBe('empty');
    expect(fallbackForMode(null, 'demo', 'empty')).toBe('empty');
  });

  it('builds live error messages that never mention preview data', () => {
    expect(liveLoadErrorMessage(new Error('Request failed (500)'), 'Daily log')).toBe(
      'Daily log could not be loaded. Request failed (500)'
    );
    expect(liveLoadErrorMessage('boom', 'Tracker data')).toBe(
      'Tracker data could not be loaded. Check your connection and try again.'
    );
    expect(liveLoadErrorMessage(new Error('   '), 'Profile')).toBe(
      'Profile could not be loaded. Check your connection and try again.'
    );
    expect(liveLoadErrorMessage(new Error('x'), 'Profile')).not.toMatch(/preview/i);
  });
});
