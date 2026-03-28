import type { MealInput, MealTotals, WeeklyMetrics } from '../types';

export interface HealthResponse {
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

export async function fetchBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(buildApiUrl('/health'));
  return readJson<HealthResponse>(response);
}

export async function fetchWeeklyMetrics(): Promise<WeeklyMetrics> {
  const response = await fetch(buildApiUrl('/nutrition/weekly-metrics'));
  return readJson<WeeklyMetrics>(response);
}

export async function calculateMeal(meal: MealInput): Promise<MealTotals> {
  const response = await fetch(buildApiUrl('/nutrition/meals/calculate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meal)
  });

  return readJson<MealTotals>(response);
}
