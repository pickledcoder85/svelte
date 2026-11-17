/**
 * Bilingual app text: English and Colombian Spanish ("usted"). LanguageProvider holds the
 * display language (the profile's once loaded, the device's until then); useT() returns a typed
 * t('dotted.key', vars) and useLanguage() the language, its locale, and a setter.
 */
import type { ReactElement, ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { translate } from './dictionaries';
import { deviceLanguage, localeFor, type Language, type Locale, type TranslationKey, type TranslationVars } from './translate';

export { formatDate, formatNumber, parseLanguage } from './translate';
export type { Language, Locale, TranslationKey, TranslationVars } from './translate';

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
  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): { language: Language; locale: Locale; setLanguage: (language: Language) => void } {
  const { language, setLanguage } = useContext(LanguageContext);
  return { language, locale: localeFor(language), setLanguage };
}

export type TFunction = (key: TranslationKey, vars?: TranslationVars) => string;

export function useT(): TFunction {
  const { language } = useContext(LanguageContext);
  return useCallback<TFunction>((key, vars) => translate(language, key, vars), [language]);
}
