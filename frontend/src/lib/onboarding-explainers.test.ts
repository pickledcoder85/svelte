import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import { explainerBefore, onboardingExplainer } from './onboarding-explainers';

describe('onboarding explainers', () => {
  it('shows each explainer once, only before Daily activity and Your goal', () => {
    expect(explainerBefore('activity', [])).toBe('activity');
    expect(explainerBefore('goal', ['activity'])).toBe('goal');
    expect(explainerBefore('activity', ['activity'])).toBeNull();
    expect(explainerBefore('pace', [])).toBeNull();
    expect(explainerBefore('basics', [])).toBeNull();
  });

  it('says workouts are separate from daily activity', () => {
    const en = translatorFor('en');
    const es = translatorFor('es');
    expect(onboardingExplainer('activity', en).points.join(' ')).toMatch(/workouts/i);
    expect(onboardingExplainer('goal', en).points.join(' ')).toMatch(/workouts/i);
    expect(onboardingExplainer('activity', es).points.join(' ')).toMatch(/entrenamientos/i);
    expect(onboardingExplainer('goal', es).points.join(' ')).toMatch(/entrenamientos/i);
  });
});
