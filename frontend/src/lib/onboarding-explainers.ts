/**
 * Explainer cards shown once per setup before Daily activity and before Your goal. They make
 * clear that daily activity is the baseline (not workouts) and that the calorie target is
 * about food. Like the welcome card, they are not counted in the 8 setup steps.
 */

export type ExplainerStep = 'activity' | 'goal';

export const ONBOARDING_EXPLAINERS: Record<
  ExplainerStep,
  { title: string; intro: string; points: string[]; action: string }
> = {
  activity: {
    title: 'Your day, not your workouts',
    intro: 'Next, tell me how much you move on a normal day: walking, chores, errands, and your job.',
    points: [
      "Don't count workouts. You'll log those in Tracker, and they add to that day's allowance.",
      'This sets your baseline: what you burn on an ordinary day.'
    ],
    action: 'Got it'
  },
  goal: {
    title: 'Your goal is about food',
    intro: 'Your daily calorie target comes from your baseline and your goal. It is what you eat to stay on pace.',
    points: [
      'It covers your diet and everyday movement.',
      'Workouts you log add to your daily allowance, so you can eat a bit more and still stay on pace.'
    ],
    action: 'Got it'
  }
};

/** The explainer to show when moving forward into a step, if it hasn't been seen this setup. */
export function explainerBefore(step: string, seen: readonly ExplainerStep[]): ExplainerStep | null {
  if (step !== 'activity' && step !== 'goal') {
    return null;
  }
  return seen.includes(step) ? null : step;
}
