export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeeklyMetrics {
  calorie_goal: number;
  calories_consumed: number;
  macro_targets: MacroTargets;
  macro_consumed: MacroTargets;
  weekly_weight_change: number;
  adherence_score: number;
}

export interface IngredientInput {
  id: string;
  food_id: string;
  name: string;
  grams: number;
  calories_per_100g: number;
  macros_per_100g: MacroTargets;
}

export interface MealInput {
  id: string;
  name: string;
  serving_count: number;
  ingredients: IngredientInput[];
}

export interface MealTotals {
  calories: number;
  macros: MacroTargets;
  per_serving_calories: number;
  per_serving_macros: MacroTargets;
}

export type DashboardRange = '1D' | '1W' | '1M' | '3M';

export interface DashboardTrendPoint {
  label: string;
  calories: number;
}

export interface DashboardRangeSeries {
  range: DashboardRange;
  label: string;
  detail: string;
  targetCalories: number;
  caloriesConsumed: number;
  macroTargets: MacroTargets;
  macroConsumed: MacroTargets;
  points: DashboardTrendPoint[];
}

export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  serving_size: number;
  serving_unit: string;
  macros: MacroTargets;
  source: 'USDA' | 'LABEL_SCAN' | 'CUSTOM';
}

export type AppSection = 'dashboard' | 'meals' | 'recipes' | 'foods';

export interface DashboardSnapshot {
  connectionLabel: string;
  connectionDetail: string;
  weeklyMetrics: WeeklyMetrics;
  mealTotals: MealTotals;
  rangeSeries: DashboardRangeSeries[];
  recipeImport?: RecipeImportResult;
}

export interface RecipeImportInput {
  title: string;
  sourceType: 'text' | 'pdf' | 'image';
  rawContent: string;
}

export interface RecipeImportResult {
  id: string;
  title: string;
  favorite: boolean;
}
