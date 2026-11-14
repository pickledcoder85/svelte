import { describe, expect, it } from 'vitest';

import { ONBOARDING_WELCOME } from './onboarding-welcome';

describe('onboarding welcome copy', () => {
  it('greets without a name, since a new user has not given one yet', () => {
    expect(ONBOARDING_WELCOME.title).toBe('Welcome to Relish!');
    expect(JSON.stringify(ONBOARDING_WELCOME)).not.toMatch(/\$\{|undefined|null/);
  });

  it('previews the three parts of setup in order', () => {
    expect(ONBOARDING_WELCOME.sections.map((section) => section.title)).toEqual([
      'About you',
      'Your goal',
      'How you eat'
    ]);
  });
});
