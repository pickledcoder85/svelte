/**
 * Spanish strings (Colombian Spanish, addressing the user as "usted"). Typed by the English
 * dictionary, so a missing or extra key fails `npm run check`.
 */
import type { Dictionary } from './translate';

export const es: Dictionary = {
  settings: {
    language: {
      label: 'Idioma',
      english: 'English',
      spanish: 'Español',
      hint: 'Se guarda en su perfil y se aplica de inmediato.',
      error: 'No se pudo cambiar el idioma.'
    }
  }
};
