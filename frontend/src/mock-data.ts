import type { DashboardSnapshot, MealInput, RecipeCard, WeeklyMetrics } from './types';

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

export const demoRecipe: RecipeCard = {
  id: 'recipe-overnight-oats',
  title: 'Overnight Oats Base',
  favorite: true,
  default_yield: 2,
  steps: ['Combine oats, yogurt, and fruit.', 'Rest chilled overnight.', 'Portion into two servings.'],
  ingredients: demoMeal.ingredients,
  assets: [
    { kind: 'text', label: 'Manual recipe entry' },
    { kind: 'pdf', label: 'Uploaded PDF' },
    { kind: 'image', label: 'Step photo capture' }
  ]
};

export const demoWeeklyMetrics: WeeklyMetrics = {
  calorie_goal: 14800,
  calories_consumed: 10360,
  macro_targets: { protein: 980, carbs: 1260, fat: 420 },
  macro_consumed: { protein: 742, carbs: 901, fat: 308 },
  weekly_weight_change: -1.2,
  adherence_score: 87
};

export const demoDashboardSnapshot: DashboardSnapshot = {
  connectionLabel: 'Demo data',
  connectionDetail: 'Use the backend to sync live weekly metrics and meal totals.',
  weeklyMetrics: demoWeeklyMetrics,
  mealTotals: {
    calories: 567,
    macros: { protein: 44.6, carbs: 73.1, fat: 6.9 },
    per_serving_calories: 283.5,
    per_serving_macros: { protein: 22.3, carbs: 36.6, fat: 3.4 }
  }
};

export const demoFoodStrip = [
  { name: 'Rolled oats', calories: 389, serving: '100 g' },
  { name: 'Greek yogurt', calories: 59, serving: '100 g' },
  { name: 'Blueberries', calories: 57, serving: '100 g' }
];
