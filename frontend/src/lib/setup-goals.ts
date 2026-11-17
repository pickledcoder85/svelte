/**
 * Goal, pace, and focus choices for setup, with the plain-language copy and the maths the
 * screens show. Calorie numbers come from the server preview (POST /profile/targets/preview),
 * which uses the same engine as the saved targets.
 */
import { translatorFor } from '../i18n/dictionaries';
import { en } from '../i18n/en';
import { formatDate, formatNumber, type TFunction, type TranslationKey } from '../i18n/translate';
import { LB_PER_KG, type UnitSystem } from './body-units';

/** Screens not translated yet get English, as before. */
const ENGLISH = translatorFor('en');

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
  /** Maintenance calories at each activity level, so the activity slider updates instantly. */
  maintenance_by_activity?: Partial<Record<'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active', number>>;
};

/** English text from the dictionary; goalText() and paceText() give it in any language. */
export const GOAL_OPTIONS: Array<{ id: GoalType; title: string; detail: string }> = (['lose', 'maintain', 'gain'] as const).map(
  (id) => ({ id, ...en.setup.goal.options[id] })
);

const PACE_IDS: { [G in GoalType]: Array<keyof (typeof en.setup.pace.options)[G] & GoalPace> } = {
  lose: ['light', 'recommended', 'extreme'],
  maintain: ['steady', 'build_muscle', 'fuel_training'],
  gain: ['lean', 'aggressive']
};

export const PACE_OPTIONS: Record<GoalType, Array<{ id: GoalPace; title: string; note?: string }>> = {
  lose: PACE_IDS.lose.map((id) => ({ id, ...en.setup.pace.options.lose[id] })),
  maintain: PACE_IDS.maintain.map((id) => ({ id, ...en.setup.pace.options.maintain[id] })),
  gain: PACE_IDS.gain.map((id) => ({ id, ...en.setup.pace.options.gain[id] }))
};

/** A goal's title and detail in `t`'s language. */
export function goalText(goal: GoalType, t: TFunction): { title: string; detail: string } {
  return { title: t(`setup.goal.options.${goal}.title`), detail: t(`setup.goal.options.${goal}.detail`) };
}

/** A pace's title and note (when it has one) in `t`'s language. */
export function paceText(goal: GoalType, pace: GoalPace, t: TFunction): { title: string; note?: string } {
  const option = PACE_OPTIONS[goal].find((item) => item.id === pace);
  if (!option) {
    return { title: '' };
  }
  // The path is checked above: this pace belongs to this goal.
  const base = `setup.pace.options.${goal}.${pace}`;
  return {
    title: t(`${base}.title` as TranslationKey),
    ...(option.note ? { note: t(`${base}.note` as TranslationKey) } : {})
  };
}

export const DEFAULT_PACE: Record<GoalType, GoalPace> = {
  lose: 'recommended',
  maintain: 'steady',
  gain: 'lean'
};

export function isPaceForGoal(goal: GoalType, pace: GoalPace | null | undefined): pace is GoalPace {
  return Boolean(pace) && PACE_OPTIONS[goal].some((option) => option.id === pace);
}

export function goalLabel(goal: GoalType | null | undefined, t: TFunction = ENGLISH): string {
  return goal && GOAL_OPTIONS.some((option) => option.id === goal) ? goalText(goal, t).title : '—';
}

export function paceLabel(goal: GoalType, pace: GoalPace | null | undefined, t: TFunction = ENGLISH): string {
  return paceText(goal, isPaceForGoal(goal, pace) ? pace : DEFAULT_PACE[goal], t).title;
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

export type PaceDisplay = {
  /** The daily calories the card shows. */
  calories: number;
  weeklyChangeLbs: number;
  /**
   * normal: at or above the minimum. below: under it and not decided yet (shown in red).
   * using_minimum: the user chose the minimum for this pace. opted_out: the floor is off.
   */
  state: 'normal' | 'below' | 'using_minimum' | 'opted_out';
  /** The honest calculation, for "Calculated 1,180 · using the recommended minimum". */
  calculatedCalories: number;
};

/**
 * What a pace card shows. The honest number is shown (in red) until the user decides; after
 * "use the minimum" the card shows the minimum it will use, and with the floor off the honest
 * number stays (still marked).
 */
export function paceDisplay(
  option: TargetPreviewOption,
  floor: CalorieFloorChoice,
  answeredWithMinimum: boolean
): PaceDisplay {
  const calculated = {
    calories: option.calorie_target,
    weeklyChangeLbs: option.weekly_change_lbs,
    calculatedCalories: option.calorie_target
  };
  if (!option.below_recommended_minimum) {
    return { ...calculated, state: 'normal' };
  }
  if (floor === 'off') {
    return { ...calculated, state: 'opted_out' };
  }
  if (answeredWithMinimum) {
    return {
      calories: option.floor_calorie_target,
      weeklyChangeLbs: option.floor_weekly_change_lbs,
      calculatedCalories: option.calorie_target,
      state: 'using_minimum'
    };
  }
  return { ...calculated, state: 'below' };
}

/** The extra calories to burn by moving more if eating at the minimum instead of below it. */
export function caloriesToMoveMore(option: TargetPreviewOption, minimum: number): number {
  return Math.max(0, Math.round(minimum - option.calorie_target));
}

/** Below about 800 kcal a day is a very-low-calorie diet, normally medically supervised. */
export const VERY_LOW_CALORIE_LIMIT = 800;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** "about 1 lb a week" or "about 0.45 kg a week"; empty when there is no change. */
export function formatWeeklyRate(weeklyChangeLbs: number, units: UnitSystem, t: TFunction = ENGLISH): string {
  const magnitude = Math.abs(weeklyChangeLbs);
  if (magnitude < 0.01) {
    return '';
  }
  if (units === 'metric') {
    const kg = Math.max(roundTo(magnitude / LB_PER_KG, 0.05), 0.05);
    return t('setup.weeklyRate', { value: formatNumber(Number(kg.toFixed(2)), { maximumFractionDigits: 2 }, t.locale), unit: 'kg' });
  }
  const lb = Math.max(roundTo(magnitude, 0.1), 0.1);
  return t('setup.weeklyRate', { value: formatNumber(Number(lb.toFixed(1)), { maximumFractionDigits: 1 }, t.locale), unit: 'lb' });
}

/** "1,850 kcal a day" ("1.850 kcal al día" in Spanish). */
export function formatCalories(value: number, t: TFunction = ENGLISH): string {
  return t('setup.kcalPerDay', { value: formatNumber(Math.round(value), undefined, t.locale) });
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

/** "mid-February 2027" style label for an estimated date ("mediados de febrero de 2027"). */
export function formatApproximateDate(date: Date, t: TFunction = ENGLISH): string {
  const day = date.getDate();
  const part = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
  const month = formatDate(date, { month: 'long' }, t.locale);
  return t(`setup.approximateDate.${part}`, { month, year: date.getFullYear() });
}
