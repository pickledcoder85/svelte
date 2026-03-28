import type {
  FoodItem,
  FoodLogEntryInput,
  FoodLogSummary,
  MealInput,
  MealTotals,
  RecipeDefinition,
  RecipeImportInput,
  RecipeImportResult,
  WeeklyMetrics
} from '../types';

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

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const normalizedQuery = query.trim();

  return readJson<FoodItem[]>(
    await fetch(buildApiUrl(`/nutrition/foods/search?q=${encodeURIComponent(normalizedQuery)}`))
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
