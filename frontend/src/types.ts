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

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  units: 'imperial' | 'metric';
  user_created_at?: string | null;
  profile_created_at?: string | null;
  profile_updated_at?: string | null;
  setup_completed_at?: string | null;
  setup_complete: boolean;
  sex?: 'male' | 'female' | null;
  age_years?: number | null;
  height_cm?: number | null;
  current_weight_lbs?: number | null;
  goal_type?: 'lose' | 'maintain' | 'gain' | null;
  target_weight_lbs?: number | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active' | null;
  bmr_calories?: number | null;
  tdee_calories?: number | null;
  initial_calorie_target?: number | null;
}

export interface UserProfileUpdate {
  display_name: string | null;
  timezone: string;
  units: 'imperial' | 'metric';
}

export interface UserOnboardingRequest {
  sex: 'male' | 'female';
  age_years: number;
  height_cm: number;
  current_weight_lbs: number;
  goal_type: 'lose' | 'maintain' | 'gain';
  target_weight_lbs: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
}

export interface UserGoal {
  id: string;
  user_id: string;
  effective_at: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  target_weight_lbs: number | null;
  created_at?: string | null;
}

export interface UserGoalCreate {
  effective_at: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  target_weight_lbs: number | null;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  recorded_at: string;
  weight_lbs: number;
  created_at?: string | null;
}

export interface ProfileProgress {
  user_id: string;
  display_name: string | null;
  current_weight_lbs: number | null;
  start_weight_lbs: number | null;
  target_weight_lbs: number | null;
  weekly_weight_change: number;
  weight_entries: number;
  calorie_goal: number;
  calories_consumed: number;
  adherence_score: number;
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
  | 'profile'
  | 'tracker'
  | 'foods'
  | 'meals'
  | 'meal-plan'
  | 'meal-prep'
  | 'recipes'
  | 'ingestion';

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

export type IngestionReviewState = 'pending' | 'reviewed' | 'accepted' | 'rejected';

export interface IngestionOutput {
  id: string;
  ingestion_job_id: string;
  extracted_text: string | null;
  structured_json: unknown;
  confidence: number;
  reviewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  review_state: IngestionReviewState;
}

export interface IngestionReviewUpdate {
  review_state: Extract<IngestionReviewState, 'accepted' | 'rejected'>;
}
