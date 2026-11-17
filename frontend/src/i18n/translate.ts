/**
 * The pure half of i18n: dictionary types, lookups with `{name}` interpolation and plurals,
 * and locale-aware date and number formatting. index.tsx adds the React context on top.
 */
import type { en } from './en';

export type Language = 'en' | 'es';
export type Locale = 'en-US' | 'es-CO';

export const LOCALES: Record<Language, Locale> = { en: 'en-US', es: 'es-CO' };

/** A plural entry: `one` for a single item, `other` for everything else. */
export interface PluralEntry {
  one: string;
  other: string;
}

/** The same shape as `T` with every string literal widened to `string`. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

/** The shape every language's dictionary has: the English one, with any text. */
export type Dictionary = Widen<typeof en>;

/** Dotted paths to every entry (a string or a plural), e.g. 'settings.language.label'. */
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | PluralEntry ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Paths<typeof en>;
export type TranslationVars = Record<string, string | number>;

export function localeFor(language: Language): Locale {
  return LOCALES[language];
}

export function parseLanguage(value: unknown): Language | null {
  return value === 'en' || value === 'es' ? value : null;
}

/** The device's language when it is Spanish, else English (used until the profile loads). */
export function deviceLanguage(): Language {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const tag = typeof nav?.language === 'string' ? nav.language.toLowerCase() : '';
  return tag.startsWith('es') ? 'es' : 'en';
}

function isPlural(value: unknown): value is PluralEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PluralEntry).one === 'string' &&
    typeof (value as PluralEntry).other === 'string'
  );
}

function lookup(dictionary: unknown, key: string): string | PluralEntry | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

function pluralCategory(count: number, locale: Locale): string {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

function interpolate(text: string, vars: TranslationVars | undefined): string {
  if (!vars) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

/**
 * Look a key up in `dictionary`, falling back to `fallback` (English) and then to the key
 * itself. A plural picks `one` or `other` by `vars.count` with the locale's plural rules
 * (`other` when no count is given); `{name}` placeholders are then filled from `vars`.
 */
export function translateWith(
  dictionary: unknown,
  fallback: unknown,
  locale: Locale,
  key: string,
  vars?: TranslationVars
): string {
  const entry = lookup(dictionary, key) ?? lookup(fallback, key);
  if (entry === undefined) {
    return key;
  }
  let text: string;
  if (typeof entry === 'string') {
    text = entry;
  } else {
    const count = typeof vars?.count === 'number' ? vars.count : Number(vars?.count);
    text = Number.isFinite(count) && pluralCategory(count, locale) === 'one' ? entry.one : entry.other;
  }
  return interpolate(text, vars);
}

export function formatDate(date: Date | number, options: Intl.DateTimeFormatOptions | undefined, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatNumber(n: number, options: Intl.NumberFormatOptions | undefined, locale: Locale): string {
  return new Intl.NumberFormat(locale, options).format(n);
}
