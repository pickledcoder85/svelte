/**
 * Water: glasses of 250 ml (a bottle is 500 ml), the day's total against the goal, and a day
 * series for Trends. Litres for metric, fluid ounces for imperial.
 */
import { addDaysToDateKey } from './dates';
import type { WaterEntry } from '../types';

export const GLASS_ML = 250;
export const BOTTLE_ML = 500;
export const DEFAULT_WATER_GOAL_ML = 2000;
/** Goals offered in Settings, in glasses. */
export const WATER_GOAL_GLASSES = [6, 8, 10, 12];
const ML_PER_FL_OZ = 29.5735;

export function glasses(ml: number): number {
  return Math.round((ml / GLASS_ML) * 10) / 10;
}

/** "1.25 L" or "42 oz". */
export function volumeLabel(ml: number, metric: boolean): string {
  if (metric) {
    return `${(Math.round(ml / 10) / 100).toLocaleString('en-US')} L`;
  }
  return `${Math.round(ml / ML_PER_FL_OZ)} oz`;
}

function glassCount(ml: number): string {
  const value = glasses(ml);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** "5 of 8 glasses · 1.25 L". */
export function waterSummary(totalMl: number, goalMl: number, metric: boolean): string {
  return `${glassCount(totalMl)} of ${glassCount(goalMl)} glasses · ${volumeLabel(totalMl, metric)}`;
}

/** Millilitres drunk each day. */
export function waterByDay(entries: WaterEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.logged_on, (totals.get(entry.logged_on) ?? 0) + entry.amount_ml);
  }
  return totals;
}

/** The day's drinks, newest last (for undo). */
export function waterForDay(entries: WaterEntry[], day: string): WaterEntry[] {
  return entries.filter((entry) => entry.logged_on === day);
}

export interface WaterDay {
  date: string;
  ml: number;
}

/** One point per day from start to end (oldest first); 0 when nothing was logged. */
export function waterDays(start: string, end: string, entries: WaterEntry[]): WaterDay[] {
  const totals = waterByDay(entries);
  const days: WaterDay[] = [];
  for (let date = start; date <= end; date = addDaysToDateKey(date, 1)) {
    days.push({ date, ml: totals.get(date) ?? 0 });
  }
  return days;
}
