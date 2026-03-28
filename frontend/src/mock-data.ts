import type {
  DashboardRangeSeries,
  DashboardSnapshot,
  FoodItem,
  MealInput,
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

export const demoRangeSeries: DashboardRangeSeries[] = [
  {
    range: '1D',
    label: 'Today',
    detail: 'Meals and snacks logged today',
    targetCalories: 2100,
    caloriesConsumed: 1685,
    macroTargets: { protein: 140, carbs: 180, fat: 60 },
    macroConsumed: { protein: 126, carbs: 149, fat: 54 },
    points: [
      { label: '6a', calories: 120 },
      { label: '9a', calories: 410 },
      { label: '12p', calories: 760 },
      { label: '3p', calories: 1020 },
      { label: '6p', calories: 1390 },
      { label: '9p', calories: 1685 }
    ]
  },
  {
    range: '1W',
    label: 'This week',
    detail: 'Daily calories against your weekly cut target',
    targetCalories: 14800,
    caloriesConsumed: 10360,
    macroTargets: { protein: 980, carbs: 1260, fat: 420 },
    macroConsumed: { protein: 742, carbs: 901, fat: 308 },
    points: [
      { label: 'Mon', calories: 1480 },
      { label: 'Tue', calories: 1560 },
      { label: 'Wed', calories: 1335 },
      { label: 'Thu', calories: 1495 },
      { label: 'Fri', calories: 1410 },
      { label: 'Sat', calories: 1605 },
      { label: 'Sun', calories: 1475 }
    ]
  },
  {
    range: '1M',
    label: 'This month',
    detail: 'Weekly calorie totals across the last four weeks',
    targetCalories: 59200,
    caloriesConsumed: 43140,
    macroTargets: { protein: 3920, carbs: 5040, fat: 1680 },
    macroConsumed: { protein: 3095, carbs: 3820, fat: 1245 },
    points: [
      { label: 'Wk1', calories: 10810 },
      { label: 'Wk2', calories: 10440 },
      { label: 'Wk3', calories: 11530 },
      { label: 'Wk4', calories: 10360 }
    ]
  },
  {
    range: '3M',
    label: 'Last 3 months',
    detail: 'Monthly calorie totals and adherence trend',
    targetCalories: 177600,
    caloriesConsumed: 130780,
    macroTargets: { protein: 11760, carbs: 15120, fat: 5040 },
    macroConsumed: { protein: 10040, carbs: 12460, fat: 4190 },
    points: [
      { label: 'Jan', calories: 45210 },
      { label: 'Feb', calories: 43890 },
      { label: 'Mar', calories: 41680 }
    ]
  }
];

export const demoDashboardSnapshot: DashboardSnapshot = {
  connectionLabel: 'Demo data',
  connectionDetail: 'Use the backend to sync live weekly metrics and meal totals.',
  weeklyMetrics: demoWeeklyMetrics,
  mealTotals: {
    calories: 568,
    macros: { protein: 45.4, carbs: 84.1, fat: 7.1 },
    per_serving_calories: 284,
    per_serving_macros: { protein: 22.7, carbs: 42.1, fat: 3.6 }
  },
  rangeSeries: demoRangeSeries
};

export const demoFoodStrip = {
  items: [
    { name: 'Rolled oats', calories: 389, serving: '100 g' },
    { name: 'Greek yogurt', calories: 59, serving: '100 g' },
    { name: 'Blueberries', calories: 57, serving: '100 g' }
  ]
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
