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
  servings?: number;
  /** Set when the entry was created by ticking a meal-plan slot. */
  meal_plan_slot_id?: string | null;
  /** breakfast, lunch, dinner, snack; null when not given. */
  meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  /** How it was counted, e.g. "2 large eggs (100 g)"; null for weighed foods. */
  quantity_label?: string | null;
}

export interface FoodLogSummary {
  /** Server id of the day's log; absent for an empty day that has no log yet. */
  log_id?: string;
  date: string;
  entries: FoodLogEntry[];
  totals: {
    calories: number;
    macros: MacroTargets;
  };
}

export type CalorieFloor = 'recommended' | 'off';

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  units: 'imperial' | 'metric';
  /** 'recommended': targets stop at 1,200 (women) / 1,500 (men); 'off': opted out. */
  calorie_floor?: CalorieFloor;
  /** Percent of logged workout calories added to the day's allowance (0 = off). */
  workout_calories_share?: 0 | 50 | 75 | 100;
  /** Meals a day (snacks between meals) and the target's split across them, in day order. */
  meals_per_day?: 3 | 4 | 5;
  meal_split?: number[];
  /** False until a pattern is picked in the meal-planning guide. */
  meal_pattern_chosen?: boolean;
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
  goal_pace?: 'light' | 'recommended' | 'extreme' | 'lean' | 'aggressive' | 'steady' | 'build_muscle' | 'fuel_training' | null;
  target_weight_lbs?: number | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active' | null;
  dietary_pattern?: 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'carnivore' | null;
  nutrition_style?: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'mediterranean' | 'paleo' | null;
  allergy_notes?: string | null;
  bmr_calories?: number | null;
  tdee_calories?: number | null;
  initial_calorie_target?: number | null;
  protein_target_g?: number | null;
  carbs_target_g?: number | null;
  fat_target_g?: number | null;
  fiber_target_g?: number | null;
  calculation_version?: string | null;
  target_source?: 'system_default' | 'user_custom' | 'agent_adjusted' | 'admin_override' | null;
}

export interface UserProfileUpdate {
  display_name: string | null;
  timezone: string;
  units: 'imperial' | 'metric';
  sex?: 'male' | 'female' | null;
  age_years?: number | null;
  height_cm?: number | null;
  current_weight_lbs?: number | null;
  goal_type?: 'lose' | 'maintain' | 'gain' | null;
  goal_pace?: 'light' | 'recommended' | 'extreme' | 'lean' | 'aggressive' | 'steady' | 'build_muscle' | 'fuel_training' | null;
  target_weight_lbs?: number | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active' | null;
  dietary_pattern?: 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'carnivore' | null;
  nutrition_style?: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'mediterranean' | 'paleo' | null;
  allergy_notes?: string | null;
  calorie_floor?: CalorieFloor;
  workout_calories_share?: 0 | 50 | 75 | 100;
  meals_per_day?: 3 | 4 | 5;
  meal_split?: number[];
}

export interface UserOnboardingRequest {
  sex: 'male' | 'female';
  age_years: number;
  height_cm: number;
  current_weight_lbs: number;
  goal_type: 'lose' | 'maintain' | 'gain';
  goal_pace?: 'light' | 'recommended' | 'extreme' | 'lean' | 'aggressive' | 'steady' | 'build_muscle' | 'fuel_training' | null;
  target_weight_lbs?: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  dietary_pattern: 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'carnivore';
  nutrition_style: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'mediterranean' | 'paleo';
  allergy_notes?: string | null;
  calorie_floor?: CalorieFloor;
  display_name?: string | null;
  units?: 'imperial' | 'metric';
  timezone?: string;
  /** Breakfast / lunch / dinner percents from "How do you balance your meals?". */
  meal_split?: number[];
}

export interface UserGoal {
  id: string;
  user_id: string;
  effective_at: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  fiber_goal?: number | null;
  goal_type?: 'lose' | 'maintain' | 'gain' | null;
  goal_pace?: 'light' | 'recommended' | 'extreme' | 'lean' | 'aggressive' | 'steady' | 'build_muscle' | 'fuel_training' | null;
  calculation_version?: string | null;
  target_source?: 'system_default' | 'user_custom' | 'agent_adjusted' | 'admin_override' | null;
  target_weight_lbs: number | null;
  created_at?: string | null;
}

export interface UserGoalCreate {
  effective_at: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  fiber_goal?: number | null;
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
  logged_on: string;
  logged_at: string;
  intensity: 'Low' | 'Moderate' | 'High';
  created_at?: string;
  /** Where it came from. For imports, calories_burned is the active calories Relish counts. */
  source?: 'manual' | 'garmin' | string;
  source_id?: string | null;
  activity_type?: string | null;
  distance_m?: number | null;
  /** The source's own numbers, as recorded. */
  source_calories_total?: number | null;
  source_bmr_calories?: number | null;
  /** Relish's resting calories for the workout's minutes (removed from the source total). */
  relish_resting_calories?: number | null;
  /** Added by hand: 'estimated' by Relish (MET values) or 'device' (a watch total entered). */
  calories_method?: 'estimated' | 'device' | string | null;
  /** How Relish counted it, e.g. "met1:pace" or "w1:relish_bmr". */
  calc_version?: string | null;
  met?: number | null;
  weight_lbs_at_time?: number | null;
}

export type WorkoutActivity = 'walk' | 'run' | 'bike' | 'swim' | 'strength' | 'other';
export type WorkoutEffort = 'easy' | 'moderate' | 'hard';

export interface WorkoutEstimate {
  met: number;
  active_calories: number;
  basis: 'pace' | 'effort';
  weight_lbs: number;
  /** False when no weight is known yet and a typical weight was used. */
  weight_known: boolean;
}

export interface GarminStatus {
  configured: boolean;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_status: 'ok' | 'error' | null;
  last_error: string | null;
  last_imported: number;
  /** Only on a sync response. matched: already logged in Relish, linked instead of added. */
  imported?: number;
  matched?: number;
}

export interface PlannedExerciseEntry {
  id: string;
  title: string;
  duration_minutes: number;
  calories_burned: number;
  planned_on: string;
  planned_at: string;
  intensity: 'Low' | 'Moderate' | 'High';
  completed_at?: string | null;
  completed_exercise_entry_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlannedWorkoutSegment {
  id: string;
  block_id: string;
  position: number;
  segment_type: 'time' | 'distance' | 'activity' | 'reps';
  title: string;
  activity_type?: 'weights' | 'swim' | 'bike' | 'run' | 'custom' | null;
  duration_minutes?: number | null;
  distance_value?: number | null;
  distance_unit?: 'm' | 'km' | 'mi' | 'yd' | null;
  reps?: number | null;
  intensity?: 'Low' | 'Moderate' | 'High' | null;
  notes?: string | null;
  calories_estimate?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlannedWorkoutBlock {
  id: string;
  session_id: string;
  block_kind: 'warmup' | 'activity' | 'cooldown';
  position: number;
  title: string;
  notes?: string | null;
  segments: PlannedWorkoutSegment[];
  created_at?: string;
  updated_at?: string;
}

export interface PlannedWorkoutSession {
  id: string;
  user_id: string;
  legacy_planned_exercise_entry_id?: string | null;
  title: string;
  workout_type: 'weights' | 'swim' | 'bike' | 'run' | 'custom';
  planned_on: string;
  planned_at: string;
  notes?: string | null;
  estimated_calories_burned: number;
  status: 'planned' | 'completed' | 'skipped';
  completed_at?: string | null;
  completed_exercise_entry_id?: string | null;
  blocks: PlannedWorkoutBlock[];
  created_at?: string;
  updated_at?: string;
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

export type DashboardMetricKey = 'net_calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

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
  source: 'USDA' | 'LABEL_SCAN' | 'CUSTOM' | 'OPEN_FOOD_FACTS';
  favorite: boolean;
  /** 14-digit GTIN for packaged foods saved from a barcode scan. */
  barcode?: string | null;
  /** The serving as printed on the label, e.g. "2 tbsp (32 g)". */
  serving_text?: string | null;
  /** Weight of one serving (grams, or ml when serving_basis is 'ml'); null until known. */
  serving_grams?: number | null;
  serving_basis?: 'g' | 'ml' | null;
  /** Other handy measures, e.g. { label: '1 cup', grams: 123 }. */
  portions?: Array<{ label: string; grams: number }>;
  /** In the signed-in user's food bank. */
  in_bank?: boolean;
  /** Nutrition is per 100 g only (no real serving known): log it by weight. */
  per_100g_only?: boolean;
}

export interface MealPlanSlot {
  id: string;
  meal_label: string;
  title: string;
  calories: number;
  items?: Array<{
    name: string;
    quantity_label: string;
    calories: number;
    macros: MacroTargets;
  }>;
  eaten_at?: string | null;
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
  | 'ingestion'
  | 'settings'
  | 'trends'
  | 'workout-plan';

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

export interface VisionFoodMatchCandidate {
  food_id: string;
  name: string;
  brand: string | null;
  source: FoodItem['source'];
  confidence: number;
}

export interface VisionPackageExtraction {
  package_text: string;
  product_name: string;
  brand_name: string | null;
  confidence: number;
  match_candidates: VisionFoodMatchCandidate[];
}

export interface VisionNutritionExtraction {
  label_text: string;
  product_name: string;
  brand_name: string | null;
  serving_size: string;
  calories: number;
  macros: MacroTargets;
  multiple_variants_detected: boolean;
  variants: VisionNutritionVariant[];
  confidence: number;
}

export interface VisionNutritionVariant {
  variant_name: string;
  serving_size: string;
  calories: number;
  macros: MacroTargets;
}

export interface VisionPackageScanResult {
  ingestion_job_id: string;
  output_id: string;
  source_kind: string;
  source_name: string;
  confidence: number;
  extraction: VisionPackageExtraction;
}

export interface VisionLabelScanResult {
  ingestion_job_id: string;
  output_id: string;
  source_kind: string;
  source_name: string;
  confidence: number;
  extraction: VisionNutritionExtraction;
}

export interface PlateItem {
  name: string;
  estimated_grams: number;
  /** A USDA food to log by weight; null when none matched (the estimate is used). */
  food: FoodItem | null;
  estimate: { calories: number; protein: number; carbs: number; fat: number };
}

export interface SmartScanResult {
  kind: 'nutrition_label' | 'package_front' | 'meal_plate' | 'unreadable';
  ingestion_job_id: string | null;
  output_id: string | null;
  label: VisionNutritionExtraction | null;
  package: VisionPackageScanResult['extraction'] | null;
  message: string | null;
  /** This label replaced a package scan's matched nutrition. */
  replaced: boolean;
  /** meal_plate: the foods seen. */
  items: PlateItem[];
}

export interface BarcodeFoodResult {
  barcode: string;
  found: boolean;
  source: 'food_bank' | 'open_food_facts' | 'usda' | null;
  /** Saved to the food bank; several when the product has variants. */
  foods: FoodItem[];
  message: string | null;
}

export interface BarcodeLookupResult {
  /** The scanned code normalised to a 14-digit GTIN. */
  barcode: string;
  found: boolean;
  source: 'food_bank' | 'open_food_facts' | 'usda' | null;
  /** Set when the barcode is already in the food bank. */
  food: FoodItem | null;
  /** A pending scan to review and save, when a food database knew the barcode. */
  output: IngestionOutput | null;
  message: string | null;
}

export interface SaveFoodsResult {
  saved_foods: FoodItem[];
}

export interface SuggestNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SuggestedItem {
  name: string;
  grams: number;
  role: string;
  food: FoodItem;
  nutrition: SuggestNutrition;
  /** Counted foods ("2 large eggs"); null when weighed. */
  count?: number | null;
  unit?: string | null;
  unit_plural?: string | null;
  /** "2 large eggs (100 g)" or "150 g". */
  quantity_label?: string;
}

export interface SuggestedMeal {
  name: string;
  why: string;
  items: SuggestedItem[];
  totals: SuggestNutrition;
  /** Ingredients Gus named that couldn't be matched to nutrition data (left out). */
  missing: string[];
}

export interface SuggestResponse {
  block: string;
  block_label: string;
  meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  budget: SuggestNutrition;
  remaining: SuggestNutrition;
  options: SuggestedMeal[];
  message: string | null;
  /** A meal already planned for this block: Log it offers to replace it. */
  planned_here: { slot_id: string; title: string; calories: number } | null;
  /** Photo mode: the foods Gus saw. */
  seen_items: string[];
}

export interface ProposedPlanMeal {
  meal: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  budget: SuggestNutrition;
  option: SuggestedMeal | null;
  message: string | null;
  prep: string;
}
