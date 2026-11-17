/**
 * Relish colours, light and dark. Each token is [light, dark].
 *
 * Styles use `tc.<token>`, which is a CSS variable (`var(--rl-<token>)`), so switching modes
 * swaps one set of variables and every screen updates without re-rendering. React Native Web
 * passes `var(...)` colours through unchanged. SVG charts use real values from `usePalette()`.
 *
 * Token names say how a colour is used and its light value: `fg_` text, `bg_` fills, `line_`
 * borders, `brand_` the RELISH_COLORS set. Light values are the app's original colours; dark
 * values are a pickle-jar palette: green-black surfaces, dill-white text, gherkin-green accents.
 */

export const PALETTE = {
  backdrop: ['rgba(15,23,32,0.35)', 'rgba(0,0,0,0.6)'],
  bg_0f766e: ['#0f766e', '#5fae9f'],
  bg_132536: ['#132536', '#9cc36b'],
  bg_17324d: ['#17324d', '#9cc36b'],
  bg_7fa38c: ['#7fa38c', '#2a3626'],
  bg_e2e8f0: ['#e2e8f0', '#222c1f'],
  bg_e3dccb: ['#e3dccb', '#2a3626'],
  bg_ece6d6: ['#ece6d6', '#2a3626'],
  bg_ecfdf3: ['#ecfdf3', '#1c3b29'],
  bg_edf1f5: ['#edf1f5', '#222c1f'],
  bg_edf8f1: ['#edf8f1', '#1c3b27'],
  bg_eef2f6: ['#eef2f6', '#222c1f'],
  bg_eef3f8: ['#eef3f8', '#222c1f'],
  bg_efe9da: ['#efe9da', '#2a3626'],
  bg_effaf7: ['#effaf7', '#1c3b32'],
  bg_f2f6fb: ['#f2f6fb', '#222c1f'],
  bg_f3efe8: ['#f3efe8', '#121811'],
  bg_f3f6fb: ['#f3f6fb', '#222c1f'],
  bg_f4efe4: ['#f4efe4', '#121811'],
  bg_f6f0e7: ['#f6f0e7', '#121811'],
  bg_f6f1e7: ['#f6f1e7', '#121811'],
  bg_f6f9fc: ['#f6f9fc', '#1b2318'],
  bg_f7f4ef: ['#f7f4ef', '#222c1f'],
  bg_f7fafc: ['#f7fafc', '#1b2318'],
  bg_f8fafc: ['#f8fafc', '#1b2318'],
  bg_f9fbfd: ['#f9fbfd', '#1b2318'],
  bg_fbfcfe: ['#fbfcfe', '#1b2318'],
  bg_fff4f0: ['#fff4f0', '#3b241c'],
  bg_fff8ea: ['#fff8ea', '#222c1f'],
  bg_fffaf0: ['#fffaf0', '#222c1f'],
  bg_fffdf8: ['#fffdf8', '#1b2318'],
  bg_ffffff: ['#ffffff', '#1b2318'],
  brand_accent: ['#ea9d2d', '#e7a94a'],
  brand_accentSoft: ['#fff3de', '#3a2e1a'],
  brand_primary: ['#4b8d66', '#8fbf6a'],
  brand_primaryDeep: ['#2d6046', '#b5d98f'],
  brand_primarySoft: ['#e8f3ec', '#24331f'],
  brand_stroke: ['#d7e0d7', '#33402d'],
  fg_0284c7: ['#0284c7', '#85c1e0'],
  fg_065f46: ['#065f46', '#e8eedf'],
  fg_0f766e: ['#0f766e', '#85e0d9'],
  fg_134e4a: ['#134e4a', '#c4f1ea'],
  fg_132536: ['#132536', '#e8eedf'],
  fg_15803d: ['#15803d', '#85e0a7'],
  fg_163127: ['#163127', '#e8eedf'],
  fg_17324d: ['#17324d', '#e8eedf'],
  fg_1d4ed8: ['#1d4ed8', '#859de0'],
  fg_1e3a8a: ['#1e3a8a', '#c9d4f6'],
  fg_1d5f3a: ['#1d5f3a', '#8adbae'],
  fg_2563eb: ['#2563eb', '#85a1e0'],
  fg_2f6b4f: ['#2f6b4f', '#95d0b4'],
  fg_4c627a: ['#4c627a', '#c0cab9'],
  fg_5b6b62: ['#5b6b62', '#c0cab9'],
  fg_5c6d80: ['#5c6d80', '#bbc6b4'],
  fg_63776a: ['#63776a', '#bcc7b4'],
  fg_64748b: ['#64748b', '#b7c2af'],
  fg_65a30d: ['#65a30d', '#bae085'],
  fg_66778c: ['#66778c', '#b6c2ae'],
  fg_6b7b90: ['#6b7b90', '#b4c0ac'],
  fg_73859d: ['#73859d', '#afbca6'],
  fg_7890ad: ['#7890ad', '#abb8a1'],
  fg_7a4e16: ['#7a4e16', '#e0b885'],
  fg_7a8797: ['#7a8797', '#afbca6'],
  fg_7c3aed: ['#7c3aed', '#a685e0'],
  fg_7c8aa5: ['#7c8aa5', '#abb9a2'],
  fg_8a3328: ['#8a3328', '#dd9288'],
  fg_8a5a1d: ['#8a5a1d', '#e0b885'],
  fg_8a97a8: ['#8a97a8', '#a8b69e'],
  fg_8a98aa: ['#8a98aa', '#a7b59d'],
  fg_8ea0b6: ['#8ea0b6', '#97a78b'],
  fg_9aa6b8: ['#9aa6b8', '#a0af95'],
  fg_b42318: ['#b42318', '#e08b85'],
  fg_b45309: ['#b45309', '#e0ac85'],
  fg_b91c1c: ['#b91c1c', '#e08585'],
  fg_ca8a04: ['#ca8a04', '#e0c385'],
  fg_d6e0ea: ['#d6e0ea', '#10170f'],
  fg_d8e1ed: ['#d8e1ed', '#10170f'],
  fg_dbe7f2: ['#dbe7f2', '#10170f'],
  fg_ea580c: ['#ea580c', '#e0a485'],
  fg_9a3412: ['#9a3412', '#f6d5c2'],
  fg_f4efe4: ['#f4efe4', '#10170f'],
  fg_f59e0b: ['#f59e0b', '#e0be85'],
  fg_f8fafc: ['#f8fafc', '#10170f'],
  fg_ffffff: ['#ffffff', '#10170f'],
  line_0f766e: ['#0f766e', '#9cc36b'],
  line_132536: ['#132536', '#9cc36b'],
  line_15803d: ['#15803d', '#9cc36b'],
  line_17324d: ['#17324d', '#9cc36b'],
  line_1d4ed8: ['#1d4ed8', '#6985d3'],
  line_2563eb: ['#2563eb', '#698ad3'],
  line_4d6278: ['#4d6278', '#b4c0ac'],
  line_8ea0b6: ['#8ea0b6', '#97a78b'],
  line_94a3b8: ['#94a3b8', '#97a78b'],
  line_a7f3d0: ['#a7f3d0', '#32674f'],
  line_c7e5d2: ['#c7e5d2', '#326745'],
  line_cbd5e1: ['#cbd5e1', '#33402d'],
  line_cdd8e5: ['#cdd8e5', '#33402d'],
  line_ced7e3: ['#ced7e3', '#33402d'],
  line_d4dbe3: ['#d4dbe3', '#33402d'],
  line_d7dee7: ['#d7dee7', '#33402d'],
  line_d8e1eb: ['#d8e1eb', '#33402d'],
  line_d97706: ['#d97706', '#d3a269'],
  line_dbe3ec: ['#dbe3ec', '#33402d'],
  line_dce5ef: ['#dce5ef', '#2b3727'],
  line_dde6ee: ['#dde6ee', '#2b3727'],
  line_dfe7ef: ['#dfe7ef', '#2b3727'],
  line_e2e8f0: ['#e2e8f0', '#2b3727'],
  line_e4dccf: ['#e4dccf', '#33402d'],
  line_e5ddd1: ['#e5ddd1', '#33402d'],
  line_e6dccc: ['#e6dccc', '#33402d'],
  line_e7e0cf: ['#e7e0cf', '#33402d'],
  line_edf1f5: ['#edf1f5', '#2b3727'],
  line_f2c8be: ['#f2c8be', '#673c32'],
  line_f59e0b: ['#f59e0b', '#d3ac69'],
  line_f8fafc: ['#f8fafc', '#2b3727'],
} as const satisfies Record<string, readonly [string, string]>;

export type ColorToken = keyof typeof PALETTE;
export type ColorScheme = 'light' | 'dark';

export function cssVarName(token: ColorToken): string {
  return `--rl-${token.replace(/_/g, '-')}`;
}

// React Native on iOS/Android cannot read CSS variables; there the light values are used.
const IS_NATIVE = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

/** `tc.fg_132536` is `var(--rl-fg-132536)`: use in styles. */
export const tc = Object.fromEntries(
  (Object.keys(PALETTE) as ColorToken[]).map((token) => [
    token,
    IS_NATIVE ? PALETTE[token][0] : `var(${cssVarName(token)})`
  ])
) as Record<ColorToken, string>;

/**
 * Gherkin's black arms and legs disappear on the dark background, so in dark mode the mascot
 * images get a soft light outline. Spread into an Image style.
 */
export const MASCOT_OUTLINE = (IS_NATIVE ? {} : { filter: 'var(--rl-mascot-filter)' }) as object;
const MASCOT_FILTER: Record<ColorScheme, string> = {
  light: 'none',
  dark: 'drop-shadow(0 0 1px rgba(232,238,223,0.85)) drop-shadow(0 0 6px rgba(232,238,223,0.18))'
};

/** Real colour values for one scheme, for SVG and anything that cannot take a CSS variable. */
export function paletteFor(scheme: ColorScheme): Record<ColorToken, string> {
  const index = scheme === 'dark' ? 1 : 0;
  return Object.fromEntries(
    (Object.keys(PALETTE) as ColorToken[]).map((token) => [token, PALETTE[token][index]])
  ) as Record<ColorToken, string>;
}

const VAR_PATTERN = /^var\(--rl-([a-z0-9-]+)\)$/;

/** Turns a `tc.*` value back into a real colour (SVG attributes cannot use CSS variables). */
export function resolveColor(value: string, palette: Record<ColorToken, string>): string {
  const match = VAR_PATTERN.exec(value);
  if (!match) {
    return value;
  }
  const token = match[1].replace(/-/g, '_') as ColorToken;
  return palette[token] ?? value;
}

function declarations(scheme: ColorScheme): string {
  const values = paletteFor(scheme);
  return (
    (Object.keys(values) as ColorToken[]).map((token) => `${cssVarName(token)}:${values[token]};`).join('') +
    `--rl-mascot-filter:${MASCOT_FILTER[scheme]};`
  );
}

/**
 * The stylesheet behind the tokens. Light by default; dark when the phone is in dark mode
 * (unless the user picked Light), or when the user picked Dark.
 */
export function themeCss(): string {
  const dark = declarations('dark');
  return [
    `:root{${declarations('light')}color-scheme:light;}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}color-scheme:dark;}}`,
    `:root[data-theme="dark"]{${dark}color-scheme:dark;}`
  ].join('\n');
}
