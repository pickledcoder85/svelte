/**
 * Today's calorie budget, for the card at the top of Today:
 *   Target + Workouts (share) = Allowance − Eaten = Remaining
 * and where the target comes from (what you burn, and your pace):
 *   At rest (BMR) + Daily activity + Workouts (active) − pace.
 * Workouts are a bonus on top of a stable target; the activity level never moves.
 */
import { formatNumber, type TFunction } from '../i18n/translate';
import type { DailyTargetSummary } from './daily-home';

export interface BudgetWorkout {
  id: string;
  title: string;
  calories_burned: number;
  source?: string | null;
}

export interface BudgetLine {
  key: 'target' | 'workouts' | 'allowance' | 'eaten' | 'remaining';
  label: string;
  /** Signed for display: workouts +, eaten −. */
  value: number;
  sign: '' | '+' | '−' | '=';
  detail?: string;
}

export interface BurnBar {
  key: 'bmr' | 'activity' | 'workouts';
  label: string;
  value: number;
  /** 0–1 of the day's total burn, for the bar width. */
  fraction: number;
}

export interface CalorieBudget {
  remaining: number;
  over: boolean;
  /** "870 kcal left" / "120 kcal over" */
  headline: string;
  /** Eaten / allowance, 0–1 (capped). */
  progress: number;
  /** "Eaten 1,090 · Workouts +460" */
  caption: string;
  lines: BudgetLine[];
  /** Null when the profile has no BMR / maintenance yet. */
  burn: { bars: BurnBar[]; total: number; pace: number; paceLabel: string } | null;
  /** Workout calories not added back (the share below 100%): extra deficit on workout days. */
  workoutCaloriesKept: number;
}

const n = (value: number, t: TFunction) => formatNumber(Math.round(value), undefined, t.locale);

export function buildCalorieBudget({
  summary,
  sharePercent,
  bmrCalories,
  maintenanceCalories,
  workouts,
  t
}: {
  summary: DailyTargetSummary;
  sharePercent: number;
  bmrCalories?: number | null;
  maintenanceCalories?: number | null;
  workouts: BudgetWorkout[];
  t: TFunction;
}): CalorieBudget {
  const remaining = summary.remainingCalories;
  const over = remaining < 0;
  const allowance = summary.allowanceCalories;
  const hasWorkouts = summary.exerciseCalories > 0;

  const lines: BudgetLine[] = [{ key: 'target', label: t('budget.lines.target'), value: summary.calorieTarget, sign: '' }];
  if (hasWorkouts) {
    const names = workouts.map((w) => (w.source === 'garmin' ? `${w.title} · Garmin` : w.title));
    lines.push({
      key: 'workouts',
      label: sharePercent > 0 ? t('budget.lines.workoutsShare', { percent: sharePercent }) : t('budget.lines.workoutsOff'),
      value: summary.workoutCaloriesAdded,
      sign: '+',
      detail: names.join(', ')
    });
    lines.push({ key: 'allowance', label: t('budget.lines.allowance'), value: allowance, sign: '=' });
  }
  lines.push({ key: 'eaten', label: t('budget.lines.eaten'), value: summary.intakeCalories, sign: '−' });
  lines.push({ key: 'remaining', label: over ? t('budget.lines.over') : t('budget.lines.remaining'), value: Math.abs(remaining), sign: '=' });

  let burn: CalorieBudget['burn'] = null;
  if (bmrCalories && maintenanceCalories && maintenanceCalories >= bmrCalories) {
    const activity = maintenanceCalories - bmrCalories;
    const workoutsActive = summary.exerciseCalories;
    const total = bmrCalories + activity + workoutsActive;
    const bar = (key: BurnBar['key'], label: string, value: number): BurnBar => ({
      key,
      label,
      value,
      fraction: total > 0 ? value / total : 0
    });
    const bars = [bar('bmr', t('budget.bars.bmr'), bmrCalories), bar('activity', t('budget.bars.activity'), activity)];
    if (workoutsActive > 0) {
      bars.push(bar('workouts', t('budget.bars.workouts'), workoutsActive));
    }
    const pace = summary.calorieTarget - maintenanceCalories;
    burn = {
      bars,
      total,
      pace,
      paceLabel: t(pace < 0 ? 'budget.pace.deficit' : pace > 0 ? 'budget.pace.surplus' : 'budget.pace.even')
    };
  }

  const captionParts = [t('budget.captionEaten', { value: n(summary.intakeCalories, t) })];
  if (hasWorkouts) {
    captionParts.push(t('budget.captionWorkouts', { value: n(summary.workoutCaloriesAdded, t) }));
  }

  return {
    remaining,
    over,
    headline: over ? t('budget.over', { value: n(-remaining, t) }) : t('budget.left', { value: n(remaining, t) }),
    progress: allowance > 0 ? Math.min(1, Math.max(0, summary.intakeCalories / allowance)) : 0,
    caption: captionParts.join(' · '),
    lines,
    burn,
    workoutCaloriesKept: Math.max(0, summary.exerciseCalories - summary.workoutCaloriesAdded)
  };
}

export function formatSigned(line: BudgetLine, t: TFunction): string {
  const value = n(line.value, t);
  return line.sign === '+' ? `+${value}` : line.sign === '−' ? `−${value}` : value;
}
