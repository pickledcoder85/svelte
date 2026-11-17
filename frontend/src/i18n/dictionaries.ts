import { en } from './en';
import { es } from './es';
import {
  localeFor,
  translateWith,
  type Dictionary,
  type Language,
  type TFunction,
  type TranslationKey,
  type TranslationVars
} from './translate';

export const DICTIONARIES: Record<Language, Dictionary> = { en, es };

/** t() for one language, without React: the dictionary entry, else English, else the key. */
export function translate(language: Language, key: TranslationKey, vars?: TranslationVars): string {
  return translateWith(DICTIONARIES[language], en, localeFor(language), key, vars);
}

const translators: Partial<Record<Language, TFunction>> = {};

/** A t() bound to one language (with its locale), for pure helpers, tests, and useT(). */
export function translatorFor(language: Language): TFunction {
  const cached = translators[language];
  if (cached) {
    return cached;
  }
  const t = Object.assign((key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars), {
    language,
    locale: localeFor(language)
  });
  translators[language] = t;
  return t;
}
