import { describe, expect, it } from 'vitest';

import { parseAppearance, resolveScheme } from './appearance';
import { cssVarName, PALETTE, paletteFor, tc, themeCss } from './palette';

describe('palette', () => {
  it('exposes every token as a CSS variable', () => {
    expect(tc.fg_132536).toBe('var(--rl-fg-132536)');
    expect(cssVarName('brand_primary')).toBe('--rl-brand-primary');
    expect(Object.keys(tc)).toEqual(Object.keys(PALETTE));
  });

  it('keeps the original light colours and gives each a dark one', () => {
    expect(paletteFor('light').bg_ffffff).toBe('#ffffff');
    expect(paletteFor('dark').bg_ffffff).toBe('#1b2318');
    expect(paletteFor('dark').fg_132536).toBe('#e8eedf');
    for (const [light, dark] of Object.values(PALETTE)) {
      expect(light).toMatch(/^(#[0-9a-f]{6}|rgba\()/);
      expect(dark).toMatch(/^(#[0-9a-f]{6}|rgba\()/);
    }
  });

  it('switches to dark for the phone setting unless Light is chosen, and for Dark', () => {
    const css = themeCss();
    expect(css).toContain(':root{--rl-');
    expect(css).toContain('@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){');
    expect(css).toContain(':root[data-theme="dark"]{');
    expect(css).toContain('--rl-bg-ffffff:#1b2318;');
  });
});

describe('appearance', () => {
  it('reads the saved choice, defaulting to System', () => {
    expect(parseAppearance('dark')).toBe('dark');
    expect(parseAppearance('light')).toBe('light');
    expect(parseAppearance(null)).toBe('system');
    expect(parseAppearance('purple')).toBe('system');
  });

  it('follows the phone only for System', () => {
    expect(resolveScheme('system', true)).toBe('dark');
    expect(resolveScheme('system', false)).toBe('light');
    expect(resolveScheme('light', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
  });
});
