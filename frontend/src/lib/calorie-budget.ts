/**
 * Today's calorie budget, for the card at the top of Today:
 *   Target + Workouts (share) = Allowance − Eaten = Remaining
 * and where the target comes from (what you burn, and your pace):
 *   At rest (BMR) + Daily activity + Workouts (active) − pace.
 * Workouts are a bonus on top of a stable target; the activity level never moves.
 */
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

const n = (value: number) => Math.round(value).toLocaleString('en-US');

export function buildCalorieBudget({
  summary,
  sharePercent,
  bmrCalories,
  maintenanceCalories,
  workouts
}: {
  summary: DailyTargetSummary;
  sharePercent: number;
  bmrCalories?: number | null;
  maintenanceCalories?: number | null;
  workouts: BudgetWorkout[];
}): CalorieBudget {
  const remaining = summary.remainingCalories;
  const over = remaining < 0;
  const allowance = summary.allowanceCalories;
  const hasWorkouts = summary.exerciseCalories > 0;

  const lines: BudgetLine[] = [{ key: 'target', label: 'Target', value: summary.calorieTarget, sign: '' }];
  if (hasWorkouts) {
    const names = workouts.map((w) => (w.source === 'garmin' ? `${w.title} · Garmin` : w.title));
    lines.push({
      key: 'workouts',
      label: sharePercent > 0 ? `Workouts (${sharePercent}%)` : 'Workouts (off)',
      value: summary.workoutCaloriesAdded,
      sign: '+',
      detail: names.join(', ')
    });
    lines.push({ key: 'allowance', label: 'Allowance', value: allowance, sign: '=' });
  }
  lines.push({ key: 'eaten', label: 'Eaten', value: summary.intakeCalories, sign: '−' });
  lines.push({ key: 'remaining', label: over ? 'Over' : 'Remaining', value: Math.abs(remaining), sign: '=' });

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
    const bars = [bar('bmr', 'At rest (BMR)', bmrCalories), bar('activity', 'Daily activity', activity)];
    if (workoutsActive > 0) {
      bars.push(bar('workouts', 'Workouts (active)', workoutsActive));
    }
    const pace = summary.calorieTarget - maintenanceCalories;
    burn = {
      bars,
      total,
      pace,
      paceLabel: pace < 0 ? 'Your pace (deficit)' : pace > 0 ? 'Your pace (surplus)' : 'Your pace'
    };
  }

  const captionParts = [`Eaten ${n(summary.intakeCalories)}`];
  if (hasWorkouts) {
    captionParts.push(`Workouts +${n(summary.workoutCaloriesAdded)}`);
  }

  return {
    remaining,
    over,
    headline: over ? `${n(-remaining)} kcal over` : `${n(remaining)} kcal left`,
    progress: allowance > 0 ? Math.min(1, Math.max(0, summary.intakeCalories / allowance)) : 0,
    caption: captionParts.join(' · '),
    lines,
    burn,
    workoutCaloriesKept: Math.max(0, summary.exerciseCalories - summary.workoutCaloriesAdded)
  };
}

export function formatSigned(line: BudgetLine): string {
  const value = n(line.value);
  return line.sign === '+' ? `+${value}` : line.sign === '−' ? `−${value}` : value;
}
