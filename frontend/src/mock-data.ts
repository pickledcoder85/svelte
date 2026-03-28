import type {
  DashboardSnapshot,
  FoodItem,
  MealInput,
  MealTemplateInput,
  RecipeImportInput,
  WeeklyMetrics
} from './types';

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

export const demoWeeklyMetrics: WeeklyMetrics = {
  calorie_goal: 14800,
  calories_consumed: 10360,
  macro_targets: { protein: 980, carbs: 1260, fat: 420 },
  macro_consumed: { protein: 742, carbs: 901, fat: 308 },
  weekly_weight_change: -1.2,
  adherence_score: 87
};

export const demoRecipe = {
  id: 'recipe-overnight-oats',
  title: 'Overnight Oats Base',
  favorite: true,
  steps: ['Combine oats, yogurt, and fruit.', 'Rest chilled overnight.', 'Portion into two servings.']
};

export const demoRecipeImports: RecipeImportInput & { sources: Array<{ kind: 'text' | 'pdf' | 'image'; label: string }> } = {
  title: demoRecipe.title,
  sourceType: 'text',
  rawContent: 'Combine oats, yogurt, and fruit. Rest chilled overnight.',
  sources: [
    { kind: 'text', label: 'Manual text input' },
    { kind: 'pdf', label: 'PDF upload' },
    { kind: 'image', label: 'Recipe photos' }
  ]
};

export const demoDashboardSnapshot: DashboardSnapshot = {
  connectionLabel: 'Demo data',
  connectionDetail: 'Use the backend to sync live weekly metrics and meal totals.',
  weeklyMetrics: demoWeeklyMetrics,
  mealTotals: {
    calories: 568,
    macros: { protein: 45.4, carbs: 84.1, fat: 7.1 },
    per_serving_calories: 284,
    per_serving_macros: { protein: 22.7, carbs: 42.1, fat: 3.6 }
  }
};

export const demoFoodStrip = {
  items: [
    { name: 'Rolled oats', calories: 389, serving: '100 g' },
    { name: 'Greek yogurt', calories: 59, serving: '100 g' },
    { name: 'Blueberries', calories: 57, serving: '100 g' }
  ],
  mealTemplate: {
    name: 'Protein breakfast bowl',
    servings: 2
  } satisfies MealTemplateInput
};

export const demoFoodResults: FoodItem[] = [
  {
    id: 'food-greek-yogurt',
    name: 'Greek yogurt, plain nonfat',
    brand: 'Generic',
    calories: 59,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 10.3, carbs: 3.6, fat: 0.4 },
    source: 'USDA'
  },
  {
    id: 'food-rolled-oats',
    name: 'Rolled oats',
    brand: 'Generic',
    calories: 389,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 16.9, carbs: 66.3, fat: 6.9 },
    source: 'USDA'
  },
  {
    id: 'food-blueberries',
    name: 'Blueberries',
    brand: null,
    calories: 57,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 0.7, carbs: 14.5, fat: 0.3 },
    source: 'USDA'
  }
];
