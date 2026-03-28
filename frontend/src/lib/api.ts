import type {
  ExerciseEntry,
  IngestionOutput,
  FoodItem,
  FoodLogEntryInput,
  FoodLogSummary,
  MealInput,
  MealPlanDay,
  MealPlanSlot,
  MealPrepTask,
  MealTotals,
  RecipeDefinition,
  RecipeImportInput,
  RecipeImportResult,
  UserGoal,
  UserGoalCreate,
  UserProfile,
  UserProfileUpdate,
  WeeklyMetrics
} from '../types';

interface AuthSession {
  access_token: string;
}

interface SessionResponse {
  session: AuthSession;
}

export interface ApiHealth {
  ok: boolean;
  service: string;
  timestamp: string;
}

export interface ApiError extends Error {
  status: number;
}

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

function readExpoPublicApiBaseUrl(): string | undefined {
  const processRef = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return processRef.process?.env?.EXPO_PUBLIC_API_BASE_URL;
}

export function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return DEFAULT_API_BASE_URL;
  }

  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(readExpoPublicApiBaseUrl());
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as ApiError;
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export async function fetchBackendHealth(): Promise<ApiHealth> {
  return readJson<ApiHealth>(await fetch(buildApiUrl('/health')));
}

export async function fetchWeeklyMetrics(): Promise<WeeklyMetrics> {
  return readJson<WeeklyMetrics>(await fetch(buildApiUrl('/nutrition/weekly-metrics')));
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  return readJson<UserProfile>(
    await fetch(buildApiUrl('/profile'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function updateProfile(
  payload: UserProfileUpdate,
  accessToken: string
): Promise<UserProfile> {
  return readJson<UserProfile>(
    await fetch(buildApiUrl('/profile'), {
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
    await fetch(buildApiUrl('/profile/goals'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createUserGoal(payload: UserGoalCreate, accessToken: string): Promise<UserGoal> {
  return readJson<UserGoal>(
    await fetch(buildApiUrl('/profile/goals'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const normalizedQuery = query.trim();

  return readJson<FoodItem[]>(
    await fetch(buildApiUrl(`/nutrition/foods/search?q=${encodeURIComponent(normalizedQuery)}`))
  );
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`
  };
}

export async function createLocalSession(email: string, displayName: string): Promise<AuthSession> {
  const response = await readJson<SessionResponse>(
    await fetch(buildApiUrl('/auth/session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, display_name: displayName })
    })
  );
  return response.session;
}

export async function fetchFavoriteFoods(accessToken: string): Promise<FoodItem[]> {
  return readJson<FoodItem[]>(
    await fetch(buildApiUrl('/nutrition/favorites/foods'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function searchFoodsWithSession(query: string, accessToken: string): Promise<FoodItem[]> {
  const normalizedQuery = query.trim();

  return readJson<FoodItem[]>(
    await fetch(buildApiUrl(`/nutrition/foods/search?q=${encodeURIComponent(normalizedQuery)}`), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function addFavoriteFood(foodId: string, accessToken: string): Promise<{ food_id: string; favorite: boolean }> {
  return readJson<{ food_id: string; favorite: boolean }>(
    await fetch(buildApiUrl(`/nutrition/favorites/foods/${foodId}`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchTodaysFoodLog(): Promise<FoodLogSummary> {
  return readJson<FoodLogSummary>(await fetch(buildApiUrl('/nutrition/food-logs/today')));
}

export async function addFoodLogEntry(payload: FoodLogEntryInput): Promise<FoodLogSummary> {
  return readJson<FoodLogSummary>(
    await fetch(buildApiUrl('/nutrition/food-logs/today/entries'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
}

export async function calculateMeal(meal: MealInput): Promise<MealTotals> {
  return readJson<MealTotals>(
    await fetch(buildApiUrl('/nutrition/meals/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal)
    })
  );
}

export async function importRecipe(payload: RecipeImportInput): Promise<RecipeImportResult> {
  return readJson<RecipeImportResult>(
    await fetch(buildApiUrl('/recipes/import'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchRecipes(): Promise<RecipeDefinition[]> {
  return readJson<RecipeDefinition[]>(await fetch(buildApiUrl('/recipes')));
}

export async function fetchFavoriteRecipes(): Promise<RecipeDefinition[]> {
  return readJson<RecipeDefinition[]>(await fetch(buildApiUrl('/recipes/favorites')));
}

export async function fetchIngestionQueue(accessToken: string): Promise<IngestionOutput[]> {
  return readJson<IngestionOutput[]>(
    await fetch(buildApiUrl('/ingestion/queue'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchIngestionOutput(
  outputId: string,
  accessToken: string
): Promise<IngestionOutput> {
  return readJson<IngestionOutput>(
    await fetch(buildApiUrl(`/ingestion/outputs/${outputId}`), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function acceptIngestionOutput(
  outputId: string,
  accessToken: string
): Promise<IngestionOutput> {
  return readJson<IngestionOutput>(
    await fetch(buildApiUrl(`/ingestion/outputs/${outputId}/accept`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function rejectIngestionOutput(
  outputId: string,
  accessToken: string
): Promise<IngestionOutput> {
  return readJson<IngestionOutput>(
    await fetch(buildApiUrl(`/ingestion/outputs/${outputId}/reject`), {
      method: 'POST',
      headers: authHeaders(accessToken)
    })
  );
}

export async function fetchRecipe(recipeId: string): Promise<RecipeDefinition> {
  return readJson<RecipeDefinition>(await fetch(buildApiUrl(`/recipes/${recipeId}`)));
}

export async function favoriteRecipe(recipeId: string): Promise<RecipeDefinition> {
  return readJson<RecipeDefinition>(
    await fetch(buildApiUrl(`/recipes/${recipeId}/favorite`), {
      method: 'POST'
    })
  );
}

export async function unfavoriteRecipe(recipeId: string): Promise<RecipeDefinition> {
  return readJson<RecipeDefinition>(
    await fetch(buildApiUrl(`/recipes/${recipeId}/favorite`), {
      method: 'DELETE'
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

interface MealPlanDayCreatePayload {
  plan_date: string;
  label: string;
  focus: string;
  slots: Array<Pick<MealPlanSlot, 'meal_label' | 'title' | 'calories' | 'prep_status'>>;
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
    await fetch(buildApiUrl('/tracker/exercise'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createExerciseEntry(
  payload: ExerciseEntryCreatePayload,
  accessToken: string
): Promise<ExerciseEntry> {
  return readJson<ExerciseEntry>(
    await fetch(buildApiUrl('/tracker/exercise'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchMealPlanDays(accessToken: string): Promise<MealPlanDay[]> {
  return readJson<MealPlanDay[]>(
    await fetch(buildApiUrl('/tracker/meal-plan'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createMealPlanDay(
  payload: MealPlanDayCreatePayload,
  accessToken: string
): Promise<MealPlanDay> {
  return readJson<MealPlanDay>(
    await fetch(buildApiUrl('/tracker/meal-plan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchMealPrepTasks(accessToken: string): Promise<MealPrepTask[]> {
  return readJson<MealPrepTask[]>(
    await fetch(buildApiUrl('/tracker/meal-prep'), {
      headers: authHeaders(accessToken)
    })
  );
}

export async function createMealPrepTask(
  payload: MealPrepTaskCreatePayload,
  accessToken: string
): Promise<MealPrepTask> {
  return readJson<MealPrepTask>(
    await fetch(buildApiUrl('/tracker/meal-prep'), {
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
    await fetch(buildApiUrl(`/tracker/meal-prep/${taskId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(accessToken)
      },
      body: JSON.stringify({ status })
    })
  );
}
