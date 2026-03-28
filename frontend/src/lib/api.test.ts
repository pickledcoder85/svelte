import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildApiUrl,
  addFoodLogEntry,
  addFavoriteFood,
  calculateMeal,
  createLocalSession,
  favoriteRecipe,
  fetchFavoriteFoods,
  fetchFavoriteRecipes,
  fetchRecipes,
  fetchRecipe,
  importRecipe,
  fetchTodaysFoodLog,
  normalizeApiBaseUrl,
  searchFoods,
  searchFoodsWithSession,
  unfavoriteRecipe
} from './api';
import {
  demoFoodLog,
  demoFoodResults,
  demoMeal,
  demoRecipe,
  demoRecipeCatalog,
  demoRecipeFavorites,
  demoRecipeImports
} from '../mock-data';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it('creates a local session for session-scoped favorites', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ session: { access_token: 'token-123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const session = await createLocalSession('tester@example.com', 'Tester');

    expect(session.access_token).toBe('token-123');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/session',
      expect.objectContaining({ method: 'POST' })
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

  it('fetches favorite recipes from the favorites endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoRecipeFavorites), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchFavoriteRecipes();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/recipes/favorites');
  });

  it('fetches the recipe catalog from the recipes endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoRecipeCatalog), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchRecipes();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/recipes');
  });

  it('fetches a recipe by id for detail views', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoRecipe), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchRecipe(demoRecipe.id);

    expect(fetchMock).toHaveBeenCalledWith(`http://localhost:8000/api/recipes/${demoRecipe.id}`);
  });

  it('favorites recipes with POST and unfavorites with DELETE', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(demoRecipe), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...demoRecipe, favorite: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await favoriteRecipe(demoRecipe.id);
    await unfavoriteRecipe(demoRecipe.id);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://localhost:8000/api/recipes/${demoRecipe.id}/favorite`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:8000/api/recipes/${demoRecipe.id}/favorite`,
      expect.objectContaining({ method: 'DELETE' })
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

  it('queries the food search endpoint with trimmed input', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'food-greek-yogurt',
            name: 'Greek yogurt, plain nonfat',
            brand: 'Generic',
            calories: 59,
            serving_size: 100,
            serving_unit: 'g',
            macros: { protein: 10.3, carbs: 3.6, fat: 0.4 },
            source: 'USDA'
          }
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchFoods('  yogurt  ');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/foods/search?q=yogurt'
    );
  });

  it('fetches favorite foods with auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoFoodResults.filter((food) => food.favorite)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchFavoriteFoods('token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/favorites/foods',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
  });

  it('searches foods with session auth to hydrate favorite state', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoFoodResults), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchFoodsWithSession('oats', 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/foods/search?q=oats',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
  });

  it('adds a food to favorites with auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ food_id: 'food-blueberries', favorite: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await addFavoriteFood('food-blueberries', 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/favorites/foods/food-blueberries',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123' }
      })
    );
  });

  it('fetches the current food log from the today endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoFoodLog), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchTodaysFoodLog();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/nutrition/food-logs/today');
  });

  it('posts food log entries to the today entries endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoFoodLog), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await addFoodLogEntry({ food_id: 'food-greek-yogurt', grams: 120 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/food-logs/today/entries',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
