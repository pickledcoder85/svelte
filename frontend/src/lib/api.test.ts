import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localDateKey } from './dates';
import {
  buildApiUrl,
  acceptIngestionOutput,
  addFoodLogEntry,
  addFavoriteFood,
  createExerciseEntry,
  createPlannedExerciseEntry,
  createPlannedWorkoutSession,
  deletePlannedExerciseEntry,
  deletePlannedWorkoutSession,
  ingestNutritionLabel,
  createMealPlanDay,
  createMealPrepTask,
  createWeightEntry,
  calculateMeal,
  createLocalSession,
  fetchOwnerSession,
  previewTargets,
  deleteExerciseEntry,
  deleteFoodLogEntry,
  updateExerciseEntry,
  updateFoodLogEntry,
  fetchCurrentSession,
  setUnauthorizedHandler,
  apiFetch,
  fetchWeeklyMetrics,
  completeOnboarding,
  createUserGoal,
  fetchIngestionOutput,
  fetchIngestionQueue,
  favoriteRecipe,
  fetchFavoriteFoods,
  fetchExerciseEntries,
  fetchFavoriteRecipes,
  fetchFoodLogForDate,
  fetchMealPlanDays,
  fetchPlannedExerciseEntries,
  fetchPlannedWorkoutSessions,
  updateMealPlanSlotEatenAt,
  fetchMealPrepTasks,
  fetchProfile,
  fetchProfileProgress,
  fetchUserGoals,
  fetchRecipes,
  fetchRecipe,
  importRecipe,
  fetchTodaysFoodLog,
  fetchWeightEntries,
  lookupBarcode,
  resetProfileSetup,
  normalizeApiBaseUrl,
  rejectIngestionOutput,
  saveFoodFromIngestionOutput,
  scanFoodPackage,
  searchFoods,
  searchFoodsWithSession,
  updateProfile,
  updateMealPrepTaskStatus,
  updatePlannedExerciseEntry,
  updatePlannedExerciseCompletion,
  updatePlannedWorkoutSession,
  updatePlannedWorkoutSessionCompletion,
  unfavoriteFood,
  unfavoriteRecipe
} from './api';
import {
  demoFoodLog,
  demoFoodResults,
  demoMeal,
  demoIngestionOutputs,
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
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'tester@example.com', display_name: 'Tester', intent: 'signup' })
      })
    );
  });

  it('marks writes with the Relish request header and leaves reads untouched', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('http://localhost:8000/api/profile');
    await apiFetch('http://localhost:8000/api/profile', { method: 'put', headers: { A: 'b' } });

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8000/api/profile');
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:8000/api/profile', {
      method: 'put',
      headers: { A: 'b', 'X-Relish-Request': '1' }
    });
  });

  it('sends the session on reads that used to be anonymous', async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () => new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchWeeklyMetrics('token-123');
    await searchFoods('oats', 'token-123');
    await fetchRecipes('token-123');
    await fetchRecipe('recipe-1', 'token-123');

    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toEqual({ headers: { Authorization: 'Bearer token-123' } });
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('edits and deletes logged entries with the right methods and paths', async () => {
    const apiLog = {
      id: 'log-1',
      user_id: 'user-1',
      log_date: '2026-04-01',
      notes: null,
      entries: [
        {
          id: 'entry-1',
          entry_type: 'food',
          food_item_id: 'food-oats',
          meal_template_id: null,
          meal_plan_slot_id: 'slot-1',
          display_name: 'Rolled oats',
          brand: null,
          source: 'CUSTOM',
          grams: 40,
          servings: 0.5,
          calories: 155.6,
          protein: 6.8,
          carbs: 26.5,
          fat: 2.8,
          created_at: '2026-04-01T08:00:00Z'
        }
      ]
    };
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' && String(_url).includes('/tracker/')
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(String(_url).includes('/tracker/') ? { id: 'ex-1' } : apiLog), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
    );
    vi.stubGlobal('fetch', fetchMock);
    const body = { grams: 40, servings: 0.5, calories: 155.6, protein: 6.8, carbs: 26.5, fat: 2.8 };

    const updated = await updateFoodLogEntry('log-1', 'entry-1', body, 'token-123');
    expect(updated.log_id).toBe('log-1');
    expect(updated.entries[0].meal_plan_slot_id).toBe('slot-1');
    await deleteFoodLogEntry('log-1', 'entry-1', 'token-123');
    await updateExerciseEntry(
      'ex-1',
      { title: 'Walk', duration_minutes: 30, calories_burned: 120, logged_on: '2026-04-01', logged_at: '07:00', intensity: 'Low' },
      'token-123'
    );
    await deleteExerciseEntry('ex-1', 'token-123');

    const calls = fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method]);
    expect(calls).toEqual([
      ['http://localhost:8000/api/nutrition/logs/log-1/entries/entry-1', 'PATCH'],
      ['http://localhost:8000/api/nutrition/logs/log-1/entries/entry-1', 'DELETE'],
      ['http://localhost:8000/api/tracker/exercise/ex-1', 'PUT'],
      ['http://localhost:8000/api/tracker/exercise/ex-1', 'DELETE']
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer token-123', 'X-Relish-Request': '1' });
    }
  });

  it('surfaces a failed exercise delete as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Exercise entry not found.' }), { status: 404 }))
    );
    await expect(deleteExerciseEntry('missing', 'token-123')).rejects.toThrow('Exercise entry not found.');
  });

  it('previews targets with a POST that saves nothing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ bmr_calories: 1887, maintenance_calories: 2736, recommended_minimum_calories: 1200, options: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const body = { sex: 'male' as const, age_years: 30, height_cm: 180, current_weight_lbs: 200, activity_level: 'moderate' as const };

    const preview = await previewTargets(body, 'token-123');

    expect(preview.maintenance_calories).toBe(2736);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/profile/targets/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-123', 'X-Relish-Request': '1' },
      body: JSON.stringify(body)
    });
  });

  it('accepts a relative api base for same-origin production builds', () => {
    expect(normalizeApiBaseUrl('/api')).toBe('/api');
    expect(normalizeApiBaseUrl(' /api/ ')).toBe('/api');
    expect(normalizeApiBaseUrl('   ')).toBe('http://localhost:8000/api');
  });

  it('notifies the app once when a data request is rejected with 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'No active session.' }), { status: 401 }))
    );

    await expect(fetchProfile('expired-token')).rejects.toThrow('401');
    expect(handler).toHaveBeenCalledTimes(1);

    // A 401 from the session check is an answer, not an expired session.
    await expect(fetchCurrentSession('expired-token')).resolves.toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });

  it('checks a remembered local session with its token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ session: { access_token: 'session-abc', provider: 'local' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const session = await fetchCurrentSession('session-abc');

    expect(session?.access_token).toBe('session-abc');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/auth/session', {
      headers: { Authorization: 'Bearer session-abc' }
    });
  });

  it('returns the owner session when the server already knows the user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ session: { access_token: 'owner-session', provider: 'tailscale' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const session = await fetchOwnerSession();

    expect(session?.provider).toBe('tailscale');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/auth/session');
  });

  it('returns null when the server needs an explicit sign-in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'No active session.' }), { status: 401 }))
    );

    await expect(fetchOwnerSession()).resolves.toBeNull();
  });

  it('surfaces other owner-session failures as errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'This Relish server belongs to someone else.' }), { status: 403 })
      )
    );

    await expect(fetchOwnerSession()).rejects.toThrow('belongs to someone else');
  });

  it('resets the profile setup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user_id: 'user-1', setup_complete: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const profile = await resetProfileSetup('token-123');

    expect(profile.setup_complete).toBe(false);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/profile/setup/reset');
    expect(init.method).toBe('POST');
  });

  it('posts scanned barcodes to the lookup endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ barcode: '00036000291452', found: false, source: null, food: null, output: null, message: 'Not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupBarcode('036000291452', 'token-123');

    expect(result.found).toBe(false);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/nutrition/barcode-lookups');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ code: '036000291452' });
  });

  it('includes backend error detail in thrown api errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Vision response did not include structured text output.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(scanFoodPackage('ZmFrZS1wYWNrYWdl', 'token-123')).rejects.toThrow(
      'Request failed with status 502: Vision response did not include structured text output.'
    );
  });

  it('submits onboarding data to the profile onboarding endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user_id: 'user-123',
          email: 'tester@example.com',
          display_name: 'Tester',
          timezone: 'UTC',
          units: 'imperial',
          setup_complete: true,
          sex: 'female',
          age_years: 34,
          height_cm: 170,
          current_weight_lbs: 180,
          goal_type: 'lose',
          goal_pace: 'recommended',
          target_weight_lbs: 170,
          activity_level: 'moderate',
          dietary_pattern: 'omnivore',
          nutrition_style: 'balanced',
          allergy_notes: 'peanuts'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await completeOnboarding(
      {
        sex: 'female',
        age_years: 34,
        height_cm: 170,
        current_weight_lbs: 180,
        goal_type: 'lose',
        goal_pace: 'recommended',
        target_weight_lbs: 170,
        activity_level: 'moderate',
        dietary_pattern: 'omnivore',
        nutrition_style: 'balanced',
        allergy_notes: 'peanuts'
      },
      'token-123'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/profile/onboarding',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123', 'Content-Type': 'application/json', 'X-Relish-Request': '1' }
      })
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

  it('fetches favorite recipes from the favorites endpoint with auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoRecipeFavorites), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchFavoriteRecipes('token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/recipes/favorites',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
  });

  it('loads and reviews ingestion outputs with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(demoIngestionOutputs.filter((output) => output.review_state === 'pending')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(demoIngestionOutputs[0]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...demoIngestionOutputs[0], review_state: 'accepted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...demoIngestionOutputs[1], review_state: 'rejected' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await fetchIngestionQueue('token-123');
    await fetchIngestionOutput(demoIngestionOutputs[0].id, 'token-123');
    await acceptIngestionOutput(demoIngestionOutputs[0].id, 'token-123');
    await rejectIngestionOutput(demoIngestionOutputs[1].id, 'token-123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/ingestion/queue',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:8000/api/ingestion/outputs/${demoIngestionOutputs[0].id}`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `http://localhost:8000/api/ingestion/outputs/${demoIngestionOutputs[0].id}/accept`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `http://localhost:8000/api/ingestion/outputs/${demoIngestionOutputs[1].id}/reject`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
  });

  it('supports camera-food ingestion helpers with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ingestion_job_id: 'job-1',
            output_id: 'output-1',
            source_kind: 'camera_package',
            source_name: 'package-scan',
            confidence: 0.71,
            extraction: {
              package_text: 'Demo package-front output',
              product_name: 'Rolled oats',
              brand_name: 'Pantry staple',
              confidence: 0.71,
              match_candidates: []
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ingestion_job_id: 'job-2',
            output_id: 'output-2',
            source_kind: 'camera_label',
            source_name: 'nutrition-label-scan',
            confidence: 0.62,
            extraction: {
              label_text: 'Demo OCR output',
              product_name: 'Scanned food product',
              brand_name: 'Unknown brand',
              serving_size: '1 serving',
              calories: 120,
              macros: { protein: 8, carbs: 12, fat: 4 },
              multiple_variants_detected: false,
              variants: [],
              confidence: 0.62
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            saved_foods: [
              {
                id: 'food-label-test',
                name: 'Test protein bar',
                brand: 'Codex Foods',
                calories: 220,
                serving_size: 1,
                serving_unit: 'bar',
                macros: { protein: 20, carbs: 24, fat: 7 },
                source: 'LABEL_SCAN',
                favorite: false
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await scanFoodPackage('package-base64', 'token-123');
    await ingestNutritionLabel('label-base64', 'token-123');
    await saveFoodFromIngestionOutput('output-2', 'token-123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/vision/package',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/vision/label/ingest',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/ingestion/outputs/output-2/save-food',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
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

  it('favorites recipes with POST and unfavorites with DELETE using auth headers', async () => {
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

    await favoriteRecipe(demoRecipe.id, 'token-123');
    await unfavoriteRecipe(demoRecipe.id, 'token-123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://localhost:8000/api/recipes/${demoRecipe.id}/favorite`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:8000/api/recipes/${demoRecipe.id}/favorite`,
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
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
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
  });

  it('removes a food from favorites with auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ food_id: 'food-blueberries', favorite: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await unfavoriteFood('food-blueberries', 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/favorites/foods/food-blueberries',
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
  });

  it('fetches exercise entries and posts new exercise logs with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'exercise-1',
              title: 'Incline walk',
              duration_minutes: 35,
              calories_burned: 240,
              logged_on: '2026-03-28',
              logged_at: '07:15',
              intensity: 'Moderate'
            }
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'exercise-2',
            title: 'Bike ride',
            duration_minutes: 30,
            calories_burned: 220,
            logged_on: '2026-03-28',
            logged_at: '08:30',
            intensity: 'Moderate'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await fetchExerciseEntries('token-123');
    await createExerciseEntry(
      {
        title: 'Bike ride',
        duration_minutes: 30,
        calories_burned: 220,
        logged_on: '2026-03-28',
        logged_at: '08:30',
        intensity: 'Moderate'
      },
      'token-123'
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/tracker/exercise',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/tracker/exercise',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
  });

  it('fetches and creates planned exercise entries with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'planned-1',
              title: 'Swim',
              duration_minutes: 55,
              calories_burned: 520,
              planned_on: '2026-04-03',
              planned_at: '06:30',
              intensity: 'High'
            }
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'planned-2',
            title: 'Lift',
            duration_minutes: 45,
            calories_burned: 300,
            planned_on: '2026-04-04',
            planned_at: '17:30',
            intensity: 'High'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await fetchPlannedExerciseEntries('token-123');
    await createPlannedExerciseEntry(
      {
        title: 'Lift',
        duration_minutes: 45,
        calories_burned: 300,
        planned_on: '2026-04-04',
        planned_at: '17:30',
        intensity: 'High'
      },
      'token-123'
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/tracker/planned-exercise',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/tracker/planned-exercise',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
  });

  it('updates planned exercise completion with auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'planned-1',
          title: 'Swim',
          duration_minutes: 55,
          calories_burned: 520,
          planned_on: '2026-04-03',
          planned_at: '06:30',
          intensity: 'High',
          completed_at: '2026-04-03T07:10:00.000Z',
          completed_exercise_entry_id: 'exercise-99'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await updatePlannedExerciseCompletion('planned-1', '2026-04-03T07:10:00.000Z', 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/tracker/planned-exercise/planned-1/completion',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        },
        body: JSON.stringify({ completed_at: '2026-04-03T07:10:00.000Z' })
      })
    );
  });

  it('updates and deletes planned exercise entries with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'planned-1',
            title: 'Long walk',
            duration_minutes: 40,
            calories_burned: 210,
            planned_on: '2026-04-03',
            planned_at: '06:30',
            intensity: 'Moderate'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await updatePlannedExerciseEntry(
      'planned-1',
      {
        title: 'Long walk',
        duration_minutes: 40,
        calories_burned: 210,
        planned_on: '2026-04-03',
        planned_at: '06:30',
        intensity: 'Moderate'
      },
      'token-123'
    );
    await deletePlannedExerciseEntry('planned-1', 'token-123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/tracker/planned-exercise/planned-1',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/tracker/planned-exercise/planned-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-123', 'X-Relish-Request': '1' }
      })
    );
  });

  it('fetches and mutates structured planned workout sessions with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'session-1',
              user_id: 'user-1',
              title: 'Run workout',
              workout_type: 'run',
              planned_on: '2026-04-07',
              planned_at: '06:00',
              estimated_calories_burned: 430,
              status: 'planned',
              blocks: []
            }
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'session-2',
            user_id: 'user-1',
            title: 'Run workout',
            workout_type: 'run',
            planned_on: '2026-04-07',
            planned_at: '06:00',
            estimated_calories_burned: 430,
            status: 'planned',
            blocks: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'session-2',
            user_id: 'user-1',
            title: 'Run workout updated',
            workout_type: 'run',
            planned_on: '2026-04-07',
            planned_at: '06:15',
            estimated_calories_burned: 460,
            status: 'planned',
            blocks: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'session-2',
            user_id: 'user-1',
            title: 'Run workout updated',
            workout_type: 'run',
            planned_on: '2026-04-07',
            planned_at: '06:15',
            estimated_calories_burned: 460,
            status: 'completed',
            completed_at: '2026-04-07T11:45:00.000Z',
            blocks: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
      title: 'Run workout',
      workout_type: 'run' as const,
      planned_on: '2026-04-07',
      planned_at: '06:00',
      estimated_calories_burned: 430,
      blocks: []
    };

    await fetchPlannedWorkoutSessions('token-123');
    await createPlannedWorkoutSession(payload, 'token-123');
    await updatePlannedWorkoutSession('session-2', { ...payload, title: 'Run workout updated', planned_at: '06:15', estimated_calories_burned: 460 }, 'token-123');
    await updatePlannedWorkoutSessionCompletion('session-2', '2026-04-07T11:45:00.000Z', 'token-123');
    await deletePlannedWorkoutSession('session-2', 'token-123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/tracker/planned-workout-sessions',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/tracker/planned-workout-sessions',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/tracker/planned-workout-sessions/session-2',
      expect.objectContaining({
        method: 'PUT'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:8000/api/tracker/planned-workout-sessions/session-2/completion',
      expect.objectContaining({
        method: 'PATCH'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'http://localhost:8000/api/tracker/planned-workout-sessions/session-2',
      expect.objectContaining({
        method: 'DELETE'
      })
    );
  });

  it('fetches and updates profile data with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user_id: 'user-123',
            email: 'profile@example.com',
            display_name: 'Profile User',
            timezone: 'UTC',
            units: 'imperial'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user_id: 'user-123',
            email: 'profile@example.com',
            display_name: 'Cut Phase',
            timezone: 'America/New_York',
            units: 'imperial'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'goal-1',
              user_id: 'user-123',
              effective_at: '2026-03-30',
              calorie_goal: 2100,
              protein_goal: 180,
              carbs_goal: 190,
              fat_goal: 60,
              target_weight_lbs: 178.5
            }
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'goal-2',
            user_id: 'user-123',
            effective_at: '2026-04-06',
            calorie_goal: 2050,
            protein_goal: 185,
            carbs_goal: 180,
            fat_goal: 62,
            target_weight_lbs: 177
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user_id: 'user-123',
            display_name: 'Profile User',
            current_weight_lbs: 179.4,
            start_weight_lbs: 181.2,
            target_weight_lbs: 175,
            weekly_weight_change: -0.8,
            weight_entries: 4,
            calorie_goal: 2100,
            calories_consumed: 1685,
            adherence_score: 87
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'weight-1',
              user_id: 'user-123',
              recorded_at: '2026-03-21',
              weight_lbs: 181.2
            },
            {
              id: 'weight-2',
              user_id: 'user-123',
              recorded_at: '2026-03-28',
              weight_lbs: 179.4
            }
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'weight-3',
            user_id: 'user-123',
            recorded_at: '2026-03-29',
            weight_lbs: 178.8
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await fetchProfile('token-123');
    await updateProfile(
      {
        display_name: 'Cut Phase',
        timezone: 'America/New_York',
        units: 'imperial'
      },
      'token-123'
    );
    await fetchUserGoals('token-123');
    await fetchProfileProgress('token-123');
    await fetchWeightEntries('token-123');
    await createWeightEntry(
      {
        recorded_at: '2026-03-29',
        weight_lbs: 178.8
      },
      'token-123'
    );
    await createUserGoal(
      {
        effective_at: '2026-04-06',
        calorie_goal: 2050,
        protein_goal: 185,
        carbs_goal: 180,
        fat_goal: 62,
        target_weight_lbs: 177
      },
      'token-123'
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/profile',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/profile',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          display_name: 'Cut Phase',
          timezone: 'America/New_York',
          units: 'imperial'
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/profile/goals',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:8000/api/profile/progress',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'http://localhost:8000/api/profile/weights',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      'http://localhost:8000/api/profile/weights',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      'http://localhost:8000/api/profile/goals',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
  });

  it('sends full editable profile fields when updating a live profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user_id: 'user-123',
          email: 'tester@example.com',
          display_name: 'Lean Bulk',
          timezone: 'America/New_York',
          units: 'imperial',
          setup_complete: true,
          sex: 'male',
          age_years: 30,
          height_cm: 180,
          current_weight_lbs: 195,
          goal_type: 'gain',
          target_weight_lbs: 205,
          activity_level: 'light',
          initial_calorie_target: 2624
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await updateProfile(
      {
        display_name: 'Lean Bulk',
        timezone: 'America/New_York',
        units: 'imperial',
        sex: 'male',
        age_years: 30,
        height_cm: 180,
        current_weight_lbs: 195,
        goal_type: 'gain',
        target_weight_lbs: 205,
        activity_level: 'light'
      },
      'token-123'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/profile',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        },
        body: JSON.stringify({
          display_name: 'Lean Bulk',
          timezone: 'America/New_York',
          units: 'imperial',
          sex: 'male',
          age_years: 30,
          height_cm: 180,
          current_weight_lbs: 195,
          goal_type: 'gain',
          target_weight_lbs: 205,
          activity_level: 'light'
        })
      })
    );
  });

  it('fetches meal plan days and meal prep tasks with auth headers and mutates meal prep status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'meal-plan-mon',
              label: 'Mon',
              focus: 'Training day',
              plan_date: '2026-03-30',
              slots: []
            }
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'meal-prep-1',
            title: 'Bake chicken breast',
            category: 'Protein',
            portions: '8 portions',
            status: 'Queued'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'meal-prep-1',
            title: 'Bake chicken breast',
            category: 'Protein',
            portions: '8 portions',
            status: 'Done'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await fetchMealPlanDays('token-123');
    await fetchMealPrepTasks('token-123');
    await createMealPrepTask(
      {
        title: 'Bake chicken breast',
        category: 'Protein',
        portions: '8 portions',
        status: 'Queued'
      },
      'token-123'
    );
    await updateMealPrepTaskStatus('meal-prep-1', 'Done', 'token-123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/tracker/meal-plan',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/tracker/meal-prep',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/tracker/meal-prep',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:8000/api/tracker/meal-prep/meal-prep-1',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
  });

  it('updates meal plan slot eaten timestamps with auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'meal-plan-mon',
          label: 'Mon',
          focus: 'Training day',
          plan_date: '2026-03-30',
          slots: [
            {
              id: 'slot-1',
              meal_plan_day_id: 'meal-plan-mon',
              position: 0,
              meal_label: 'Breakfast',
              title: 'Greek yogurt + berries',
              calories: 320,
              prep_status: 'Prepped',
              eaten_at: '2026-03-30T07:30:00',
              items: []
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await updateMealPlanSlotEatenAt('slot-1', '2026-03-30T07:30:00', 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/tracker/meal-plan/slots/slot-1',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        },
        body: JSON.stringify({ eaten_at: '2026-03-30T07:30:00' })
      })
    );
  });

  it('fetches the current food log from the logs endpoint and returns an empty today summary when missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const log = await fetchTodaysFoodLog('token-123');

    expect(log.entries).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/logs',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
  });

  it('fetches a food log for a selected date from the logs endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'log-selected',
            user_id: 'user-123',
            log_date: '2026-04-03',
            notes: null,
            entries: []
          }
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const log = await fetchFoodLogForDate('2026-04-03', 'token-123');

    expect(log.date).toBe('2026-04-03');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/logs',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
  });

  it('creates todays log when needed and posts food log entries with auth headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'log-today',
            user_id: 'user-123',
            log_date: localDateKey(),
            notes: null,
            entries: []
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'log-today',
            user_id: 'user-123',
            log_date: localDateKey(),
            notes: null,
            entries: [
              {
                id: 'entry-1',
                entry_type: 'food',
                food_item_id: 'food-greek-yogurt',
                meal_template_id: null,
                display_name: 'Greek yogurt, plain nonfat',
                brand: 'Generic',
                source: 'USDA',
                grams: 120,
                servings: 1,
                calories: 71,
                protein: 12.4,
                carbs: 4.3,
                fat: 0.5,
                created_at: '2026-03-29T12:00:00Z'
              }
            ]
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const log = await addFoodLogEntry(
      {
        food_id: 'food-greek-yogurt',
        grams: 120,
        calories: 71,
        protein: 12.4,
        carbs: 4.3,
        fat: 0.5
      },
      'token-123'
    );

    expect(log.entries).toHaveLength(1);
    expect(log.totals.calories).toBe(71);
    expect(log.entries[0].food_name).toBe('Greek yogurt, plain nonfat');
    expect(log.entries[0].brand).toBe('Generic');
    expect(log.entries[0].source).toBe('USDA');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/nutrition/logs',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/nutrition/logs',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/logs/log-today/entries',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Relish-Request': '1'
        }
      })
    );
  });
});
