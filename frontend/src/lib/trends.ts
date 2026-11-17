/**
 * Trends: daily calories against the allowance, the weight trend, and averages.
 *
 * The weight trend is an exponentially smoothed average (as in MacroFactor and The Hacker's
 * Diet): each weigh-in moves it 10% of the way per day, so water and salt swings of a pound or
 * two don't hide the real direction. Gaps between weigh-ins count as that many days.
 */
import { addDaysToDateKey } from './dates';
import { dailyAllowance } from './daily-home';
import { macroAllowance } from './macro-allowance';
import type { ExerciseEntry, FoodLogSummary, MacroTargets, WeightEntry } from '../types';

export type TrendRange = '1W' | '1M' | '3M';
export const TREND_RANGES: TrendRange[] = ['1W', '1M', '3M'];
export const RANGE_DAYS: Record<TrendRange, number> = { '1W': 7, '1M': 30, '3M': 90 };
/** Share of the gap to each new weigh-in the trend closes per day. */
export const TREND_SMOOTHING = 0.1;

export function rangeStart(today: string, range: TrendRange): string {
  return addDaysToDateKey(today, -(RANGE_DAYS[range] - 1));
}

export interface DayPoint {
  date: string;
  eaten: number;
  macros: MacroTargets;
  /** Food was logged that day (a day with nothing logged isn't counted as 0 in averages). */
  logged: boolean;
  workoutCalories: number;
  /** The day's base calorie target; the allowance is this plus the workout calories added. */
  baseTarget: number;
  allowance: number;
  /** The day's macro targets at its allowance (they grow on workout days). */
  macroAllowance: MacroTargets;
}

/** One point per day from start to today, oldest first. */
export function buildDaySeries({
  start,
  today,
  logs,
  exercise,
  calorieTarget,
  sharePercent,
  macroTargets = { protein: 0, carbs: 0, fat: 0 },
  fatShare = 0.25
}: {
  start: string;
  today: string;
  logs: FoodLogSummary[];
  exercise: ExerciseEntry[];
  calorieTarget: number;
  sharePercent: number;
  /** The base macro targets and fat's share of calories (for workout days' macros). */
  macroTargets?: MacroTargets;
  fatShare?: number;
}): DayPoint[] {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const days: DayPoint[] = [];
  for (let date = start; date <= today; date = addDaysToDateKey(date, 1)) {
    const log = byDate.get(date);
    const workoutCalories = exercise.filter((entry) => entry.logged_on === date).reduce((sum, entry) => sum + entry.calories_burned, 0);
    const allowance = dailyAllowance(calorieTarget, workoutCalories, sharePercent).allowance;
    days.push({
      date,
      eaten: Math.round(log?.totals.calories ?? 0),
      macros: {
        protein: Math.round(log?.totals.macros.protein ?? 0),
        carbs: Math.round(log?.totals.macros.carbs ?? 0),
        fat: Math.round(log?.totals.macros.fat ?? 0)
      },
      logged: Boolean(log && log.entries.length > 0),
      workoutCalories,
      baseTarget: Math.max(0, Math.round(calorieTarget)),
      allowance,
      macroAllowance: macroAllowance(macroTargets, calorieTarget, allowance, fatShare)
    });
  }
  return days;
}

export interface CalorieSummary {
  loggedDays: number;
  averageEaten: number;
  averageAllowance: number;
  /** Logged days within 10% either side of the allowance. */
  daysOnTarget: number;
  daysOver: number;
}

export function calorieSummary(days: DayPoint[]): CalorieSummary {
  const logged = days.filter((day) => day.logged);
  const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);
  return {
    loggedDays: logged.length,
    averageEaten: average(logged.map((day) => day.eaten)),
    averageAllowance: average(logged.map((day) => day.allowance)),
    daysOnTarget: logged.filter((day) => day.allowance > 0 && Math.abs(day.eaten - day.allowance) <= day.allowance * 0.1).length,
    daysOver: logged.filter((day) => day.allowance > 0 && day.eaten > day.allowance * 1.1).length
  };
}

export function averageMacros(days: DayPoint[]): MacroTargets {
  const logged = days.filter((day) => day.logged);
  if (logged.length === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }
  const total = logged.reduce(
    (sum, day) => ({ protein: sum.protein + day.macros.protein, carbs: sum.carbs + day.macros.carbs, fat: sum.fat + day.macros.fat }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  return {
    protein: Math.round(total.protein / logged.length),
    carbs: Math.round(total.carbs / logged.length),
    fat: Math.round(total.fat / logged.length)
  };
}

export interface WeightPoint {
  date: string;
  weight: number;
  trend: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/** Weigh-ins (one per day, the last that day) with the smoothed trend, oldest first. */
export function weightTrend(entries: WeightEntry[], smoothing = TREND_SMOOTHING): WeightPoint[] {
  const byDay = new Map<string, number>();
  [...entries]
    .sort((a, b) => `${a.recorded_at}${a.created_at ?? ''}`.localeCompare(`${b.recorded_at}${b.created_at ?? ''}`))
    .forEach((entry) => byDay.set(entry.recorded_at.slice(0, 10), entry.weight_lbs));
  const points: WeightPoint[] = [];
  let trend: number | null = null;
  let previous: string | null = null;
  for (const [date, weight] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (trend === null || previous === null) {
      trend = weight;
    } else {
      const gap = Math.max(1, daysBetween(previous, date));
      const step = 1 - Math.pow(1 - smoothing, gap);
      trend = trend + step * (weight - trend);
    }
    previous = date;
    points.push({ date, weight, trend: Math.round(trend * 10) / 10 });
  }
  return points;
}

/** Change in the trend per week, from the trend a week (or the range) before the last point. */
export function weeklyRate(points: WeightPoint[]): number | null {
  const last = points.at(-1);
  if (!last || points.length < 2) {
    return null;
  }
  const weekBefore = addDaysToDateKey(last.date, -7);
  const base = [...points].reverse().find((point) => point.date <= weekBefore) ?? points[0];
  const days = daysBetween(base.date, last.date);
  if (days < 3) {
    return null; // too short to call a weekly rate
  }
  return Math.round(((last.trend - base.trend) / days) * 7 * 10) / 10;
}

/** "Today", "Yesterday", or "Sat, Nov 14". */
export function historyDayLabel(date: string, today: string): string {
  if (date === today) {
    return 'Today';
  }
  if (date === addDaysToDateKey(today, -1)) {
    return 'Yesterday';
  }
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---- macros over time ---------------------------------------------------------------------------

export type MacroKey = 'protein' | 'carbs' | 'fat';
/** Within this many percent of the target counts as on target. */
export const MACRO_ON_TARGET_PERCENT = 10;
export type MacroStatus = 'on' | 'over' | 'under' | 'none';

export interface MacroDay {
  date: string;
  /** How far from the target, in percent of it (+40 = 40% over); null when nothing was logged. */
  percent: number | null;
  status: MacroStatus;
  /** Grams eaten and the day's target (its allowance). */
  eaten: number;
  target: number;
}

/** Each day's distance from its macro target (the day's allowance), in percent of it. */
export function macroDays(days: DayPoint[], macro: MacroKey): MacroDay[] {
  return days.map((day) => {
    const target = day.macroAllowance[macro];
    if (!day.logged || target <= 0) {
      return { date: day.date, percent: null, status: 'none', eaten: day.macros[macro], target };
    }
    const percent = Math.round(((day.macros[macro] - target) / target) * 100);
    const status: MacroStatus =
      Math.abs(percent) <= MACRO_ON_TARGET_PERCENT ? 'on' : percent > 0 ? 'over' : 'under';
    return { date: day.date, percent, status, eaten: day.macros[macro], target };
  });
}

export function macroCounts(days: MacroDay[]): { on: number; over: number; under: number } {
  return {
    on: days.filter((day) => day.status === 'on').length,
    over: days.filter((day) => day.status === 'over').length,
    under: days.filter((day) => day.status === 'under').length
  };
}

/** Whether a day's miss is the kind to watch: protein is a minimum (short is the problem);
 * carbs and fat are limits (over is the problem). */
export function macroMissIsBad(macro: MacroKey, status: MacroStatus): boolean {
  return macro === 'protein' ? status === 'under' : status === 'over';
}

// ---- weight projection --------------------------------------------------------------------------

export type ProjectionHorizon = '1M' | '2M' | '3M';
export const PROJECTION_HORIZONS: ProjectionHorizon[] = ['1M', '2M', '3M'];
export const HORIZON_DAYS: Record<ProjectionHorizon, number> = { '1M': 30, '2M': 60, '3M': 90 };
/** About 3,500 kcal per pound, the rule setup uses for the weekly rate. */
const KCAL_PER_LB = 3500;
/** A trend needs about a week of weigh-ins before it's worth carrying forward. */
export const MIN_TREND_DAYS = 7;
/** Goal dates further out than this aren't shown ("not at this rate"). */
const MAX_GOAL_DAYS = 730;

/** The planned weekly change (lb) at a calorie target, from the daily burn: negative to lose. */
export function plannedWeeklyChange(calorieTarget: number, dailyBurn: number | null | undefined): number | null {
  if (!(calorieTarget > 0) || !dailyBurn || !(dailyBurn > 0)) {
    return null;
  }
  return Math.round((((calorieTarget - dailyBurn) * 7) / KCAL_PER_LB) * 10) / 10;
}

/** The trend's weekly rate when there is at least a week of weigh-ins, else null. */
export function projectableRate(points: WeightPoint[]): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || daysBetween(first.date, last.date) < MIN_TREND_DAYS) {
    return null;
  }
  return weeklyRate(points);
}

/** A straight projection: from a weight on a date, at a weekly rate, for some days. */
export function projectLine(from: { date: string; weight: number }, weekly: number, days: number): Array<{ date: string; weight: number }> {
  return [
    { date: from.date, weight: from.weight },
    { date: addDaysToDateKey(from.date, days), weight: Math.round((from.weight + (weekly * days) / 7) * 10) / 10 }
  ];
}

/** When the goal is reached at a weekly rate; the start date if already there (or past it in
 * the goal's direction: below it when losing, above it when gaining); null when the rate moves
 * away from it (or is flat), or it's more than two years out. */
export function goalDate(
  from: { date: string; weight: number },
  weekly: number | null,
  goal: number | null,
  direction: 'lose' | 'gain' | 'maintain' | null = null
): string | null {
  if (goal === null || weekly === null) {
    return null;
  }
  const gap = goal - from.weight;
  if (Math.abs(gap) < 0.05 || (direction === 'lose' && gap >= 0) || (direction === 'gain' && gap <= 0)) {
    return from.date;
  }
  if (weekly === 0 || Math.sign(weekly) !== Math.sign(gap)) {
    return null;
  }
  const days = Math.ceil((gap / weekly) * 7);
  return days > MAX_GOAL_DAYS ? null : addDaysToDateKey(from.date, days);
}

export type PaceStatus = 'on' | 'ahead' | 'behind' | 'drifting';

/** The trend against the plan. Close enough (a quarter of the plan, at least 0.2 lb a week) is
 * on pace; maintaining, any real drift is "drifting". */
export function paceStatus(actual: number | null, planned: number | null): PaceStatus | null {
  if (actual === null || planned === null) {
    return null;
  }
  const tolerance = Math.max(0.2, Math.abs(planned) * 0.25);
  if (Math.abs(actual - planned) <= tolerance) {
    return 'on';
  }
  if (Math.abs(planned) < 0.1) {
    return 'drifting';
  }
  return (planned < 0 ? actual < planned : actual > planned) ? 'ahead' : 'behind';
}
