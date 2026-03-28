import type {
  DashboardRangeSeries,
  DashboardSnapshot,
  ExerciseEntry,
  FoodItem,
  FoodLogSummary,
  MealInput,
  MealPlanDay,
  MealPrepTask,
  RecipeDefinition,
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

export const demoRecipe: RecipeDefinition = {
  id: 'recipe-overnight-oats',
  title: 'Overnight Oats Base',
  favorite: true,
  steps: ['Combine oats, yogurt, and fruit.', 'Rest chilled overnight.', 'Portion into two servings.'],
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
    }
  ],
  assets: [{ kind: 'text', url: null, content: 'Combine oats, yogurt, and fruit.' }],
  default_yield: 2
};

export const demoRecipeFavorites: RecipeDefinition[] = [
  demoRecipe,
  {
    id: 'recipe-summer-parfait',
    title: 'Summer Berry Parfait',
    favorite: true,
    steps: ['Layer yogurt, granola, and berries.', 'Chill briefly before serving.'],
    ingredients: [
      {
        id: 'ingredient-yogurt-parfait',
        food_id: 'food-greek-yogurt',
        name: 'Greek yogurt',
        grams: 200,
        calories_per_100g: 59,
        macros_per_100g: { protein: 10.3, carbs: 3.6, fat: 0.4 }
      },
      {
        id: 'ingredient-granola',
        food_id: 'food-granola',
        name: 'Granola',
        grams: 60,
        calories_per_100g: 471,
        macros_per_100g: { protein: 10, carbs: 64, fat: 20 }
      }
    ],
    assets: [{ kind: 'image', url: null, content: null }],
    default_yield: 2
  }
];

export const demoRecipeCatalog: RecipeDefinition[] = [
  ...demoRecipeFavorites,
  {
    id: 'recipe-citrus-chicken',
    title: 'Citrus Chicken Bowl',
    favorite: false,
    steps: ['Roast chicken and citrus vegetables.', 'Divide into bowls with grains.', 'Top with fresh herbs.'],
    ingredients: [
      {
        id: 'ingredient-chicken',
        food_id: 'food-chicken',
        name: 'Chicken breast',
        grams: 250,
        calories_per_100g: 165,
        macros_per_100g: { protein: 31, carbs: 0, fat: 3.6 }
      },
      {
        id: 'ingredient-rice',
        food_id: 'food-rice',
        name: 'Cooked rice',
        grams: 180,
        calories_per_100g: 130,
        macros_per_100g: { protein: 2.7, carbs: 28.2, fat: 0.3 }
      }
    ],
    assets: [{ kind: 'text', url: null, content: 'Roast chicken with citrus vegetables and grains.' }],
    default_yield: 4
  }
];

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
    { name: 'Chicken breast', calories: 165, serving: '100 g' },
    { name: 'Eggs, whole', calories: 143, serving: '100 g' },
    { name: 'Apples, Granny Smith', calories: 52, serving: '100 g' },
    { name: 'Bread, whole wheat', calories: 247, serving: '100 g' }
  ]
};

export const demoFoodResults: FoodItem[] = [
  {
    id: 'food-apples-granny-smith',
    name: 'Apples, Granny Smith',
    brand: null,
    calories: 52,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 0.3, carbs: 13.8, fat: 0.2 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-avocado',
    name: 'Avocado',
    brand: null,
    calories: 160,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 2, carbs: 8.5, fat: 14.7 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-bananas',
    name: 'Bananas',
    brand: null,
    calories: 89,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 1.1, carbs: 22.8, fat: 0.3 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-bread-whole-wheat',
    name: 'Bread, whole wheat',
    brand: 'Generic',
    calories: 247,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 12.5, carbs: 41.4, fat: 4.2 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-broccoli',
    name: 'Broccoli',
    brand: null,
    calories: 34,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 2.8, carbs: 6.6, fat: 0.4 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-greek-yogurt',
    name: 'Greek yogurt, plain nonfat',
    brand: 'Generic',
    calories: 59,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 10.3, carbs: 3.6, fat: 0.4 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-blueberries',
    name: 'Blueberries',
    brand: null,
    calories: 57,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 0.7, carbs: 14.5, fat: 0.3 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-carrots',
    name: 'Carrots',
    brand: null,
    calories: 41,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 0.9, carbs: 9.6, fat: 0.2 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-chicken-breast',
    name: 'Chicken breast, boneless skinless',
    brand: null,
    calories: 165,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 31, carbs: 0, fat: 3.6 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-chicken-thigh',
    name: 'Chicken thighs, boneless skinless',
    brand: null,
    calories: 209,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 26, carbs: 0, fat: 10.9 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-cottage-cheese',
    name: 'Cottage cheese, low fat',
    brand: 'Generic',
    calories: 81,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 10.5, carbs: 3.4, fat: 2.3 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-eggs',
    name: 'Eggs, whole',
    brand: '12 count carton',
    calories: 143,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 12.6, carbs: 0.7, fat: 9.5 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-ground-beef-8020',
    name: 'Beef, ground 80/20',
    brand: null,
    calories: 254,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 17.2, carbs: 0, fat: 20 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-jasmine-rice',
    name: 'Rice, jasmine cooked',
    brand: null,
    calories: 129,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 2.7, carbs: 27.8, fat: 0.3 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-milk-2pct',
    name: 'Milk, 2%',
    brand: 'Generic',
    calories: 50,
    serving_size: 100,
    serving_unit: 'ml',
    macros: { protein: 3.4, carbs: 4.8, fat: 2 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-rolled-oats',
    name: 'Rolled oats',
    brand: 'Generic',
    calories: 389,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 16.9, carbs: 66.3, fat: 6.9 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-peanut-butter',
    name: 'Peanut butter',
    brand: 'Generic',
    calories: 588,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 25.1, carbs: 19.6, fat: 50.4 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-potatoes-russet',
    name: 'Potatoes, russet',
    brand: null,
    calories: 79,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 2.9, carbs: 18.1, fat: 0.1 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-salmon',
    name: 'Salmon, Atlantic',
    brand: null,
    calories: 208,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 20.4, carbs: 0, fat: 13.4 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-spinach',
    name: 'Spinach',
    brand: null,
    calories: 23,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 2.9, carbs: 3.6, fat: 0.4 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-strawberries',
    name: 'Strawberries',
    brand: null,
    calories: 32,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 0.7, carbs: 7.7, fat: 0.3 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-sweet-potato',
    name: 'Sweet potato',
    brand: null,
    calories: 86,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 1.6, carbs: 20.1, fat: 0.1 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-white-onion',
    name: 'Onion, white',
    brand: null,
    calories: 40,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 1.1, carbs: 9.3, fat: 0.1 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-whey-protein',
    name: 'Whey protein powder',
    brand: 'Generic',
    calories: 412,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 80, carbs: 8, fat: 7 },
    source: 'CUSTOM',
    favorite: true
  },
  {
    id: 'food-white-rice',
    name: 'Rice, white cooked',
    brand: null,
    calories: 130,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 2.7, carbs: 28.2, fat: 0.3 },
    source: 'USDA',
    favorite: true
  },
  {
    id: 'food-zucchini',
    name: 'Zucchini',
    brand: null,
    calories: 17,
    serving_size: 100,
    serving_unit: 'g',
    macros: { protein: 1.2, carbs: 3.1, fat: 0.3 },
    source: 'USDA',
    favorite: true
  }
];

export const demoFoodLog: FoodLogSummary = {
  date: '2026-03-28',
  entries: [
    {
      id: 'food-log-entry-yogurt',
      food_id: 'food-greek-yogurt',
      food_name: 'Greek yogurt, plain nonfat',
      brand: 'Generic',
      source: 'USDA',
      grams: 170,
      calories: 100.3,
      macros: { protein: 17.5, carbs: 6.1, fat: 0.7 },
      logged_at: '08:10'
    },
    {
      id: 'food-log-entry-oats',
      food_id: 'food-rolled-oats',
      food_name: 'Rolled oats',
      brand: 'Generic',
      source: 'USDA',
      grams: 60,
      calories: 233.4,
      macros: { protein: 10.1, carbs: 39.8, fat: 4.1 },
      logged_at: '12:30'
    },
    {
      id: 'food-log-entry-blueberries',
      food_id: 'food-blueberries',
      food_name: 'Blueberries',
      brand: null,
      source: 'USDA',
      grams: 140,
      calories: 79.8,
      macros: { protein: 1.0, carbs: 20.3, fat: 0.4 },
      logged_at: '16:15'
    }
  ],
  totals: {
    calories: 413.5,
    macros: { protein: 28.6, carbs: 66.2, fat: 5.2 }
  }
};

export const demoExerciseEntries: ExerciseEntry[] = [
  {
    id: 'exercise-walk',
    title: 'Incline walk',
    duration_minutes: 35,
    calories_burned: 240,
    logged_at: '07:15',
    intensity: 'Moderate'
  },
  {
    id: 'exercise-lift',
    title: 'Upper body lift',
    duration_minutes: 52,
    calories_burned: 310,
    logged_at: '17:40',
    intensity: 'High'
  }
];

export const demoMealPlanDays: MealPlanDay[] = [
  {
    id: 'meal-plan-mon',
    label: 'Mon',
    focus: 'Training day',
    plan_date: '2026-03-30',
    slots: [
      { id: 'mon-breakfast', meal_label: 'Breakfast', title: 'Greek yogurt + berries', calories: 320, prep_status: 'Prepped' },
      { id: 'mon-lunch', meal_label: 'Lunch', title: 'Chicken rice bowls', calories: 610, prep_status: 'Prepped' },
      { id: 'mon-dinner', meal_label: 'Dinner', title: 'Salmon, potato, broccoli', calories: 710, prep_status: 'Needs prep' }
    ]
  },
  {
    id: 'meal-plan-tue',
    label: 'Tue',
    focus: 'Desk day',
    plan_date: '2026-03-31',
    slots: [
      { id: 'tue-breakfast', meal_label: 'Breakfast', title: 'Overnight oats', calories: 380, prep_status: 'Prepped' },
      { id: 'tue-lunch', meal_label: 'Lunch', title: 'Turkey wraps + carrots', calories: 540, prep_status: 'Flexible' },
      { id: 'tue-dinner', meal_label: 'Dinner', title: 'Beef tacos', calories: 760, prep_status: 'Needs prep' }
    ]
  },
  {
    id: 'meal-plan-wed',
    label: 'Wed',
    focus: 'Recovery day',
    plan_date: '2026-04-01',
    slots: [
      { id: 'wed-breakfast', meal_label: 'Breakfast', title: 'Egg scramble + toast', calories: 410, prep_status: 'Needs prep' },
      { id: 'wed-lunch', meal_label: 'Lunch', title: 'Chicken thigh salad', calories: 520, prep_status: 'Prepped' },
      { id: 'wed-dinner', meal_label: 'Dinner', title: 'Protein pasta bowl', calories: 690, prep_status: 'Flexible' }
    ]
  }
];

export const demoMealPrepTasks: MealPrepTask[] = [
  {
    id: 'prep-chicken',
    title: 'Bake 3 lb chicken breast',
    category: 'Protein',
    portions: '8 portions',
    status: 'Queued'
  },
  {
    id: 'prep-rice',
    title: 'Cook jasmine rice',
    category: 'Carb',
    portions: '6 cups cooked',
    status: 'In progress'
  },
  {
    id: 'prep-berries',
    title: 'Wash berries and portion cups',
    category: 'Produce',
    portions: '5 snack cups',
    status: 'Done'
  },
  {
    id: 'prep-bowls',
    title: 'Assemble chicken rice bowls',
    category: 'Assembly',
    portions: '4 lunches',
    status: 'Queued'
  }
];
