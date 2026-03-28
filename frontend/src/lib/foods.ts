import type { FoodItem } from '../types';

export function selectFoodById(foods: FoodItem[], selectedId: string | null): FoodItem | null {
  if (selectedId) {
    const match = foods.find((food) => food.id === selectedId);
    if (match) {
      return match;
    }
  }

  return foods[0] ?? null;
}

export function foodMacroLine(food: FoodItem): string {
  return `${food.macros.protein}P / ${food.macros.carbs}C / ${food.macros.fat}F`;
}
