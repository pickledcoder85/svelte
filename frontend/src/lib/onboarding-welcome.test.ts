import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import { onboardingWelcome } from './onboarding-welcome';

describe('onboarding welcome copy', () => {
  it('greets without a name, since a new user has not given one yet', () => {
    const welcome = onboardingWelcome(translatorFor('en'));
    expect(welcome.title).toBe('Welcome to Relish!');
    expect(JSON.stringify(welcome)).not.toMatch(/\$\{|\{\w+\}|undefined|null/);
  });

  it('previews the three parts of setup in order', () => {
    expect(onboardingWelcome(translatorFor('en')).sections.map((section) => section.title)).toEqual([
      'About you',
      'Your goal',
      'How you eat'
    ]);
    expect(onboardingWelcome(translatorFor('es')).sections.map((section) => `${section.number} ${section.title}`)).toEqual([
      '1 Sobre usted',
      '2 Su meta',
      '3 Cómo come'
    ]);
  });
});
