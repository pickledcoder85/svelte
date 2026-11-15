/**
 * Goal, pace, and focus choices for setup, with the plain-language copy and the maths the
 * screens show. Calorie numbers come from the server preview (POST /profile/targets/preview),
 * which uses the same engine as the saved targets.
 */
import { LB_PER_KG, type UnitSystem } from './body-units';

export type GoalType = 'lose' | 'maintain' | 'gain';
export type GoalPace =
  | 'light'
  | 'recommended'
  | 'extreme'
  | 'lean'
  | 'aggressive'
  | 'steady'
  | 'build_muscle'
  | 'fuel_training';

export type CalorieFloorChoice = 'recommended' | 'off';

export type TargetPreviewOption = {
  goal_type: GoalType;
  goal_pace: GoalPace | null;
  /** The calculation as is (the target with the floor off). */
  calorie_target: number;
  daily_adjustment: number;
  weekly_change_lbs: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  /** Below the recommended minimum for the user's sex (1,200 women / 1,500 men). */
  below_recommended_minimum: boolean;
  /** The same pace with the recommended minimum applied. */
  floor_calorie_target: number;
  floor_weekly_change_lbs: number;
  floor_protein_target_g: number;
  floor_carbs_target_g: number;
  floor_fat_target_g: number;
};

export type TargetPreview = {
  bmr_calories: number;
  maintenance_calories: number;
  recommended_minimum_calories: number;
  /** True when even maintenance is under the minimum, so with the floor every target is a surplus. */
  maintenance_below_minimum?: boolean;
  options: TargetPreviewOption[];
  /** Maintenance calories at each activity level, so the activity gauge updates instantly. */
  maintenance_by_activity?: Partial<Record<'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active', number>>;
};

export const GOAL_OPTIONS: Array<{ id: GoalType; title: string; detail: string }> = [
  { id: 'lose', title: 'Lose Weight', detail: 'Eat a little less than you burn' },
  { id: 'maintain', title: 'Maintain Weight', detail: 'Eat about what you burn' },
  { id: 'gain', title: 'Gain Weight', detail: 'Eat a little more than you burn' }
];

export const PACE_OPTIONS: Record<GoalType, Array<{ id: GoalPace; title: string; note?: string }>> = {
  lose: [
    { id: 'light', title: 'Steady' },
    { id: 'recommended', title: 'Recommended', note: 'Best balance for most people' },
    { id: 'extreme', title: 'Fast', note: 'Harder to keep up' }
  ],
  maintain: [
    { id: 'steady', title: 'Stay steady', note: 'Balanced protein, carbs, and fat' },
    { id: 'build_muscle', title: 'Build muscle', note: 'More protein, for strength training' },
    { id: 'fuel_training', title: 'Fuel training', note: 'More carbs, for endurance training' }
  ],
  gain: [
    { id: 'lean', title: 'Lean', note: 'Slow and steady' },
    { id: 'aggressive', title: 'Faster', note: 'More of the gain may be fat' }
  ]
};

export const DEFAULT_PACE: Record<GoalType, GoalPace> = {
  lose: 'recommended',
  maintain: 'steady',
  gain: 'lean'
};

export function isPaceForGoal(goal: GoalType, pace: GoalPace | null | undefined): pace is GoalPace {
  return Boolean(pace) && PACE_OPTIONS[goal].some((option) => option.id === pace);
}

export function goalLabel(goal: GoalType | null | undefined): string {
  return GOAL_OPTIONS.find((option) => option.id === goal)?.title ?? '—';
}

export function paceLabel(goal: GoalType, pace: GoalPace | null | undefined): string {
  return PACE_OPTIONS[goal].find((option) => option.id === pace)?.title
    ?? PACE_OPTIONS[goal].find((option) => option.id === DEFAULT_PACE[goal])?.title
    ?? '';
}

export function findPreviewOption(
  preview: TargetPreview | null,
  goal: GoalType,
  pace: GoalPace | null | undefined
): TargetPreviewOption | null {
  if (!preview) {
    return null;
  }
  const wanted = isPaceForGoal(goal, pace) ? pace : DEFAULT_PACE[goal];
  return preview.options.find((option) => option.goal_type === goal && option.goal_pace === wanted) ?? null;
}

/** The option as it would be saved: with the recommended minimum applied, or as calculated. */
export function withCalorieFloor(
  option: TargetPreviewOption | null,
  floor: CalorieFloorChoice
): TargetPreviewOption | null {
  if (!option || floor === 'off') {
    return option;
  }
  return {
    ...option,
    calorie_target: option.floor_calorie_target,
    daily_adjustment: option.daily_adjustment + (option.floor_calorie_target - option.calorie_target),
    weekly_change_lbs: option.floor_weekly_change_lbs,
    protein_target_g: option.floor_protein_target_g,
    carbs_target_g: option.floor_carbs_target_g,
    fat_target_g: option.floor_fat_target_g
  };
}

/**
 * Whether choosing this pace should open the below-the-minimum warning: only when the floor is
 * on and the user hasn't already answered it during this setup.
 */
export function needsFloorWarning(
  option: TargetPreviewOption | null,
  floor: CalorieFloorChoice,
  alreadyAnswered: boolean
): boolean {
  return Boolean(option?.below_recommended_minimum) && floor === 'recommended' && !alreadyAnswered;
}

/** Below about 800 kcal a day is a very-low-calorie diet, normally medically supervised. */
export const VERY_LOW_CALORIE_LIMIT = 800;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** "about 1 lb a week" or "about 0.45 kg a week"; empty when there is no change. */
export function formatWeeklyRate(weeklyChangeLbs: number, units: UnitSystem): string {
  const magnitude = Math.abs(weeklyChangeLbs);
  if (magnitude < 0.01) {
    return '';
  }
  if (units === 'metric') {
    const kg = Math.max(roundTo(magnitude / LB_PER_KG, 0.05), 0.05);
    return `about ${Number(kg.toFixed(2))} kg a week`;
  }
  const lb = Math.max(roundTo(magnitude, 0.1), 0.1);
  return `about ${Number(lb.toFixed(1))} lb a week`;
}

export function formatCalories(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} kcal a day`;
}

/**
 * Rough date for reaching a goal weight at a weekly rate. Null when the goal weight is on the
 * wrong side (for example a "lose" goal above the current weight) or the rate is zero.
 */
export function estimateGoalDate(
  currentLbs: number,
  goalLbs: number,
  weeklyChangeLbs: number,
  today: Date = new Date()
): { weeks: number; date: Date } | null {
  const difference = goalLbs - currentLbs;
  if (!Number.isFinite(difference) || difference === 0 || weeklyChangeLbs === 0) {
    return null;
  }
  if (Math.sign(difference) !== Math.sign(weeklyChangeLbs)) {
    return null;
  }
  const weeks = Math.max(1, Math.ceil(difference / weeklyChangeLbs));
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + weeks * 7);
  return { weeks, date };
}

/** "mid-February 2027" style label for an estimated date. */
export function formatApproximateDate(date: Date): string {
  const day = date.getDate();
  const part = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${part}-${month} ${date.getFullYear()}`;
}

/** Bar widths (0-100) for the "at rest" and "with activity" energy bars. */
export function energyBarWidths(bmr: number, maintenance: number): { rest: number; active: number } {
  const top = Math.max(bmr, maintenance, 1);
  return { rest: Math.round((bmr / top) * 100), active: Math.round((maintenance / top) * 100) };
}
