/**
 * Bilingual app text: English and Colombian Spanish ("usted"). LanguageProvider holds the
 * display language (the profile's once loaded, the device's until then); useT() returns a typed
 * t('dotted.key', vars) and useLanguage() the language, its locale, and a setter.
 */
import type { ReactElement, ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

import { setRequestLanguage } from '../lib/api';

import { translatorFor } from './dictionaries';
import { deviceLanguage, localeFor, type Language, type Locale, type TFunction } from './translate';

export { translatorFor } from './dictionaries';
export { formatDate, formatNumber, parseLanguage } from './translate';
export type { Language, Locale, TFunction, TranslationKey, TranslationVars } from './translate';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: deviceLanguage(),
  setLanguage: () => undefined
});

export function LanguageProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage?: Language }): ReactElement {
  const [language, setLanguage] = useState<Language>(() => initialLanguage ?? deviceLanguage());
  // The server answers in the same language (set during render so the next request has it).
  setRequestLanguage(language);
  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): { language: Language; locale: Locale; setLanguage: (language: Language) => void } {
  const { language, setLanguage } = useContext(LanguageContext);
  return { language, locale: localeFor(language), setLanguage };
}

/** t() for the current language; it also carries `language` and `locale` for formatting. */
export function useT(): TFunction {
  const { language } = useContext(LanguageContext);
  return translatorFor(language);
}
