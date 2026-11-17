import { localDateKey } from './dates';
import type { TargetPreview } from './setup-goals';
import type { MealSlot } from './meal-slots';
import type {
  BarcodeLookupResult,
  ExerciseEntry,
  PlannedExerciseEntry,
  PlannedWorkoutSession,
  IngestionOutput,
  VisionLabelScanResult,
  VisionPackageScanResult,
  FoodItem,
  GarminStatus,
  BarcodeFoodResult,
  SmartScanResult,
  SuggestResponse,
  ProposedPlanMeal,
  FoodLogEntryInput,
  FoodLogSummary,
  MealInput,
  MacroTargets,
  MealPlanDay,
  MealPlanSlot,
  MealPrepTask,
  MealTotals,
  RecipeDefinition,
  RecipeImportInput,
  RecipeImportResult,
  UserGoal,
  UserGoalCreate,
  ProfileProgress,
  UserOnboardingRequest,
  SaveFoodsResult,
  WeightEntry,
  UserProfile,
  UserProfileUpdate,
  WaterEntry,
  WeeklyMetrics,
  WorkoutActivity,
  WorkoutEffort,
  WorkoutEstimate
} from '../types';

interface ApiFoodLogEntry {
  id: string;
  entry_type: 'food' | 'meal';
  food_item_id: string | null;
  meal_template_id: string | null;
  meal_plan_slot_id?: string | null;
  meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  quantity_label?: string | null;
  display_name: string | null;
  brand: string | null;
  source: 'USDA' | 'LABEL_SCAN' | 'CUSTOM' | 'OPEN_FOOD_FACTS' | null;
  grams: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

interface ApiFoodLog {
  id: string;
  user_id: string;
  log_date: string;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  entries: ApiFoodLogEntry[];
}

interface AuthSession {
  access_token: string;
  provider?: 'local' | 'supabase' | 'tailscale' | 'dev';
}

interface SessionResponse {
  session: AuthSession;
}

export interface ApiHealth {
  ok: boolean;
  service: string;
  timestamp: string;
  auth_mode?: 'local' | 'tailscale';
}

/**
 * Marker stored as the session token when the server identifies the owner on its own
 * (Tailscale identity in production, dev auto-login locally). It is not a credential;
 * the server ignores it.
 */
export const OWNER_SESSION_TOKEN = 'owner-session';

/** Header the server requires on every write in Tailscale mode (cross-site request guard). */
export const RELISH_REQUEST_HEADER = 'X-Relish-Request';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** fetch wrapper that marks writes as coming from the Relish app. */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return init === undefined ? fetch(input) : fetch(input, init);
  }
  return fetch(input, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), [RELISH_REQUEST_HEADER]: '1' }
  });
}

export interface ApiError extends Error {
  status: number;
}

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

function readExpoPublicApiBaseUrl(): string | undefined {
  // Must stay a literal `process.env.EXPO_PUBLIC_...` expression: Expo replaces it with the
  // value at build time. Reading it any other way leaves production builds on the default.
  return process.env.EXPO_PUBLIC_API_BASE_URL;
}

export function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return DEFAULT_API_BASE_URL;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  // A relative base such as "/api" targets the origin that served the app (production).
  return trimmed.length > 0 ? trimmed : DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(readExpoPublicApiBaseUrl());
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

let unauthorizedHandler: (() => void) | null = null;

/** Called once per 401 from a data request, so the app can return to sign-in. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }
    let detail = '';
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
        detail = payload.detail.trim();
      }
    } catch {
      detail = '';
    }
    const message = detail ? `Request failed with status ${response.status}: ${detail}` : `Request failed with status ${response.status}`;
    const error = new Error(message) as ApiError;
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export async function fetchBackendHealth(): Promise<ApiHealth> {
  return readJson<ApiHealth>(await apiFetch(buildApiUrl('/health')));
}

export async function fetchWeeklyMetrics(accessToken?: string | null): Promise<WeeklyMetrics> {
  return readJson<WeeklyMetrics>(
    await apiFetch(buildApiUrl('/nutrition/weekly-metrics'), optionalAuthInit(accessToken))
  );
}

function summarizeFoodLog(log: ApiFoodLog): FoodLogSummary {
  const entries = log.entries.map((entry) => ({
    id: entry.id,
    food_id: entry.food_item_id ?? entry.meal_template_id ?? entry.id,
    food_name:
      entry.display_name
      ?? (entry.entry_type === 'meal'
        ? `Saved meal ${entry.meal_template_id ?? ''}`.trim()
        : `Saved food ${entry.food_item_id ?? ''}`.trim()),
    brand: entry.brand,
    source: entry.source ?? 'CUSTOM',
    grams: entry.grams,
    calories: entry.calories,
    macros: {
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat
    },
    logged_at: entry.created_at,
    servings: entry.servings,
    meal_plan_slot_id: entry.meal_plan_slot_id ?? null,
    meal_slot: entry.meal_slot ?? null,
    quantity_label: entry.quantity_label ?? null
  }));

  return {
    log_id: log.id,
    date: log.log_date,
    entries,
    totals: {
      calories: entries.reduce((sum, entry) => sum + entry.calories, 0),
      macros: entries.reduce(
        (sum, entry) => ({
          protein: sum.protein + entry.macros.protein,
          carbs: sum.carbs + entry.macros.carbs,
          fat: sum.fat + entry.macros.fat
        }),
        { protein: 0, carbs: 0, fat: 0 }
      )
    }
  };
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  return readJson<UserProfile>(
    await apiFetch(buildApiUrl('/profile'), {
      headers: authHeaders(accessToken)
    })
  );
}

/** Profile > Reset profile: clears the setup answers so setup runs again. Logs and foods stay. */
export async function resetProfileSetup(accessToken: string): Promise<UserProfile> {
  return readJson<UserProfile>(
    await apiFetch(buildApiUrl('/profile/setup/reset'), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function updateProfile(
  payload: UserProfileUpdate,
  accessToken: string
): Promise<UserProfile> {
  return readJson<UserProfile>(
    await apiFetch(buildApiUrl('/profile'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchUserGoals(accessToken: string): Promise<UserGoal[]> {
  return readJson<UserGoal[]>(
    await apiFetch(buildApiUrl('/profile/goals'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchProfileProgress(accessToken: string): Promise<ProfileProgress> {
  return readJson<ProfileProgress>(
    await apiFetch(buildApiUrl('/profile/progress'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchWeightEntries(accessToken: string): Promise<WeightEntry[]> {
  return readJson<WeightEntry[]>(
    await apiFetch(buildApiUrl('/profile/weights'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createWeightEntry(
  payload: { recorded_at: string; weight_lbs: number },
  accessToken: string
): Promise<WeightEntry> {
  return readJson<WeightEntry>(
    await apiFetch(buildApiUrl('/profile/weights'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function createUserGoal(payload: UserGoalCreate, accessToken: string): Promise<UserGoal> {
  return readJson<UserGoal>(
    await apiFetch(buildApiUrl('/profile/goals'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function searchFoods(query: string, accessToken?: string | null): Promise<FoodItem[]> {
  const normalizedQuery = query.trim();

  return readJson<FoodItem[]>(
    await apiFetch(
      buildApiUrl(`/nutrition/foods/search?q=${encodeURIComponent(normalizedQuery)}`),
      optionalAuthInit(accessToken)
    )
  );
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`
  };
}

function optionalAuthHeaders(accessToken?: string | null): Record<string, string> {
  return accessToken ? authHeaders(accessToken) : {};
}

function optionalAuthInit(accessToken?: string | null): RequestInit | undefined {
  return accessToken ? { headers: authHeaders(accessToken) } : undefined;
}

/**
 * Asks the server whether it already knows who this is (Tailscale identity or dev
 * auto-login). Resolves to null when the server needs an explicit local sign-in.
 */
export async function fetchOwnerSession(): Promise<AuthSession | null> {
  return fetchCurrentSession();
}

/**
 * Returns the session the server sees for this request (owner identity, or the given local
 * token), or null when it sees none. A 401 here is an answer, not an expired session.
 */
export async function fetchCurrentSession(accessToken?: string | null): Promise<AuthSession | null> {
  const url = buildApiUrl('/auth/session');
  const response = accessToken
    ? await apiFetch(url, { headers: authHeaders(accessToken) })
    : await apiFetch(url);
  if (response.status === 401) {
    return null;
  }
  const payload = await readJson<SessionResponse>(response);
  return payload.session;
}

export async function createLocalSession(
  email: string,
  displayName: string,
  intent: 'signup' | 'signin' = 'signup'
): Promise<AuthSession> {
  const response = await readJson<SessionResponse>(
    await apiFetch(buildApiUrl('/auth/session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, display_name: displayName, intent })
    })
  );
  return response.session;
}

export async function completeOnboarding(
  payload: UserOnboardingRequest,
  accessToken: string
): Promise<UserProfile> {
  return readJson<UserProfile>(
    await apiFetch(buildApiUrl('/profile/onboarding'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchFavoriteFoods(accessToken: string): Promise<FoodItem[]> {
  return readJson<FoodItem[]>(
    await apiFetch(buildApiUrl('/nutrition/favorites/foods'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function searchFoodsWithSession(query: string, accessToken: string): Promise<FoodItem[]> {
  const normalizedQuery = query.trim();

  return readJson<FoodItem[]>(
    await apiFetch(buildApiUrl(`/nutrition/foods/search?q=${encodeURIComponent(normalizedQuery)}`), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function addFavoriteFood(foodId: string, accessToken: string): Promise<{ food_id: string; favorite: boolean }> {
  return readJson<{ food_id: string; favorite: boolean }>(
    await apiFetch(buildApiUrl(`/nutrition/favorites/foods/${foodId}`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function unfavoriteFood(
  foodId: string,
  accessToken: string
): Promise<{ food_id: string; favorite: boolean }> {
  return readJson<{ food_id: string; favorite: boolean }>(
    await apiFetch(buildApiUrl(`/nutrition/favorites/foods/${foodId}`), {
      method: 'DELETE',
      headers: authHeaders(accessToken)
    })
  );
}

async function fetchFoodLogs(accessToken: string): Promise<ApiFoodLog[]> {
  return readJson<ApiFoodLog[]>(
    await apiFetch(buildApiUrl('/nutrition/logs'), {
      headers: authHeaders(accessToken)
    })
  );
}

async function createFoodLogForDate(logDate: string, accessToken: string): Promise<ApiFoodLog> {
  return readJson<ApiFoodLog>(
    await apiFetch(buildApiUrl('/nutrition/logs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ log_date: logDate })
    })
  );
}

export async function fetchTodaysFoodLog(accessToken: string): Promise<FoodLogSummary> {
  return fetchFoodLogForDate(localDateKey(), accessToken);
}

export async function fetchFoodLogForDate(logDate: string, accessToken: string): Promise<FoodLogSummary> {
  const logs = await fetchFoodLogs(accessToken);
  const matchingLog = logs.find((log) => log.log_date === logDate);
  if (!matchingLog) {
    return {
      date: logDate,
      entries: [],
      totals: {
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0 }
      }
    };
  }
  return summarizeFoodLog(matchingLog);
}

export async function addFoodLogEntry(
  payload: FoodLogEntryInput & {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  },
  accessToken: string,
  logDate: string = localDateKey()
): Promise<FoodLogSummary> {
  const today = logDate;
  const logs = await fetchFoodLogs(accessToken);
  const todaysLog = logs.find((log) => log.log_date === today) ?? (await createFoodLogForDate(today, accessToken));

  const updatedLog = await readJson<ApiFoodLog>(
    await apiFetch(buildApiUrl(`/nutrition/logs/${todaysLog.id}/entries`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({
        entry_type: 'food',
        food_item_id: payload.food_id,
        grams: payload.grams,
        servings: 1,
        calories: payload.calories,
        protein: payload.protein,
        carbs: payload.carbs,
        fat: payload.fat
      })
    })
  );

  return summarizeFoodLog(updatedLog);
}

export async function calculateMeal(meal: MealInput, accessToken?: string | null): Promise<MealTotals> {
  return readJson<MealTotals>(
    await apiFetch(buildApiUrl('/nutrition/meals/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...optionalAuthHeaders(accessToken) },
      body: JSON.stringify(meal)
    })
  );
}

export async function importRecipe(
  payload: RecipeImportInput,
  accessToken?: string | null
): Promise<RecipeImportResult> {
  return readJson<RecipeImportResult>(
    await apiFetch(buildApiUrl('/recipes/import'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...optionalAuthHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchRecipes(accessToken?: string | null): Promise<RecipeDefinition[]> {
  return readJson<RecipeDefinition[]>(
    await apiFetch(buildApiUrl('/recipes'), optionalAuthInit(accessToken))
  );
}

export async function fetchFavoriteRecipes(accessToken: string): Promise<RecipeDefinition[]> {
  return readJson<RecipeDefinition[]>(
    await apiFetch(buildApiUrl('/recipes/favorites'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchIngestionQueue(accessToken: string): Promise<IngestionOutput[]> {
  return readJson<IngestionOutput[]>(
    await apiFetch(buildApiUrl('/ingestion/queue'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchIngestionOutput(
  outputId: string,
  accessToken: string
): Promise<IngestionOutput> {
  return readJson<IngestionOutput>(
    await apiFetch(buildApiUrl(`/ingestion/outputs/${outputId}`), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function acceptIngestionOutput(
  outputId: string,
  accessToken: string,
  payload?: { extracted_text?: string; structured_json?: unknown }
): Promise<IngestionOutput> {
  return readJson<IngestionOutput>(
    await apiFetch(buildApiUrl(`/ingestion/outputs/${outputId}/accept`), {
      method: 'POST',
      headers: payload
        ? {
            'Content-Type': 'application/json',
            ...authHeaders(accessToken)
          }
        : authHeaders(accessToken),
      body: payload ? JSON.stringify(payload) : undefined
    })
  );
}

export async function rejectIngestionOutput(
  outputId: string,
  accessToken: string
): Promise<IngestionOutput> {
  return readJson<IngestionOutput>(
    await apiFetch(buildApiUrl(`/ingestion/outputs/${outputId}/reject`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function scanFoodPackage(
  imageBase64: string,
  accessToken: string
): Promise<VisionPackageScanResult> {
  return readJson<VisionPackageScanResult>(
    await apiFetch(buildApiUrl('/vision/package'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ image_base64: imageBase64 })
    })
  );
}

/** The auto-capture scanner: one read that tells a nutrition label from a package front. */
export async function smartScan(
  imageBase64: string,
  accessToken: string,
  replaceOutputId?: string | null,
  /** A barcode that just came back without nutrition: a label read for it updates that product. */
  barcode?: string | null
): Promise<SmartScanResult> {
  return readJson<SmartScanResult>(
    await apiFetch(buildApiUrl('/vision/scan'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ image_base64: imageBase64, replace_output_id: replaceOutputId ?? null, barcode: barcode ?? null })
    })
  );
}

export async function ingestNutritionLabel(
  imageBase64: string,
  accessToken: string
): Promise<VisionLabelScanResult> {
  return readJson<VisionLabelScanResult>(
    await apiFetch(buildApiUrl('/vision/label/ingest'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ image_base64: imageBase64 })
    })
  );
}

/** The user's food bank (foods they scanned, saved, or logged), most recently used first. */
export async function fetchFoodBank(accessToken: string, query = ''): Promise<FoodItem[]> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  return readJson<FoodItem[]>(
    await apiFetch(buildApiUrl(`/nutrition/bank${suffix}`), { headers: authHeaders(accessToken) })
  );
}

export async function addFoodToBank(foodId: string, accessToken: string): Promise<FoodItem> {
  return readJson<FoodItem>(
    await apiFetch(buildApiUrl(`/nutrition/bank/${encodeURIComponent(foodId)}`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

/** Take a food out of the user's food bank (the food itself and logged days stay). */
export async function removeFoodFromBank(foodId: string, accessToken: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/nutrition/bank/${encodeURIComponent(foodId)}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    await readJson<unknown>(response);
  }
}

/** Log a food by servings or by weight; the server works out calories and macros. */
export async function logFood(
  payload: { food_id: string; log_date: string; meal_slot?: MealSlot; quantity_label?: string } & ({ servings: number } | { grams: number }),
  accessToken: string
): Promise<unknown> {
  return readJson<unknown>(
    await apiFetch(buildApiUrl('/nutrition/log-food'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

/** Gus suggests two meals for a block, sized to its share of the day (what's left caps it). */
export async function suggestMeal(
  payload: { log_date: string; block: string; ingredients?: string; image_base64?: string },
  accessToken: string
): Promise<SuggestResponse> {
  return readJson<SuggestResponse>(
    await apiFetch(buildApiUrl('/coach/suggest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

/** Add one planned meal to a day (the day's other meals are untouched). */
export async function addMealPlanSlot(
  planDate: string,
  slot: { meal_label: string; title: string; calories: number; prep_status: 'Flexible'; items: Array<{ name: string; quantity_label: string; calories: number; macros: MacroTargets }> },
  accessToken: string
): Promise<MealPlanDay> {
  return readJson<MealPlanDay>(
    await apiFetch(buildApiUrl('/tracker/meal-plan/slots'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ plan_date: planDate, slot })
    })
  );
}

/** Create a Meal Plan: Gus proposes one complete meal for each meal type. */
export async function proposePlanMeals(
  payload: { meals: Array<'breakfast' | 'lunch' | 'dinner'>; cooking_time: string; avoid_titles: string[]; step_note?: string },
  accessToken: string
): Promise<{ proposals: ProposedPlanMeal[] }> {
  return readJson<{ proposals: ProposedPlanMeal[] }>(
    await apiFetch(buildApiUrl('/coach/plan/propose'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

/** Add the accepted meals to their days (replace or keep meals already planned). */
export async function createMealPlan(
  assignments: Array<{
    plan_date: string;
    meal: 'breakfast' | 'lunch' | 'dinner';
    title: string;
    calories: number;
    on_conflict: 'replace' | 'keep';
    items: Array<{ name: string; grams: number; calories: number; protein: number; carbs: number; fat: number; count?: number; unit?: string }>;
  }>,
  accessToken: string
): Promise<{ created: number; replaced: number; kept: number }> {
  return readJson<{ created: number; replaced: number; kept: number }>(
    await apiFetch(buildApiUrl('/coach/plan/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ assignments })
    })
  );
}

/** Log just a number of calories (and optional macros), no food lookup. */
export async function logQuickCalories(
  payload: { log_date: string; calories: number; name?: string; protein?: number; carbs?: number; fat?: number; meal_slot?: MealSlot },
  accessToken: string
): Promise<unknown> {
  return readJson<unknown>(
    await apiFetch(buildApiUrl('/nutrition/quick-calories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

/** Record how much one serving weighs (e.g. after weighing a packet). */
export async function setFoodServingWeight(
  foodId: string,
  servingGrams: number,
  accessToken: string,
  servingBasis: 'g' | 'ml' = 'g'
): Promise<FoodItem> {
  return readJson<FoodItem>(
    await apiFetch(buildApiUrl(`/nutrition/foods/${encodeURIComponent(foodId)}/serving-weight`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ serving_grams: servingGrams, serving_basis: servingBasis })
    })
  );
}

/** Garmin connection status (whether a key is set, and the last sync). */
export async function fetchGarminStatus(accessToken: string): Promise<GarminStatus> {
  return readJson<GarminStatus>(await apiFetch(buildApiUrl('/integrations/garmin'), { headers: authHeaders(accessToken) }));
}

/** Pull new Garmin activities now. */
export async function syncGarmin(accessToken: string): Promise<GarminStatus> {
  return readJson<GarminStatus>(
    await apiFetch(buildApiUrl('/integrations/garmin/sync'), { method: 'POST', headers: authHeaders(accessToken) })
  );
}

/** Quick add: a scanned barcode straight to a food in the bank, ready to log. */
export async function foodForBarcode(code: string, accessToken: string): Promise<BarcodeFoodResult> {
  return readJson<BarcodeFoodResult>(
    await apiFetch(buildApiUrl('/nutrition/barcode-foods'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ code })
    })
  );
}

/** Look a scanned barcode up in the food bank, then Open Food Facts (and USDA with a key). */
export async function lookupBarcode(code: string, accessToken: string): Promise<BarcodeLookupResult> {
  return readJson<BarcodeLookupResult>(
    await apiFetch(buildApiUrl('/nutrition/barcode-lookups'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ code })
    })
  );
}

export async function saveFoodFromIngestionOutput(
  outputId: string,
  accessToken: string
): Promise<SaveFoodsResult> {
  return readJson<SaveFoodsResult>(
    await apiFetch(buildApiUrl(`/ingestion/outputs/${outputId}/save-food`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchRecipe(recipeId: string, accessToken?: string | null): Promise<RecipeDefinition> {
  return readJson<RecipeDefinition>(
    await apiFetch(buildApiUrl(`/recipes/${recipeId}`), optionalAuthInit(accessToken))
  );
}

export async function favoriteRecipe(recipeId: string, accessToken: string): Promise<RecipeDefinition> {
  return readJson<RecipeDefinition>(
    await apiFetch(buildApiUrl(`/recipes/${recipeId}/favorite`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function unfavoriteRecipe(recipeId: string, accessToken: string): Promise<RecipeDefinition> {
  return readJson<RecipeDefinition>(
    await apiFetch(buildApiUrl(`/recipes/${recipeId}/favorite`), {
      method: 'DELETE',
      headers: authHeaders(accessToken)
    })
  );
}

interface ExerciseEntryCreatePayload {
  title: string;
  duration_minutes: number;
  calories_burned: number;
  logged_on: string;
  logged_at: string;
  intensity: ExerciseEntry['intensity'];
}

interface PlannedExerciseEntryCreatePayload {
  title: string;
  duration_minutes: number;
  calories_burned: number;
  planned_on: string;
  planned_at: string;
  intensity: PlannedExerciseEntry['intensity'];
}

interface PlannedExerciseEntryUpdatePayload extends PlannedExerciseEntryCreatePayload {}

interface PlannedWorkoutSegmentPayload {
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
}

interface PlannedWorkoutBlockPayload {
  block_kind: 'warmup' | 'activity' | 'cooldown';
  title: string;
  notes?: string | null;
  segments: PlannedWorkoutSegmentPayload[];
}

interface PlannedWorkoutSessionPayload {
  title: string;
  workout_type: PlannedWorkoutSession['workout_type'];
  planned_on: string;
  planned_at: string;
  notes?: string | null;
  estimated_calories_burned: number;
  blocks: PlannedWorkoutBlockPayload[];
}

interface MealPlanDayCreatePayload {
  plan_date: string;
  label: string;
  focus: string;
  slots: Array<Pick<MealPlanSlot, 'meal_label' | 'title' | 'calories' | 'prep_status' | 'eaten_at' | 'items'>>;
}

interface MealPrepTaskCreatePayload {
  title: string;
  category: MealPrepTask['category'];
  portions: string;
  status: MealPrepTask['status'];
  scheduled_for?: string | null;
}

export async function fetchExerciseEntries(accessToken: string): Promise<ExerciseEntry[]> {
  return readJson<ExerciseEntry[]>(
    await apiFetch(buildApiUrl('/tracker/exercise'), {
      headers: authHeaders(accessToken)
    })
  );
}

/** Drinks logged between two dates (inclusive), oldest first. */
export async function fetchWater(start: string, end: string, accessToken: string): Promise<WaterEntry[]> {
  const query = new URLSearchParams({ start, end });
  return readJson<WaterEntry[]>(await apiFetch(buildApiUrl(`/water?${query.toString()}`), { headers: authHeaders(accessToken) }));
}

export async function addWater(loggedOn: string, amountMl: number, accessToken: string): Promise<WaterEntry> {
  return readJson<WaterEntry>(
    await apiFetch(buildApiUrl('/water'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ logged_on: loggedOn, amount_ml: amountMl })
    })
  );
}

export async function deleteWater(entryId: string, accessToken: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/water/${encodeURIComponent(entryId)}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok && response.status !== 404) {
    await readJson<unknown>(response);
  }
}

/** Relish's calorie estimate for a workout being added (nothing is saved). */
export async function estimateWorkout(
  payload: { activity: WorkoutActivity; duration_minutes: number; effort: WorkoutEffort; distance_m?: number; logged_on: string },
  accessToken: string
): Promise<WorkoutEstimate> {
  return readJson<WorkoutEstimate>(
    await apiFetch(buildApiUrl('/tracker/workouts/estimate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

/** Add a workout by hand: Relish's estimate, or the watch's total (resting calories removed). */
export async function addManualWorkout(
  payload: {
    activity: WorkoutActivity;
    duration_minutes: number;
    effort: WorkoutEffort;
    distance_m?: number;
    logged_on: string;
    logged_at: string;
    title?: string;
    device_calories_total?: number;
  },
  accessToken: string
): Promise<ExerciseEntry> {
  return readJson<ExerciseEntry>(
    await apiFetch(buildApiUrl('/tracker/workouts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

export async function createExerciseEntry(
  payload: ExerciseEntryCreatePayload,
  accessToken: string
): Promise<ExerciseEntry> {
  return readJson<ExerciseEntry>(
    await apiFetch(buildApiUrl('/tracker/exercise'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchPlannedExerciseEntries(accessToken: string): Promise<PlannedExerciseEntry[]> {
  return readJson<PlannedExerciseEntry[]>(
    await apiFetch(buildApiUrl('/tracker/planned-exercise'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchPlannedWorkoutSessions(accessToken: string): Promise<PlannedWorkoutSession[]> {
  return readJson<PlannedWorkoutSession[]>(
    await apiFetch(buildApiUrl('/tracker/planned-workout-sessions'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createPlannedWorkoutSession(
  payload: PlannedWorkoutSessionPayload,
  accessToken: string
): Promise<PlannedWorkoutSession> {
  return readJson<PlannedWorkoutSession>(
    await apiFetch(buildApiUrl('/tracker/planned-workout-sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function updatePlannedWorkoutSession(
  sessionId: string,
  payload: PlannedWorkoutSessionPayload,
  accessToken: string
): Promise<PlannedWorkoutSession> {
  return readJson<PlannedWorkoutSession>(
    await apiFetch(buildApiUrl(`/tracker/planned-workout-sessions/${sessionId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function updatePlannedWorkoutSessionCompletion(
  sessionId: string,
  completedAt: string | null,
  accessToken: string
): Promise<PlannedWorkoutSession> {
  return readJson<PlannedWorkoutSession>(
    await apiFetch(buildApiUrl(`/tracker/planned-workout-sessions/${sessionId}/completion`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ completed_at: completedAt })
    })
  );
}

export async function deletePlannedWorkoutSession(sessionId: string, accessToken: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/tracker/planned-workout-sessions/${sessionId}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    await readJson<void>(response);
  }
}

export async function createPlannedExerciseEntry(
  payload: PlannedExerciseEntryCreatePayload,
  accessToken: string
): Promise<PlannedExerciseEntry> {
  return readJson<PlannedExerciseEntry>(
    await apiFetch(buildApiUrl('/tracker/planned-exercise'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function updatePlannedExerciseEntry(
  entryId: string,
  payload: PlannedExerciseEntryUpdatePayload,
  accessToken: string
): Promise<PlannedExerciseEntry> {
  return readJson<PlannedExerciseEntry>(
    await apiFetch(buildApiUrl(`/tracker/planned-exercise/${entryId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function deletePlannedExerciseEntry(entryId: string, accessToken: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/tracker/planned-exercise/${entryId}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    await readJson<void>(response);
  }
}

export async function updatePlannedExerciseCompletion(
  entryId: string,
  completedAt: string | null,
  accessToken: string
): Promise<PlannedExerciseEntry> {
  return readJson<PlannedExerciseEntry>(
    await apiFetch(buildApiUrl(`/tracker/planned-exercise/${entryId}/completion`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ completed_at: completedAt })
    })
  );
}

export async function fetchMealPlanDays(accessToken: string): Promise<MealPlanDay[]> {
  return readJson<MealPlanDay[]>(
    await apiFetch(buildApiUrl('/tracker/meal-plan'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createMealPlanDay(
  payload: MealPlanDayCreatePayload,
  accessToken: string
): Promise<MealPlanDay> {
  return readJson<MealPlanDay>(
    await apiFetch(buildApiUrl('/tracker/meal-plan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

/** Remove one planned meal; anything already logged from it stays in the food log. */
export async function deleteMealPlanSlot(slotId: string, accessToken: string): Promise<MealPlanDay> {
  return readJson<MealPlanDay>(
    await apiFetch(buildApiUrl(`/tracker/meal-plan/slots/${encodeURIComponent(slotId)}`), {
      method: 'DELETE',
      headers: authHeaders(accessToken)
    })
  );
}

export async function updateMealPlanSlotEatenAt(
  slotId: string,
  eatenAt: string | null,
  accessToken: string
): Promise<MealPlanDay> {
  return readJson<MealPlanDay>(
    await apiFetch(buildApiUrl(`/tracker/meal-plan/slots/${slotId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ eaten_at: eatenAt })
    })
  );
}

export async function fetchMealPrepTasks(accessToken: string): Promise<MealPrepTask[]> {
  return readJson<MealPrepTask[]>(
    await apiFetch(buildApiUrl('/tracker/meal-prep'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createMealPrepTask(
  payload: MealPrepTaskCreatePayload,
  accessToken: string
): Promise<MealPrepTask> {
  return readJson<MealPrepTask>(
    await apiFetch(buildApiUrl('/tracker/meal-prep'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function updateMealPrepTaskStatus(
  taskId: string,
  status: MealPrepTask['status'],
  accessToken: string
): Promise<MealPrepTask> {
  return readJson<MealPrepTask>(
    await apiFetch(buildApiUrl(`/tracker/meal-prep/${taskId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ status })
    })
  );
}


export type FoodLogEntryUpdatePayload = {
  grams: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export async function updateFoodLogEntry(
  logId: string,
  entryId: string,
  payload: FoodLogEntryUpdatePayload,
  accessToken: string
): Promise<FoodLogSummary> {
  const log = await readJson<ApiFoodLog>(
    await apiFetch(buildApiUrl(`/nutrition/logs/${logId}/entries/${entryId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
  return summarizeFoodLog(log);
}

/** Every day's food log between two days (inclusive), newest first. */
export async function fetchFoodLogsBetween(start: string, end: string, accessToken: string): Promise<FoodLogSummary[]> {
  const logs = await readJson<ApiFoodLog[]>(
    await apiFetch(buildApiUrl(`/nutrition/logs?week_start=${start}&week_end=${end}`), { headers: authHeaders(accessToken) })
  );
  return logs.map(summarizeFoodLog);
}

export async function deleteFoodLogEntry(logId: string, entryId: string, accessToken: string): Promise<FoodLogSummary> {
  const log = await readJson<ApiFoodLog>(
    await apiFetch(buildApiUrl(`/nutrition/logs/${logId}/entries/${entryId}`), {
      method: 'DELETE',
      headers: authHeaders(accessToken)
    })
  );
  return summarizeFoodLog(log);
}

export async function updateExerciseEntry(
  entryId: string,
  payload: ExerciseEntryCreatePayload,
  accessToken: string
): Promise<ExerciseEntry> {
  return readJson<ExerciseEntry>(
    await apiFetch(buildApiUrl(`/tracker/exercise/${entryId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteExerciseEntry(entryId: string, accessToken: string): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/tracker/exercise/${entryId}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    await readJson<unknown>(response);
  }
}

export type TargetPreviewRequest = {
  sex: 'male' | 'female';
  age_years: number;
  height_cm: number;
  current_weight_lbs: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
};

/** BMR, maintenance, and every goal option for setup screens. Nothing is saved. */
export async function previewTargets(payload: TargetPreviewRequest, accessToken: string): Promise<TargetPreview> {
  return readJson<TargetPreview>(
    await apiFetch(buildApiUrl('/profile/targets/preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload)
    })
  );
}
