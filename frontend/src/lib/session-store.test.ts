import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearStoredSessionToken, loadStoredSessionToken, storeSessionToken } from './session-store';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key)
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session store', () => {
  it('stores, loads, and clears a token', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(loadStoredSessionToken()).toBeNull();
    storeSessionToken('session-abc');
    expect(loadStoredSessionToken()).toBe('session-abc');
    clearStoredSessionToken();
    expect(loadStoredSessionToken()).toBeNull();
  });

  it('treats missing or throwing storage as no session', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadStoredSessionToken()).toBeNull();
    expect(() => storeSessionToken('x')).not.toThrow();

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      }
    });
    expect(loadStoredSessionToken()).toBeNull();
    expect(() => storeSessionToken('x')).not.toThrow();
    expect(() => clearStoredSessionToken()).not.toThrow();
  });
});
