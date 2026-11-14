/**
 * Remembers a local-mode (development) session token across app restarts on web.
 *
 * Owner sessions (Tailscale or dev auto-login) are never stored: the server recognizes the
 * owner on every launch. Storage can be unavailable (private mode, iOS eviction), so every
 * access is guarded and failures simply mean "sign in again".
 */

const STORAGE_KEY = 'relish.session-token';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): KeyValueStorage | null {
  try {
    const candidate = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

export function loadStoredSessionToken(): string | null {
  try {
    const value = storage()?.getItem(STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function storeSessionToken(token: string): void {
  try {
    storage()?.setItem(STORAGE_KEY, token);
  } catch {
    // Storage full or blocked: the session still works until the app restarts.
  }
}

export function clearStoredSessionToken(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
