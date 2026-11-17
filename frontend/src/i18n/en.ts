/**
 * English strings, the source dictionary. Keys are grouped by screen; a `{name}` placeholder is
 * filled from t()'s vars, and an entry `{ one, other }` is a plural picked by `vars.count`.
 * Every key here must also exist in es.ts (TypeScript refuses a missing Spanish key).
 */
export const en = {
  settings: {
    language: {
      label: 'Language',
      // Each language is named in itself, so both read the same in either dictionary.
      english: 'English',
      spanish: 'Español',
      hint: 'Saved to your profile. Applies right away.',
      error: 'Unable to change the language.'
    }
  }
} as const;
