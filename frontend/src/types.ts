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

export type AppSection = 'dashboard' | 'meals' | 'recipes';

export interface RecipeAsset {
  kind: 'text' | 'pdf' | 'image';
  label: string;
}

export interface RecipeCard {
  id: string;
  title: string;
  favorite: boolean;
  default_yield: number;
  steps: string[];
  ingredients: IngredientInput[];
  assets: RecipeAsset[];
}

export interface BackendHealth {
  ok: boolean;
  service: string;
  timestamp: string;
}

export interface DashboardSnapshot {
  connectionLabel: string;
  connectionDetail: string;
  weeklyMetrics: WeeklyMetrics;
  mealTotals: MealTotals;
}
