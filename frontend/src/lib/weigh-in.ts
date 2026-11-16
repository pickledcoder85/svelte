/** The quick weigh-in: whole units plus tenths (daily trends need the decimal), in lb or kg. */
import type { UnitSystem } from './body-units';
import type { WeightEntry } from '../types';
import { wheelRange, nearestIndex, type WheelColumn } from './wheel-picker';

const KG_PER_LB = 0.45359237;
const RANGE: Record<UnitSystem, [number, number]> = { imperial: [70, 450], metric: [30, 205] };
const TENTHS = wheelRange(0, 9);

export function weighInColumns(units: UnitSystem): WheelColumn[] {
  const metric = units === 'metric';
  const [min, max] = RANGE[units];
  const whole = wheelRange(min, max);
  return [
    { key: 'whole', values: whole, labels: whole.map(String), unit: '', accessibilityLabel: metric ? 'Kilograms' : 'Pounds' },
    { key: 'tenth', values: TENTHS, labels: TENTHS.map((tenth) => `.${tenth}`), unit: metric ? 'kg' : 'lb', accessibilityLabel: 'Tenths' }
  ];
}

export function displayWeight(lbs: number, units: UnitSystem): number {
  return Math.round((units === 'metric' ? lbs * KG_PER_LB : lbs) * 10) / 10;
}

/** Wheels start at the last weigh-in (or the profile weight, or a typical weight). */
export function initialWeighInIndexes(units: UnitSystem, lastLbs: number | null): number[] {
  const columns = weighInColumns(units);
  const value = lastLbs ? displayWeight(lastLbs, units) : units === 'metric' ? 75 : 165;
  const whole = Math.floor(value + 1e-9);
  const tenth = Math.round((value - whole) * 10) % 10;
  return [nearestIndex(columns[0].values, whole), nearestIndex(columns[1].values, tenth)];
}

/** Pounds to save for the wheels' value. */
export function weighInLbs(units: UnitSystem, indexes: number[]): number {
  const columns = weighInColumns(units);
  const value = columns[0].values[indexes[0] ?? 0] + (columns[1].values[indexes[1] ?? 0] ?? 0) / 10;
  return Math.round((units === 'metric' ? value / KG_PER_LB : value) * 10) / 10;
}

/** "Last: 181.4 lb on Nov 14 · −1.2 lb this week" */
export function weighInSummary(entries: WeightEntry[], units: UnitSystem, today: string): string | null {
  const sorted = [...entries].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const last = sorted.at(-1);
  if (!last) {
    return null;
  }
  const unit = units === 'metric' ? 'kg' : 'lb';
  const lastDay = last.recorded_at.slice(0, 10);
  const when =
    lastDay === today
      ? 'today'
      : `on ${new Date(`${lastDay}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const parts = [`Last: ${displayWeight(last.weight_lbs, units)} ${unit} ${when}`];
  const weekAgo = new Date(`${today}T00:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekKey = weekAgo.toISOString().slice(0, 10);
  const before = [...sorted].reverse().find((entry) => entry.recorded_at.slice(0, 10) <= weekKey);
  if (before) {
    const change = displayWeight(last.weight_lbs, units) - displayWeight(before.weight_lbs, units);
    const rounded = Math.round(change * 10) / 10;
    parts.push(`${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded)} ${unit} in a week`);
  }
  return parts.join(' · ');
}
