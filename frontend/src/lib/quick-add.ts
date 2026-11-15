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
