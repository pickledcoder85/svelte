/**
 * Explainer cards shown once per setup before Daily activity and before Your goal. They make
 * clear that daily activity is the baseline (not workouts) and that the calorie target is
 * about food. Like the welcome card, they are not counted in the 8 setup steps.
 */
import type { TFunction } from '../i18n/translate';

export type ExplainerStep = 'activity' | 'goal';

/** An explainer card's copy in `t`'s language. */
export function onboardingExplainer(
  step: ExplainerStep,
  t: TFunction
): { title: string; intro: string; points: string[]; action: string } {
  if (step === 'activity') {
    return {
      title: t('setup.explainers.activity.title'),
      intro: t('setup.explainers.activity.intro'),
      points: [t('setup.explainers.activity.workouts'), t('setup.explainers.activity.baseline')],
      action: t('setup.explainers.activity.action')
    };
  }
  return {
    title: t('setup.explainers.goal.title'),
    intro: t('setup.explainers.goal.intro'),
    points: [t('setup.explainers.goal.covers'), t('setup.explainers.goal.workouts')],
    action: t('setup.explainers.goal.action')
  };
}

/** The explainer to show when moving forward into a step, if it hasn't been seen this setup. */
export function explainerBefore(step: string, seen: readonly ExplainerStep[]): ExplainerStep | null {
  if (step !== 'activity' && step !== 'goal') {
    return null;
  }
  return seen.includes(step) ? null : step;
}
