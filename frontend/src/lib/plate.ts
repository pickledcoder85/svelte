/** A photo of food: each item's portion and its nutrition at that weight. */
import type { MacroTargets, PlateItem } from '../types';

export const GRAM_STEP = 10;
export const MAX_ITEM_GRAMS = 2000;

export function stepGrams(grams: number, direction: 1 | -1): number {
  const next = Math.round((grams + direction * GRAM_STEP) / GRAM_STEP) * GRAM_STEP;
  return Math.min(MAX_ITEM_GRAMS, Math.max(GRAM_STEP, next));
}

/** Nutrition for `grams` of an item: from its USDA food when matched, else the AI's estimate. */
export function itemNutrition(item: PlateItem, grams: number): { calories: number; macros: MacroTargets; fromUsda: boolean } {
  const food = item.food;
  if (food?.serving_grams) {
    const servings = grams / food.serving_grams;
    return {
      calories: Math.round(food.calories * servings),
      macros: {
        protein: Math.round(food.macros.protein * servings),
        carbs: Math.round(food.macros.carbs * servings),
        fat: Math.round(food.macros.fat * servings)
      },
      fromUsda: true
    };
  }
  const scale = item.estimated_grams > 0 ? grams / item.estimated_grams : 0;
  return {
    calories: Math.round(item.estimate.calories * scale),
    macros: {
      protein: Math.round(item.estimate.protein * scale),
      carbs: Math.round(item.estimate.carbs * scale),
      fat: Math.round(item.estimate.fat * scale)
    },
    fromUsda: false
  };
}

export function plateTotal(items: Array<{ item: PlateItem; grams: number }>): number {
  return items.reduce((sum, { item, grams }) => sum + itemNutrition(item, grams).calories, 0);
}
