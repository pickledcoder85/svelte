import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildApiUrl,
  calculateMeal,
  importRecipe,
  normalizeApiBaseUrl,
  saveMealTemplate
} from './api';
import { demoMeal, demoRecipeImports, demoFoodStrip } from '../mock-data';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('api helpers', () => {
  it('normalizes api base urls', () => {
    expect(normalizeApiBaseUrl('http://localhost:8000/api/')).toBe('http://localhost:8000/api');
    expect(normalizeApiBaseUrl('')).toBe('http://localhost:8000/api');
  });

  it('builds api urls from relative paths', () => {
    expect(buildApiUrl('/nutrition/weekly-metrics')).toBe(
      'http://localhost:8000/api/nutrition/weekly-metrics'
    );
  });

  it('posts recipe imports to the recipes endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'recipe-1', title: demoRecipeImports.title, favorite: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await importRecipe(demoRecipeImports);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/recipes/import',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('posts meal templates to the meal-template endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'template-1', name: demoFoodStrip.mealTemplate.name, servings: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await saveMealTemplate(demoFoodStrip.mealTemplate);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/meal-templates',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('sends meal calculations to the calculate endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          calories: 567,
          macros: { protein: 44.6, carbs: 73.1, fat: 6.9 },
          per_serving_calories: 283.5,
          per_serving_macros: { protein: 22.3, carbs: 36.6, fat: 3.4 }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await calculateMeal(demoMeal);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/meals/calculate',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
