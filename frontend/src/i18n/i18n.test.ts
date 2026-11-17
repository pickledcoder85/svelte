import { describe, expect, it } from 'vitest';

import { DICTIONARIES, translate } from './dictionaries';
import { en } from './en';
import { es } from './es';
import { deviceLanguage, formatDate, formatNumber, localeFor, parseLanguage, translateWith, type Dictionary } from './translate';

const fixtureEn = {
  greeting: 'Hello, {name}!',
  glasses: { one: '{count} glass', other: '{count} glasses' },
  onlyEnglish: 'Only in English',
  nested: { deep: { leaf: 'Leaf' } }
};
const fixtureEs = {
  greeting: '¡Hola, {name}!',
  glasses: { one: '{count} vaso', other: '{count} vasos' },
  nested: { deep: { leaf: 'Hoja' } }
};

function keyPaths(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') {
    return [prefix];
  }
  return Object.entries(node as Record<string, unknown>)
    .flatMap(([key, value]) => keyPaths(value, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe('t()', () => {
  it('looks up dotted keys in each language', () => {
    expect(translate('en', 'settings.language.label')).toBe('Language');
    expect(translate('es', 'settings.language.label')).toBe('Idioma');
    expect(translateWith(fixtureEs, fixtureEn, 'es-CO', 'nested.deep.leaf')).toBe('Hoja');
  });

  it('fills {name} placeholders and leaves unknown ones alone', () => {
    expect(translateWith(fixtureEn, fixtureEn, 'en-US', 'greeting', { name: 'Gus' })).toBe('Hello, Gus!');
    expect(translateWith(fixtureEs, fixtureEn, 'es-CO', 'greeting', { name: 'Gus' })).toBe('¡Hola, Gus!');
    expect(translateWith(fixtureEn, fixtureEn, 'en-US', 'greeting')).toBe('Hello, {name}!');
    expect(translateWith(fixtureEn, fixtureEn, 'en-US', 'greeting', { other: 1 })).toBe('Hello, {name}!');
  });

  it('picks English plurals by count', () => {
    const t = (count: number) => translateWith(fixtureEn, fixtureEn, 'en-US', 'glasses', { count });
    expect(t(1)).toBe('1 glass');
    expect(t(0)).toBe('0 glasses');
    expect(t(2)).toBe('2 glasses');
    expect(t(1.5)).toBe('1.5 glasses');
  });

  it('picks Spanish plurals by count, using other for every non-one category', () => {
    const t = (count: number) => translateWith(fixtureEs, fixtureEn, 'es-CO', 'glasses', { count });
    expect(t(1)).toBe('1 vaso');
    expect(t(0)).toBe('0 vasos');
    expect(t(8)).toBe('8 vasos');
    // CLDR puts a million in Spanish's "many" category; it still reads as the plural.
    expect(t(1000000)).toBe('1000000 vasos');
  });

  it('uses the other form when a plural is given no count', () => {
    expect(translateWith(fixtureEn, fixtureEn, 'en-US', 'glasses')).toBe('{count} glasses');
  });

  it('falls back to English, then to the key itself', () => {
    expect(translateWith(fixtureEs, fixtureEn, 'es-CO', 'onlyEnglish')).toBe('Only in English');
    expect(translateWith(fixtureEs, fixtureEn, 'es-CO', 'missing.key')).toBe('missing.key');
    // A group is not an entry.
    expect(translateWith(fixtureEs, fixtureEn, 'es-CO', 'nested.deep')).toBe('nested.deep');
  });
});

describe('dictionaries', () => {
  it('have the same keys in English and Spanish', () => {
    expect(keyPaths(es)).toEqual(keyPaths(en));
    expect(keyPaths(DICTIONARIES.es)).toEqual(keyPaths(DICTIONARIES.en));
  });

  it('have no empty strings', () => {
    for (const dictionary of [en, es]) {
      for (const path of keyPaths(dictionary)) {
        expect(translateWith(dictionary, {}, 'en-US', path).trim()).not.toBe('');
      }
    }
  });

  it('refuse a Spanish dictionary with a missing key at compile time', () => {
    // @ts-expect-error: settings.language.hint and the rest are missing.
    const incomplete: Dictionary = { settings: { language: { label: 'Idioma' } } };
    expect(incomplete).toBeTruthy();
  });
});

describe('languages and formatting', () => {
  it('maps languages to locales and parses saved values', () => {
    expect(localeFor('en')).toBe('en-US');
    expect(localeFor('es')).toBe('es-CO');
    expect(parseLanguage('es')).toBe('es');
    expect(parseLanguage('fr')).toBeNull();
    expect(parseLanguage(undefined)).toBeNull();
  });

  it('picks Spanish from the device language only when it starts with es', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const setLanguage = (language: string) =>
      Object.defineProperty(globalThis, 'navigator', { value: { language }, configurable: true });
    try {
      setLanguage('es-CO');
      expect(deviceLanguage()).toBe('es');
      setLanguage('es');
      expect(deviceLanguage()).toBe('es');
      setLanguage('en-US');
      expect(deviceLanguage()).toBe('en');
      setLanguage('fr-FR');
      expect(deviceLanguage()).toBe('en');
    } finally {
      if (original) {
        Object.defineProperty(globalThis, 'navigator', original);
      } else {
        delete (globalThis as { navigator?: unknown }).navigator;
      }
    }
  });

  it('formats numbers and dates for the locale', () => {
    expect(formatNumber(1234.5, undefined, 'en-US')).toBe('1,234.5');
    expect(formatNumber(1234.5, undefined, 'es-CO')).toBe('1.234,5');
    const day = new Date(2026, 10, 17);
    expect(formatDate(day, { month: 'long', day: 'numeric' }, 'en-US')).toBe('November 17');
    expect(formatDate(day, { month: 'long', day: 'numeric' }, 'es-CO')).toBe('17 de noviembre');
  });
});
