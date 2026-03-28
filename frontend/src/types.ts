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

export interface RecipeAsset {
  kind: 'text' | 'pdf' | 'image';
  url: string | null;
  content: string | null;
}

export interface FoodLogEntryInput {
  food_id: string;
  grams: number;
}

export interface FoodLogEntry {
  id: string;
  food_id: string;
  food_name: string;
  brand: string | null;
  source: FoodItem['source'];
  grams: number;
  calories: number;
  macros: MacroTargets;
  logged_at: string;
}

export interface FoodLogSummary {
  date: string;
  entries: FoodLogEntry[];
  totals: {
    calories: number;
    macros: MacroTargets;
  };
}

export interface ExerciseEntry {
  id: string;
  title: string;
  duration_minutes: number;
  calories_burned: number;
  logged_at: string;
  intensity: 'Low' | 'Moderate' | 'High';
  created_at?: string;
}

export interface RecipeDefinition {
  id: string;
  title: string;
  steps: string[];
  assets: RecipeAsset[];
  ingredients: IngredientInput[];
  default_yield: number;
  favorite: boolean;
}

export interface RecipeFavoriteSummary {
  id: string;
  title: string;
  favorite: boolean;
  updated_at: string;
  step_count: number;
  ingredient_count: number;
  asset_count: number;
}

export interface RecipeFavoritesResponse {
  items: RecipeFavoriteSummary[];
}

export interface RecipeFavoriteToggleResult {
  id: string;
  favorite: boolean;
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
  favorite: boolean;
}

export interface MealPlanSlot {
  id: string;
  meal_label: string;
  title: string;
  calories: number;
  prep_status: 'Prepped' | 'Needs prep' | 'Flexible';
}

export interface MealPlanDay {
  id: string;
  label: string;
  focus: string;
  plan_date?: string;
  created_at?: string;
  updated_at?: string;
  slots: MealPlanSlot[];
}

export interface MealPrepTask {
  id: string;
  title: string;
  category: 'Protein' | 'Carb' | 'Produce' | 'Assembly';
  portions: string;
  status: 'Queued' | 'In progress' | 'Done';
  scheduled_for?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AppSection =
  | 'dashboard'
  | 'tracker'
  | 'foods'
  | 'meals'
  | 'meal-plan'
  | 'meal-prep'
  | 'recipes';

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
