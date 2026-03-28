import type { MealInput } from './types';

export const demoMeal: MealInput = {
  id: 'meal-breakfast-bowl',
  name: 'Blueberry Protein Bowl',
  serving_count: 2,
  ingredients: [
    {
      id: 'ingredient-oats',
      food_id: 'food-oats',
      name: 'Rolled oats',
      grams: 80,
      calories_per_100g: 389,
      macros_per_100g: { protein: 16.9, carbs: 66.3, fat: 6.9 }
    },
    {
      id: 'ingredient-yogurt',
      food_id: 'food-greek-yogurt',
      name: 'Greek yogurt',
      grams: 300,
      calories_per_100g: 59,
      macros_per_100g: { protein: 10.3, carbs: 3.6, fat: 0.4 }
    },
    {
      id: 'ingredient-blueberries',
      food_id: 'food-blueberries',
      name: 'Blueberries',
      grams: 140,
      calories_per_100g: 57,
      macros_per_100g: { protein: 0.7, carbs: 14.5, fat: 0.3 }
    }
  ]
};
