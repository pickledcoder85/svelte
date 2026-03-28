import type { MealInput, MealTotals, WeeklyMetrics } from './types';

const API_BASE = 'http://localhost:8000/api';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchWeeklyMetrics(): Promise<WeeklyMetrics> {
  const response = await fetch(`${API_BASE}/nutrition/weekly-metrics`);
  return parseJson<WeeklyMetrics>(response);
}

export async function calculateMeal(meal: MealInput): Promise<MealTotals> {
  const response = await fetch(`${API_BASE}/nutrition/meals/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meal)
  });

  return parseJson<MealTotals>(response);
}
