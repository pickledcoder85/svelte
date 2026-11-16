/**
 * How the daily target is shared across the day's meals and snacks (mirrors
 * backend/app/services/meal_split.py). A bar with one segment per block and a handle between
 * each pair; moving a handle trades percent between the two blocks beside it.
 */
import type { MacroTargets } from '../types';

export type MealsPerDay = 3 | 4 | 5;
export type MealBlockKey = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner';

export const MEAL_PATTERNS: Record<MealsPerDay, MealBlockKey[]> = {
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'afternoon_snack', 'dinner'],
  5: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner']
};

export const DEFAULT_SPLITS: Record<MealsPerDay, number[]> = {
  3: [25, 35, 40],
  4: [25, 30, 10, 35],
  5: [20, 10, 30, 10, 30]
};

export const BLOCK_LABELS: Record<MealBlockKey, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning snack',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon snack',
  dinner: 'Dinner'
};

export const STEP = 5;

export function isSnack(key: MealBlockKey): boolean {
  return key.endsWith('snack');
}

export function minimumFor(key: MealBlockKey): number {
  return isSnack(key) ? 5 : 10;
}

/** Presets for each pattern (all valid splits). */
export const SPLIT_PRESETS: Record<MealsPerDay, Array<{ id: string; label: string; split: number[] }>> = {
  3: [
    { id: 'default', label: 'Default', split: [25, 35, 40] },
    { id: 'even', label: 'Even', split: [35, 30, 35] },
    { id: 'big-breakfast', label: 'Big breakfast', split: [35, 35, 30] },
    { id: 'light-dinner', label: 'Light dinner', split: [30, 40, 30] }
  ],
  4: [
    { id: 'default', label: 'Default', split: [25, 30, 10, 35] },
    { id: 'big-breakfast', label: 'Big breakfast', split: [35, 30, 10, 25] },
    { id: 'light-dinner', label: 'Light dinner', split: [30, 35, 10, 25] }
  ],
  5: [
    { id: 'default', label: 'Default', split: [20, 10, 30, 10, 30] },
    { id: 'even', label: 'Even', split: [25, 10, 25, 15, 25] },
    { id: 'big-breakfast', label: 'Big breakfast', split: [30, 10, 25, 10, 25] },
    { id: 'light-dinner', label: 'Light dinner', split: [25, 10, 30, 15, 20] }
  ]
};

export function isValidSplit(count: MealsPerDay, split: number[]): boolean {
  const keys = MEAL_PATTERNS[count];
  return (
    split.length === keys.length &&
    split.every((part, index) => Number.isInteger(part) && part % STEP === 0 && part >= minimumFor(keys[index])) &&
    split.reduce((sum, part) => sum + part, 0) === 100
  );
}

/**
 * Move the handle between block `handle` and block `handle + 1` so the boundary sits at
 * `boundary` percent along the bar (snapped to 5). Only those two blocks change, and neither
 * goes below its minimum.
 */
export function moveHandle(count: MealsPerDay, split: number[], handle: number, boundary: number): number[] {
  const keys = MEAL_PATTERNS[count];
  if (handle < 0 || handle >= split.length - 1) {
    return split;
  }
  const before = split.slice(0, handle).reduce((sum, part) => sum + part, 0);
  const pair = split[handle] + split[handle + 1];
  const snapped = Math.round(boundary / STEP) * STEP;
  const left = Math.min(pair - minimumFor(keys[handle + 1]), Math.max(minimumFor(keys[handle]), snapped - before));
  const next = [...split];
  next[handle] = left;
  next[handle + 1] = pair - left;
  return next;
}

export interface BlockBudget {
  key: MealBlockKey;
  label: string;
  snack: boolean;
  percent: number;
  calories: number;
  macros: MacroTargets;
}

/** Calories (to the nearest 10) and macros (whole grams) for each block. */
export function blockBudgets(count: MealsPerDay, split: number[], calorieTarget: number, macros: MacroTargets): BlockBudget[] {
  return MEAL_PATTERNS[count].map((key, index) => {
    const share = (split[index] ?? 0) / 100;
    return {
      key,
      label: BLOCK_LABELS[key],
      snack: isSnack(key),
      percent: split[index] ?? 0,
      calories: Math.round((calorieTarget * share) / 10) * 10,
      macros: {
        protein: Math.round(macros.protein * share),
        carbs: Math.round(macros.carbs * share),
        fat: Math.round(macros.fat * share)
      }
    };
  });
}
