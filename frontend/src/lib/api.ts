import type {
  FoodItem,
  RecipeImportInput,
  RecipeImportResult,
  MealInput,
  MealTemplateInput,
  MealTemplateResult,
  MealTotals,
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

export function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return DEFAULT_API_BASE_URL;
  }

  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
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

export async function saveMealTemplate(payload: MealTemplateInput): Promise<MealTemplateResult> {
  return readJson<MealTemplateResult>(
    await fetch(buildApiUrl('/nutrition/meal-templates'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
}
