/**
 * How the daily target is shared across the day's meals and snacks (mirrors
 * backend/app/services/meal_split.py). Chosen in the meal-planning guide: meals per day, then a
 * named balance style. No manual split: anyone wanting something else builds meals by hand.
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
  3: [30, 35, 35],
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

export type MealStyleId = 'balanced' | 'big-breakfast' | 'big-lunch' | 'big-dinner' | 'taper-down' | 'build-up';

/** "How do you balance your meals?": named splits for each pattern (all valid). */
export const MEAL_STYLES: Array<{ id: MealStyleId; label: string; detail: string; splits: Record<MealsPerDay, number[]> }> = [
  {
    id: 'balanced',
    label: 'Balanced',
    detail: 'About the same at each meal',
    splits: { 3: [30, 35, 35], 4: [25, 30, 10, 35], 5: [20, 10, 30, 10, 30] }
  },
  {
    id: 'big-breakfast',
    label: 'Big breakfast',
    detail: 'Start the day with the biggest meal',
    splits: { 3: [40, 30, 30], 4: [35, 25, 10, 30], 5: [30, 10, 25, 10, 25] }
  },
  {
    id: 'big-lunch',
    label: 'Big lunch',
    detail: 'The main meal in the middle of the day',
    splits: { 3: [25, 45, 30], 4: [20, 40, 10, 30], 5: [20, 10, 40, 10, 20] }
  },
  {
    id: 'big-dinner',
    label: 'Big dinner',
    detail: 'Lighter by day, the main meal in the evening',
    splits: { 3: [25, 30, 45], 4: [20, 25, 10, 45], 5: [20, 5, 25, 10, 40] }
  },
  {
    id: 'taper-down',
    label: 'Taper down',
    detail: 'Big breakfast, getting lighter to a light dinner',
    splits: { 3: [40, 35, 25], 4: [35, 30, 10, 25], 5: [30, 10, 30, 10, 20] }
  },
  {
    id: 'build-up',
    label: 'Build up',
    detail: 'Light breakfast, building up to a big dinner',
    splits: { 3: [20, 35, 45], 4: [15, 30, 15, 40], 5: [15, 10, 25, 15, 35] }
  }
];

/** The style a split matches, or null for a custom (fine-tuned) split. */
export function styleForSplit(count: MealsPerDay, split: number[]): MealStyleId | null {
  return MEAL_STYLES.find((style) => style.splits[count].join() === split.join())?.id ?? null;
}

/** Spreading protein over 4-5 meals supports muscle protein synthesis; 3 + 2 snacks is suggested. */
export const RECOMMENDED_MEALS_PER_DAY: MealsPerDay = 5;

export function isValidSplit(count: MealsPerDay, split: number[]): boolean {
  const keys = MEAL_PATTERNS[count];
  return (
    split.length === keys.length &&
    split.every((part, index) => Number.isInteger(part) && part % STEP === 0 && part >= minimumFor(keys[index])) &&
    split.reduce((sum, part) => sum + part, 0) === 100
  );
}

export interface BlockBudget {
  key: MealBlockKey;
  label: string;
  snack: boolean;
  percent: number;
  calories: number;
  macros: MacroTargets;
}

/**
 * Split a whole into parts proportional to the shares, rounded to `unit`, so the parts add up
 * exactly to the whole rounded to `unit` (largest remainder: leftovers go to the parts that
 * lost most to rounding).
 */
export function apportion(whole: number, shares: number[], unit = 1): number[] {
  const total = Math.round(whole / unit);
  const raw = shares.map((share) => (whole * share) / 100 / unit);
  const parts = raw.map(Math.floor);
  let left = total - parts.reduce((sum, part) => sum + part, 0);
  const order = raw.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest);
  for (let i = 0; left > 0 && order.length > 0; i = (i + 1) % order.length, left -= 1) {
    parts[order[i].index] += 1;
  }
  return parts.map((part) => part * unit);
}

/** Calories (steps of 10) and macros (whole grams) for each block, adding up to the day's. */
export function blockBudgets(count: MealsPerDay, split: number[], calorieTarget: number, macros: MacroTargets): BlockBudget[] {
  const keys = MEAL_PATTERNS[count];
  const shares = keys.map((_, index) => split[index] ?? 0);
  const calories = apportion(calorieTarget, shares, 10);
  const protein = apportion(macros.protein, shares);
  const carbs = apportion(macros.carbs, shares);
  const fat = apportion(macros.fat, shares);
  return keys.map((key, index) => ({
    key,
    label: BLOCK_LABELS[key],
    snack: isSnack(key),
    percent: shares[index],
    calories: calories[index],
    macros: { protein: protein[index], carbs: carbs[index], fat: fat[index] }
  }));
}
