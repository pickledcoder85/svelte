import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildApiUrl,
  acceptIngestionOutput,
  addFoodLogEntry,
  addFavoriteFood,
  createExerciseEntry,
  createMealPlanDay,
  createMealPrepTask,
  createWeightEntry,
  calculateMeal,
  createLocalSession,
  completeOnboarding,
  createUserGoal,
  fetchIngestionOutput,
  fetchIngestionQueue,
  favoriteRecipe,
  fetchFavoriteFoods,
  fetchExerciseEntries,
  fetchFavoriteRecipes,
  fetchMealPlanDays,
  fetchMealPrepTasks,
  fetchProfile,
  fetchProfileProgress,
  fetchUserGoals,
  fetchRecipes,
  fetchRecipe,
  importRecipe,
  fetchTodaysFoodLog,
  fetchWeightEntries,
  normalizeApiBaseUrl,
  rejectIngestionOutput,
  searchFoods,
  searchFoodsWithSession,
  updateProfile,
  updateMealPrepTaskStatus,
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
      expect.objectContaining({ method: 'POST' })
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
          target_weight_lbs: 170,
          activity_level: 'moderate'
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
        target_weight_lbs: 170,
        activity_level: 'moderate'
      },
      'token-123'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/profile/onboarding',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123', 'Content-Type': 'application/json' }
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
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `http://localhost:8000/api/ingestion/outputs/${demoIngestionOutputs[1].id}/reject`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123' }
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
        headers: { Authorization: 'Bearer token-123' }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:8000/api/recipes/${demoRecipe.id}/favorite`,
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-123' }
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
        headers: { Authorization: 'Bearer token-123' }
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
        headers: { Authorization: 'Bearer token-123' }
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
          Authorization: 'Bearer token-123'
        }
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
          Authorization: 'Bearer token-123'
        }
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
          Authorization: 'Bearer token-123'
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
          Authorization: 'Bearer token-123'
        }
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
          Authorization: 'Bearer token-123'
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
          Authorization: 'Bearer token-123'
        }
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
            log_date: new Date().toISOString().slice(0, 10),
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
            log_date: new Date().toISOString().slice(0, 10),
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
          Authorization: 'Bearer token-123'
        }
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/nutrition/logs/log-today/entries',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123'
        }
      })
    );
  });
});
