import type { IngredientInput, MacroTargets, MealInput, MealTotals } from '../types';

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scaleMacros(macros: MacroTargets, multiplier: number): MacroTargets {
  return {
    protein: round1(macros.protein * multiplier),
    carbs: round1(macros.carbs * multiplier),
    fat: round1(macros.fat * multiplier)
  };
}

export function ingredientTotals(ingredient: IngredientInput): MealTotals['macros'] & { calories: number } {
  const multiplier = ingredient.grams / 100;

  return {
    calories: round1(ingredient.calories_per_100g * multiplier),
    ...scaleMacros(ingredient.macros_per_100g, multiplier)
  };
}

export function mealTotals(meal: MealInput): MealTotals {
  const totals = meal.ingredients.reduce(
    (acc, ingredient) => {
      const current = ingredientTotals(ingredient);
      acc.calories += current.calories;
      acc.protein += current.protein;
      acc.carbs += current.carbs;
      acc.fat += current.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    calories: round1(totals.calories),
    macros: {
      protein: round1(totals.protein),
      carbs: round1(totals.carbs),
      fat: round1(totals.fat)
    },
    per_serving_calories: round1(totals.calories / meal.serving_count),
    per_serving_macros: {
      protein: round1(totals.protein / meal.serving_count),
      carbs: round1(totals.carbs / meal.serving_count),
      fat: round1(totals.fat / meal.serving_count)
    }
  };
}

export function scaleMealIngredients(meal: MealInput, multiplier: number): MealInput {
  return {
    ...meal,
    serving_count: round1(meal.serving_count * multiplier),
    ingredients: meal.ingredients.map((ingredient) => ({
      ...ingredient,
      grams: round1(ingredient.grams * multiplier)
    }))
  };
}

export function progressPercent(consumed: number, target: number): number {
  if (target <= 0) {
    return 0;
  }

  return Math.min(Math.round((consumed / target) * 100), 100);
}

export function recipeScaleLabel(multiplier: number): string {
  const formatted = multiplier.toFixed(2);
  return `${formatted.endsWith('00') ? multiplier.toFixed(1) : formatted.replace(/0$/, '')}x`;
}
