import { en } from './en';
import { es } from './es';
import { localeFor, translateWith, type Dictionary, type Language, type TranslationKey, type TranslationVars } from './translate';

export const DICTIONARIES: Record<Language, Dictionary> = { en, es };

/** t() for one language, without React: the dictionary entry, else English, else the key. */
export function translate(language: Language, key: TranslationKey, vars?: TranslationVars): string {
  return translateWith(DICTIONARIES[language], en, localeFor(language), key, vars);
}
