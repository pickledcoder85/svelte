/**
 * The amount on the quick-add sheet: servings (− / + in half servings) or a weight. The numbers
 * shown here are a preview; the server works out what is logged from the same serving data.
 */
import type { FoodItem, MacroTargets } from '../types';

export type QuickAmount = { mode: 'servings'; servings: number } | { mode: 'grams'; grams: number };

export const SERVING_STEP = 0.5;
export const MAX_SERVINGS = 20;

export function defaultAmount(): QuickAmount {
  return { mode: 'servings', servings: 1 };
}

/**
 * True when a food's only "serving" is 100 g (or ml) from a database with no per-serving
 * numbers (Open Food Facts, USDA generic foods). "1 serving" would then mean 100 g, often ten
 * real servings, so it's logged by weight instead. A label scan that really says 100 g counts
 * as a real serving.
 */
export function isPer100Only(food: Pick<FoodItem, 'serving_grams' | 'serving_text' | 'source' | 'per_100g_only'>): boolean {
  if (food.per_100g_only !== undefined) {
    return food.per_100g_only;
  }
  return (
    food.serving_grams === 100 &&
    /^100\s*(g|ml)$/i.test((food.serving_text ?? '').trim()) &&
    food.source !== 'LABEL_SCAN' &&
    food.source !== 'CUSTOM'
  );
}

/** Where the amount starts: 1 serving, or an empty weight for per-100 g-only foods. */
export function defaultAmountFor(food: Pick<FoodItem, 'serving_grams' | 'serving_text' | 'source' | 'per_100g_only'> | null): QuickAmount {
  return food && isPer100Only(food) ? { mode: 'grams', grams: 0 } : defaultAmount();
}

export function stepServings(servings: number, direction: 1 | -1): number {
  const next = Math.round((servings + direction * SERVING_STEP) * 2) / 2;
  return Math.min(MAX_SERVINGS, Math.max(SERVING_STEP, next));
}

/** Servings the amount stands for; null when a weight is entered but the serving weight isn't known. */
export function servingsFor(food: Pick<FoodItem, 'serving_grams'>, amount: QuickAmount): number | null {
  if (amount.mode === 'servings') {
    return amount.servings;
  }
  if (!food.serving_grams || food.serving_grams <= 0 || !(amount.grams > 0)) {
    return null;
  }
  return amount.grams / food.serving_grams;
}

export function previewNutrition(
  food: Pick<FoodItem, 'calories' | 'macros' | 'serving_grams'>,
  amount: QuickAmount
): { calories: number; macros: MacroTargets } | null {
  const servings = servingsFor(food, amount);
  if (servings === null) {
    return null;
  }
  return {
    calories: Math.round(food.calories * servings),
    macros: {
      protein: Math.round(food.macros.protein * servings),
      carbs: Math.round(food.macros.carbs * servings),
      fat: Math.round(food.macros.fat * servings)
    }
  };
}

/** The log request body for the amount. */
export function logPayload(foodId: string, logDate: string, amount: QuickAmount) {
  return amount.mode === 'servings'
    ? { food_id: foodId, log_date: logDate, servings: amount.servings }
    : { food_id: foodId, log_date: logDate, grams: amount.grams };
}

export function formatServings(servings: number): string {
  return `${Number.isInteger(servings) ? servings : servings.toFixed(1)} serving${servings === 1 ? '' : 's'}`;
}
