import { describe, expect, it } from 'vitest';

import { bundleHash, isTyping, latestBundleHash, loadedBundleHash, updateDecision, UPDATE_CHECK_PARAM } from './app-update';

const page = (hash: string) =>
  `<!doctype html><html><head></head><body><div id="root"></div><script src="/_expo/static/js/web/AppEntry-${hash}.js" defer></script></body></html>`;

describe('app update', () => {
  it('reads the app script hash', () => {
    expect(bundleHash(page('fbc44c58ae0e73bbf76a0f663e2c2883'))).toBe('fbc44c58ae0e73bbf76a0f663e2c2883');
    expect(bundleHash('<html></html>')).toBeNull();
  });

  it('finds the running script', () => {
    const doc = { querySelectorAll: () => [{ getAttribute: () => '/_expo/static/js/web/AppEntry-abc123.js' }] } as unknown as Document;
    expect(loadedBundleHash(doc)).toBe('abc123');
    expect(loadedBundleHash({ querySelectorAll: () => [] } as unknown as Document)).toBeNull();
  });

  it('fetches the deployed page past the cache', async () => {
    const seen: Array<[string, RequestInit | undefined]> = [];
    const fake = (async (url: string, init?: RequestInit) => {
      seen.push([url, init]);
      return new Response(page('def456'));
    }) as unknown as typeof fetch;
    expect(await latestBundleHash(fake)).toBe('def456');
    expect(seen[0][0]).toContain(UPDATE_CHECK_PARAM);
    expect(seen[0][1]?.cache).toBe('no-store');
    const offline = (async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    expect(await latestBundleHash(offline)).toBeNull();
  });

  it('reloads only for a new version, and waits while busy', () => {
    expect(updateDecision('a', 'a', false)).toBe('none');
    expect(updateDecision('a', 'b', false)).toBe('reload');
    expect(updateDecision('a', 'b', true)).toBe('wait');
    expect(updateDecision(null, 'b', false)).toBe('none'); // development build
    expect(updateDecision('a', null, false)).toBe('none'); // couldn't check
  });

  it('knows when a field has focus', () => {
    expect(isTyping({ activeElement: { tagName: 'INPUT' } } as unknown as Document)).toBe(true);
    expect(isTyping({ activeElement: { tagName: 'BODY' } } as unknown as Document)).toBe(false);
    expect(isTyping({ activeElement: null } as unknown as Document)).toBe(false);
  });
});
