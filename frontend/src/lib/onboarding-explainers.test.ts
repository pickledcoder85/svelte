import { describe, expect, it } from 'vitest';

import { explainerBefore, ONBOARDING_EXPLAINERS } from './onboarding-explainers';

describe('onboarding explainers', () => {
  it('shows each explainer once, only before Daily activity and Your goal', () => {
    expect(explainerBefore('activity', [])).toBe('activity');
    expect(explainerBefore('goal', ['activity'])).toBe('goal');
    expect(explainerBefore('activity', ['activity'])).toBeNull();
    expect(explainerBefore('pace', [])).toBeNull();
    expect(explainerBefore('basics', [])).toBeNull();
  });

  it('says workouts are separate from daily activity', () => {
    expect(ONBOARDING_EXPLAINERS.activity.points.join(' ')).toMatch(/workouts/i);
    expect(ONBOARDING_EXPLAINERS.goal.points.join(' ')).toMatch(/workouts/i);
  });
});
