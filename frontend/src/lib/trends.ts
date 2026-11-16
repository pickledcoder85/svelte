/**
 * Trends: daily calories against the allowance, the weight trend, and averages.
 *
 * The weight trend is an exponentially smoothed average (as in MacroFactor and The Hacker's
 * Diet): each weigh-in moves it 10% of the way per day, so water and salt swings of a pound or
 * two don't hide the real direction. Gaps between weigh-ins count as that many days.
 */
import { addDaysToDateKey } from './dates';
import { dailyAllowance } from './daily-home';
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
  allowance: number;
}

/** One point per day from start to today, oldest first. */
export function buildDaySeries({
  start,
  today,
  logs,
  exercise,
  calorieTarget,
  sharePercent
}: {
  start: string;
  today: string;
  logs: FoodLogSummary[];
  exercise: ExerciseEntry[];
  calorieTarget: number;
  sharePercent: number;
}): DayPoint[] {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const days: DayPoint[] = [];
  for (let date = start; date <= today; date = addDaysToDateKey(date, 1)) {
    const log = byDate.get(date);
    const workoutCalories = exercise.filter((entry) => entry.logged_on === date).reduce((sum, entry) => sum + entry.calories_burned, 0);
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
      allowance: dailyAllowance(calorieTarget, workoutCalories, sharePercent).allowance
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
