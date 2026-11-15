/**
 * Light / dark appearance. The choice (System, Light, Dark) is a per-device preference kept in
 * localStorage; System follows the iPhone's setting live. public/index.html applies a saved
 * Light or Dark before the app loads, so the splash already matches.
 */
import { useSyncExternalStore } from 'react';

import { paletteFor, themeCss, type ColorScheme, type ColorToken } from './palette';

export type AppearancePreference = 'system' | 'light' | 'dark';

export const APPEARANCE_STORAGE_KEY = 'relish-appearance';
const STYLE_ELEMENT_ID = 'relish-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const APPEARANCE_OPTIONS: Array<{ id: AppearancePreference; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
];

/** Background behind the iOS status bar and the page, per scheme. */
const CANVAS: Record<ColorScheme, string> = { light: '#f4efe4', dark: '#121811' };

export function parseAppearance(value: string | null | undefined): AppearancePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveScheme(preference: AppearancePreference, systemDark: boolean): ColorScheme {
  if (preference === 'system') {
    return systemDark ? 'dark' : 'light';
  }
  return preference;
}

function readStoredPreference(): AppearancePreference {
  try {
    return parseAppearance(globalThis.localStorage?.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  try {
    return Boolean(globalThis.matchMedia?.(DARK_QUERY).matches);
  } catch {
    return false;
  }
}

type State = { preference: AppearancePreference; systemDark: boolean; scheme: ColorScheme };

let state: State = { preference: 'system', systemDark: false, scheme: 'light' };
const listeners = new Set<() => void>();
let started = false;

function update(next: Partial<State>) {
  const merged = { ...state, ...next };
  state = { ...merged, scheme: resolveScheme(merged.preference, merged.systemDark) };
  applyToDocument(state);
  listeners.forEach((listener) => listener());
}

function applyToDocument({ preference, scheme }: State) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }
  // One theme-color for the status bar and Safari chrome, matching what is on screen.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', CANVAS[scheme]);
    meta.removeAttribute('media');
  });
}

/** Adds the colour variables to the page and starts following the saved choice. Web only. */
export function startAppearance(): void {
  if (started || typeof document === 'undefined') {
    return;
  }
  started = true;
  if (!document.getElementById(STYLE_ELEMENT_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = themeCss();
    document.head.appendChild(style);
  }
  try {
    const media = globalThis.matchMedia?.(DARK_QUERY);
    media?.addEventListener?.('change', (event) => update({ systemDark: event.matches }));
  } catch {
    // Older browsers: System stays at the scheme the page loaded with.
  }
  update({ preference: readStoredPreference(), systemDark: systemPrefersDark() });
}

export function setAppearance(preference: AppearancePreference): void {
  try {
    if (preference === 'system') {
      globalThis.localStorage?.removeItem(APPEARANCE_STORAGE_KEY);
    } else {
      globalThis.localStorage?.setItem(APPEARANCE_STORAGE_KEY, preference);
    }
  } catch {
    // Private browsing: the choice lasts for this session only.
  }
  update({ preference });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppearance(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Real colour values for the current scheme, for SVG charts. */
export function usePalette(): Record<ColorToken, string> {
  const { scheme } = useAppearance();
  return scheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

const LIGHT_PALETTE = paletteFor('light');
const DARK_PALETTE = paletteFor('dark');
