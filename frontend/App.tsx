import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import {
  addFoodLogEntry,
  addFavoriteFood,
  createExerciseEntry,
  calculateMeal,
  createLocalSession,
  createUserGoal,
  fetchBackendHealth,
  fetchExerciseEntries,
  fetchFavoriteFoods,
  fetchFavoriteRecipes,
  fetchMealPlanDays,
  fetchMealPrepTasks,
  fetchProfileProgress,
  fetchProfile,
  fetchUserGoals,
  fetchRecipes,
  fetchRecipe,
  fetchWeightEntries,
  fetchTodaysFoodLog,
  fetchWeeklyMetrics,
  favoriteRecipe,
  importRecipe,
  searchFoodsWithSession,
  unfavoriteFood,
  updateProfile,
  updateMealPrepTaskStatus,
  unfavoriteRecipe,
  searchFoods
} from './src/lib/api';
import { buildTrendChartGeometry, remainingCalories, selectRangeSeries } from './src/lib/dashboard';
import {
  formatMealPlanCardDate,
  formatMealPlanCardWeekday,
  resolveSelectedMealPlanDate,
  selectMealPlanDay,
  sortMealPlanDaysByDate
} from './src/lib/meal-plan';
import { buildTrackerTotals, buildWeightProgressSummary } from './src/lib/progress';
import {
  calculateFoodGrams,
  clampFoodQuantity,
  filterFoodsFuzzy,
  foodMacroLine,
  formatFoodQuantity,
  formatFoodReference,
  mergeFoodsById,
  selectFoodById,
  sortFoodsForPicker
} from './src/lib/foods';
import { mealTotals, progressPercent, recipeScaleLabel, round1, scaleMealIngredients } from './src/lib/nutrition';
import { IngestionReviewPanel } from './src/components/IngestionReviewPanel';
import {
  demoDashboardSnapshot,
  demoFoodResults,
  demoMeal,
  demoRangeSeries,
  demoRecipeFavorites,
  demoRecipeCatalog,
  demoRecipeImports
} from './src/mock-data';
import type {
  AppSection,
  DashboardRange,
  DashboardSnapshot,
  ExerciseEntry,
  FoodItem,
  FoodLogSummary,
  MealPlanDay,
  MealPrepTask,
  ProfileProgress,
  RecipeDefinition,
  UserGoal,
  UserProfile,
  WeightEntry
} from './src/types';

const recipeScales = [0.5, 1, 1.25, 1.5, 2] as const;
const sectionTabs: Array<{ id: AppSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profile', label: 'Profile' },
  { id: 'tracker', label: 'Tracker' },
  { id: 'foods', label: 'Food Search' },
  { id: 'meals', label: 'Meals' },
  { id: 'meal-plan', label: 'Meal Plan' },
  { id: 'meal-prep', label: 'Meal Prep' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'ingestion', label: 'Ingestion' }
];
const rangeTabs: DashboardRange[] = ['1D', '1W', '1M', '3M'];
const chartHeight = 160;
const heroBrandImage = require('./assets/favicon.png');

function toneColor(tone: 'checking' | 'live' | 'demo'): string {
  if (tone === 'live') {
    return '#0f766e';
  }
  if (tone === 'demo') {
    return '#b45309';
  }
  return '#1d4ed8';
}

export default function App(): ReactElement {
  const [section, setSection] = useState<AppSection>('dashboard');
  const [activeRange, setActiveRange] = useState<DashboardRange>('1D');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    ...demoDashboardSnapshot,
    rangeSeries: demoRangeSeries
  });
  const [syncTone, setSyncTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [syncLabel, setSyncLabel] = useState('Checking backend');
  const [syncDetail, setSyncDetail] = useState('Waiting for live backend data.');
  const [recipeScale, setRecipeScale] = useState<(typeof recipeScales)[number]>(1);
  const [showScaleOptions, setShowScaleOptions] = useState(false);
  const [foodDraft, setFoodDraft] = useState('');
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [foodSessionToken, setFoodSessionToken] = useState<string | null>(null);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>(() => sortFoodsForPicker(demoFoodResults));
  const [foodResults, setFoodResults] = useState<FoodItem[]>(() => sortFoodsForPicker(demoFoodResults));
  const [selectedFoodId, setSelectedFoodId] = useState(() => sortFoodsForPicker(demoFoodResults)[0]?.id ?? '');
  const [foodQuantities, setFoodQuantities] = useState<Record<string, number>>({});
  const [foodTone, setFoodTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [foodStatus, setFoodStatus] = useState('Starter favorites ready');
  const [foodError, setFoodError] = useState<string | null>(null);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [foodFavoriteSavingId, setFoodFavoriteSavingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileGoals, setProfileGoals] = useState<UserGoal[]>([]);
  const [profileTone, setProfileTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [profileStatus, setProfileStatus] = useState('Loading profile settings');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [profileProgress, setProfileProgress] = useState<ProfileProgress | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [profileDisplayNameDraft, setProfileDisplayNameDraft] = useState('');
  const [profileTimezoneDraft, setProfileTimezoneDraft] = useState('UTC');
  const [profileUnitsDraft, setProfileUnitsDraft] = useState<'imperial' | 'metric'>('imperial');
  const [goalEffectiveAtDraft, setGoalEffectiveAtDraft] = useState(() => new Date().toISOString().slice(0, 10));
  const [goalCaloriesDraft, setGoalCaloriesDraft] = useState('2100');
  const [goalProteinDraft, setGoalProteinDraft] = useState('180');
  const [goalCarbsDraft, setGoalCarbsDraft] = useState('190');
  const [goalFatDraft, setGoalFatDraft] = useState('60');
  const [goalWeightDraft, setGoalWeightDraft] = useState('178.5');
  const [logFoodDraft, setLogFoodDraft] = useState('chicken');
  const [logFoodSearchTerm, setLogFoodSearchTerm] = useState('chicken');
  const [logFoodResults, setLogFoodResults] = useState<FoodItem[]>([]);
  const [selectedLogFoodId, setSelectedLogFoodId] = useState('');
  const [logGrams, setLogGrams] = useState('100');
  const [foodLog, setFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog());
  const [foodLogTone, setFoodLogTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [foodLogStatus, setFoodLogStatus] = useState("Loading today's log");
  const [foodLogError, setFoodLogError] = useState<string | null>(null);
  const [foodLogLoading, setFoodLogLoading] = useState(true);
  const [isSavingLogEntry, setIsSavingLogEntry] = useState(false);
  const [logSearchTone, setLogSearchTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [logSearchStatus, setLogSearchStatus] = useState('Ready to search');
  const [logSearchError, setLogSearchError] = useState<string | null>(null);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [exerciseTitleDraft, setExerciseTitleDraft] = useState('Bike ride');
  const [exerciseMinutesDraft, setExerciseMinutesDraft] = useState('30');
  const [exerciseCaloriesDraft, setExerciseCaloriesDraft] = useState('220');
  const [trackerTone, setTrackerTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [trackerStatus, setTrackerStatus] = useState('Loading tracker data');
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [recipeFavorites, setRecipeFavorites] = useState<RecipeDefinition[]>([]);
  const [recipeCatalog, setRecipeCatalog] = useState<RecipeDefinition[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDefinition | null>(null);
  const [recipeTone, setRecipeTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [recipeStatus, setRecipeStatus] = useState('Loading recipe favorites');
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(true);
  const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);
  const [recipeSavingId, setRecipeSavingId] = useState<string | null>(null);
  const [recipeImportTone, setRecipeImportTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [recipeImportStatus, setRecipeImportStatus] = useState('Loading recipe import review');
  const [recipeImportError, setRecipeImportError] = useState<string | null>(null);
  const [recipeImportLoading, setRecipeImportLoading] = useState(true);
  const [importedRecipeId, setImportedRecipeId] = useState<string | null>(null);
  const [mealPlanDays, setMealPlanDays] = useState<MealPlanDay[]>([]);
  const [selectedMealPlanDate, setSelectedMealPlanDate] = useState<string | null>(null);
  const [mealPlanEatenSlots, setMealPlanEatenSlots] = useState<Record<string, Record<string, boolean>>>({});
  const [mealPlanTone, setMealPlanTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [mealPlanStatus, setMealPlanStatus] = useState('Loading meal plan');
  const [mealPlanError, setMealPlanError] = useState<string | null>(null);
  const [mealPrepTasks, setMealPrepTasks] = useState<MealPrepTask[]>([]);
  const [mealPrepTone, setMealPrepTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [mealPrepStatus, setMealPrepStatus] = useState('Loading meal prep');
  const [mealPrepError, setMealPrepError] = useState<string | null>(null);
  const [exerciseSaving, setExerciseSaving] = useState(false);
  const [mealPrepSavingId, setMealPrepSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFavoriteFoods() {
      setFoodTone('checking');
      setFoodStatus('Loading favorite foods');
      setFoodError(null);

      try {
        const session = await createLocalSession('foods@example.com', 'Food Favorites');
        if (cancelled) {
          return;
        }

        setFoodSessionToken(session.access_token);
        const favorites = await fetchFavoriteFoods(session.access_token);
        if (cancelled) {
          return;
        }

        const mergedFavorites = sortFoodsForPicker(
          mergeFoodsById(demoFoodResults, favorites.map((food) => ({ ...food, favorite: true })))
        );
        setFavoriteFoods(mergedFavorites);
        setFoodResults((current) =>
          foodSearchTerm.trim() ? current : mergedFavorites
        );
        setSelectedFoodId((current) => selectFoodById(mergedFavorites, current)?.id ?? mergedFavorites[0]?.id ?? '');
        setFoodTone('live');
        setFoodStatus(`${mergedFavorites.length} favorite foods cached for this session`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const seededFavorites = sortFoodsForPicker(demoFoodResults);
        setFoodSessionToken(null);
        setFavoriteFoods(seededFavorites);
        setFoodResults((current) => (foodSearchTerm.trim() ? current : seededFavorites));
        setSelectedFoodId((current) => selectFoodById(seededFavorites, current)?.id ?? seededFavorites[0]?.id ?? '');
        setFoodTone('demo');
        setFoodStatus(`${seededFavorites.length} seeded favorite foods ready`);
        setFoodError(error instanceof Error ? error.message : 'Favorite foods unavailable.');
      }
    }

    async function syncBackend() {
      setRecipeImportLoading(true);
      setRecipeImportTone('checking');
      setRecipeImportStatus('Reviewing imported recipe');
      setRecipeImportError(null);

      try {
        const [health, metrics, totals, recipeImport] = await Promise.all([
          fetchBackendHealth(),
          fetchWeeklyMetrics(),
          calculateMeal(demoMeal),
          importRecipe(demoRecipeImports)
        ]);

        if (cancelled) {
          return;
        }

        setSnapshot({
          ...demoDashboardSnapshot,
          connectionLabel: health.service,
          connectionDetail: `Connected at ${new Date(health.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}`,
          weeklyMetrics: metrics,
          mealTotals: totals,
          rangeSeries: demoRangeSeries.map((series) =>
            series.range === '1W'
              ? {
                  ...series,
                  targetCalories: metrics.calorie_goal,
                  caloriesConsumed: metrics.calories_consumed,
                  macroTargets: metrics.macro_targets,
                  macroConsumed: metrics.macro_consumed
                }
              : series
          ),
          recipeImport
        });
        setImportedRecipeId(recipeImport.id);
        setRecipeImportTone('live');
        setRecipeImportStatus(`Imported "${recipeImport.title}" and selected it for review`);
        setSyncTone('live');
        setSyncLabel('Live backend');
        setSyncDetail('Expo is reading live metrics and recipes from the Python API.');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSyncTone('checking');
        setSyncLabel('Backend unavailable');
        setSyncDetail(error instanceof Error ? error.message : 'Backend unavailable.');
        setRecipeImportTone('demo');
        setRecipeImportStatus('Showing seeded recipe import review');
        setRecipeImportError(error instanceof Error ? error.message : 'Recipe import unavailable.');
      }
      if (!cancelled) {
        setRecipeImportLoading(false);
      }
    }

    void loadFavoriteFoods();
    void syncBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileSettings() {
      if (!foodSessionToken) {
        setProfile(null);
        setProfileGoals([]);
        setProfileProgress(null);
        setWeightEntries([]);
        setProfileDisplayNameDraft('');
        setProfileTimezoneDraft('UTC');
        setProfileUnitsDraft('imperial');
        setProfileTone('checking');
        setProfileStatus('Profile data unavailable until a backend session is ready');
        setProfileError('No active profile session.');
        return;
      }

      setProfileTone('checking');
      setProfileStatus('Loading profile settings');
      setProfileError(null);

      try {
        const [loadedProfile, goals, progress, weights] = await Promise.all([
          fetchProfile(foodSessionToken),
          fetchUserGoals(foodSessionToken),
          fetchProfileProgress(foodSessionToken),
          fetchWeightEntries(foodSessionToken)
        ]);

        if (cancelled) {
          return;
        }

        setProfile(loadedProfile);
        setProfileGoals(goals);
        setProfileProgress(progress);
        setWeightEntries(weights);
        setProfileDisplayNameDraft(loadedProfile.display_name ?? '');
        setProfileTimezoneDraft(loadedProfile.timezone);
        setProfileUnitsDraft(loadedProfile.units);
        setProfileTone('live');
        setProfileStatus(
          `${goals.length} goal${goals.length === 1 ? '' : 's'}, ${progress.weight_entries} weight entr${
            progress.weight_entries === 1 ? 'y' : 'ies'
          }, and ${progress.adherence_score}% adherence loaded`
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setProfile(null);
        setProfileGoals([]);
        setProfileProgress(null);
        setWeightEntries([]);
        setProfileDisplayNameDraft('');
        setProfileTimezoneDraft('UTC');
        setProfileUnitsDraft('imperial');
        setProfileTone('checking');
        setProfileStatus('Profile data unavailable');
        setProfileError(error instanceof Error ? error.message : 'Profile settings unavailable.');
      }
    }

    void loadProfileSettings();

    return () => {
      cancelled = true;
    };
  }, [foodSessionToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadTrackerSections() {
      if (!foodSessionToken) {
        setTrackerTone('checking');
        setTrackerStatus('Tracker data unavailable until a backend session is ready');
        setTrackerError('No active tracker session.');
        setExerciseEntries([]);
        setMealPlanTone('checking');
        setMealPlanStatus('Meal plan unavailable until a backend session is ready');
        setMealPlanError('No active tracker session.');
        setMealPlanDays([]);
        setSelectedMealPlanDate(null);
        setMealPlanEatenSlots({});
        setMealPrepTone('checking');
        setMealPrepStatus('Meal prep unavailable until a backend session is ready');
        setMealPrepError('No active tracker session.');
        setMealPrepTasks([]);
        return;
      }

      setTrackerTone('checking');
      setTrackerStatus('Loading tracker items');
      setTrackerError(null);
      setMealPlanTone('checking');
      setMealPlanStatus('Loading meal plan');
      setMealPlanError(null);
      setMealPrepTone('checking');
      setMealPrepStatus('Loading meal prep');
      setMealPrepError(null);

      try {
        const [exercise, mealPlan, mealPrep] = await Promise.all([
          fetchExerciseEntries(foodSessionToken),
          fetchMealPlanDays(foodSessionToken),
          fetchMealPrepTasks(foodSessionToken)
        ]);

        if (cancelled) {
          return;
        }

        setExerciseEntries(exercise);
        setTrackerTone('live');
        setTrackerStatus(
          exercise.length > 0
            ? `${exercise.length} tracked exercise entr${exercise.length === 1 ? 'y' : 'ies'} loaded`
            : 'No saved exercise yet'
        );

        setMealPlanDays(mealPlan);
        setSelectedMealPlanDate((current) =>
          resolveSelectedMealPlanDate(mealPlan, current)
        );
        setMealPlanTone('live');
        setMealPlanStatus(
          mealPlan.length > 0
            ? `${mealPlan.length} meal plan day${mealPlan.length === 1 ? '' : 's'} loaded`
            : 'No meal plan saved yet'
        );

        setMealPrepTasks(mealPrep);
        setMealPrepTone('live');
        setMealPrepStatus(
          mealPrep.length > 0
            ? `${mealPrep.length} meal prep task${mealPrep.length === 1 ? '' : 's'} loaded`
            : 'No meal prep tasks saved yet'
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setExerciseEntries([]);
        setMealPlanDays([]);
        setSelectedMealPlanDate(null);
        setMealPlanEatenSlots({});
        setMealPrepTasks([]);
        setTrackerTone('checking');
        setTrackerStatus('Tracker data unavailable');
        setTrackerError(error instanceof Error ? error.message : 'Tracker data unavailable.');
        setMealPlanTone('checking');
        setMealPlanStatus('Meal plan unavailable');
        setMealPlanError(error instanceof Error ? error.message : 'Meal plan unavailable.');
        setMealPrepTone('checking');
        setMealPrepStatus('Meal prep unavailable');
        setMealPrepError(error instanceof Error ? error.message : 'Meal prep unavailable.');
      }
    }

    void loadTrackerSections();

    return () => {
      cancelled = true;
    };
  }, [foodSessionToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadFoodLog() {
      setFoodLogLoading(true);
      setFoodLogTone('checking');
      setFoodLogStatus("Loading today's log");
      setFoodLogError(null);

      try {
        const log = await fetchTodaysFoodLog();

        if (cancelled) {
          return;
        }

        setFoodLog(log);
        setFoodLogTone('live');
        setFoodLogStatus(
          log.entries.length === 0
            ? 'No foods logged yet'
            : `${log.entries.length} persisted entr${log.entries.length === 1 ? 'y' : 'ies'} loaded`
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFoodLog(createEmptyFoodLog());
        setFoodLogTone('checking');
        setFoodLogStatus("Today's log unavailable");
        setFoodLogError(error instanceof Error ? error.message : 'Daily log unavailable.');
      } finally {
        if (!cancelled) {
          setFoodLogLoading(false);
        }
      }
    }

    void loadFoodLog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncFoodSearch() {
      const query = foodSearchTerm.trim();
      if (!query) {
        const seededFoods = sortFoodsForPicker(favoriteFoods);
        setFoodStatus(
          seededFoods.length === 0
            ? 'No favorites cached yet'
            : `${seededFoods.length} cached favorites ready`
        );
        setFoodTone(foodSessionToken ? 'live' : 'demo');
        setFoodError(null);
        setFoodResults(seededFoods);
        setSelectedFoodId((current) => selectFoodById(seededFoods, current)?.id ?? seededFoods[0]?.id ?? '');
        return;
      }

      setFoodTone('checking');
      setFoodStatus(`Refining matches for "${query}" from favorites`);
      setFoodError(null);

      const localMatches = filterFoodsFuzzy(favoriteFoods, query);
      setFoodResults(localMatches);
      setSelectedFoodId((current) => selectFoodById(localMatches, current)?.id ?? localMatches[0]?.id ?? '');

      try {
        const results = foodSessionToken
          ? await searchFoodsWithSession(query, foodSessionToken)
          : await searchFoods(query);

        if (cancelled) {
          return;
        }

        const mergedResults = mergeFoodsById(favoriteFoods, results);
        const filteredResults = filterFoodsFuzzy(mergedResults, query);
        setFoodResults(filteredResults);
        setSelectedFoodId((current) => selectFoodById(filteredResults, current)?.id ?? filteredResults[0]?.id ?? '');
        setFoodTone(foodSessionToken ? 'live' : 'demo');
        setFoodStatus(
          `${filteredResults.length} match${filteredResults.length === 1 ? '' : 'es'} across favorites and live search`
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        const filteredResults = filterFoodsFuzzy(favoriteFoods, query);
        setFoodResults(filteredResults);
        setSelectedFoodId((current) => selectFoodById(filteredResults, current)?.id ?? filteredResults[0]?.id ?? '');
        setFoodTone('demo');
        setFoodStatus('Showing fuzzy matches from cached favorites');
        setFoodError(error instanceof Error ? error.message : 'Food search unavailable.');
      }
    }

    void syncFoodSearch();

    return () => {
      cancelled = true;
    };
  }, [favoriteFoods, foodSearchTerm, foodSessionToken]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setFoodSearchTerm(foodDraft), 150);
    return () => clearTimeout(timeoutId);
  }, [foodDraft]);

  useEffect(() => {
    let cancelled = false;

    async function syncLogFoodSearch() {
      const query = logFoodSearchTerm.trim();
      if (!query) {
        setLogFoodResults(demoFoodResults);
        setSelectedLogFoodId(demoFoodResults[0].id);
        setLogSearchTone('checking');
        setLogSearchStatus('Enter a food search to add something to today');
        setLogSearchError(null);
        return;
      }

      setLogSearchTone('checking');
      setLogSearchStatus(`Searching for "${query}"`);
      setLogSearchError(null);

      try {
        const results = await searchFoods(query);

        if (cancelled) {
          return;
        }

        setLogFoodResults(results);
        setSelectedLogFoodId((current) => selectFoodById(results, current)?.id ?? results[0]?.id ?? '');
        setLogSearchTone('live');
        setLogSearchStatus(`${results.length} result${results.length === 1 ? '' : 's'} available for logging`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLogFoodResults([]);
        setSelectedLogFoodId('');
        setLogSearchTone('checking');
        setLogSearchStatus('Food search unavailable');
        setLogSearchError(error instanceof Error ? error.message : 'Food search unavailable.');
      }
    }

    void syncLogFoodSearch();

    return () => {
      cancelled = true;
    };
  }, [logFoodSearchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeFavorites() {
      setRecipeLoading(true);
      setRecipeTone('checking');
      setRecipeStatus('Loading recipe favorites');
      setRecipeError(null);

      try {
        const [catalog, favorites] = await Promise.all([fetchRecipes(), fetchFavoriteRecipes()]);

        if (cancelled) {
          return;
        }

        const favoriteIds = new Set(favorites.map((recipe) => recipe.id));
        const mergedCatalog = catalog.map((recipe) => ({
          ...recipe,
          favorite: favoriteIds.has(recipe.id)
        }));
        const appendedFavorites = favorites
          .filter((recipe) => !mergedCatalog.some((current) => current.id === recipe.id))
          .map((recipe) => ({ ...recipe, favorite: true }));
        const nextCatalog = [...mergedCatalog, ...appendedFavorites];

        setRecipeCatalog(nextCatalog);
        setRecipeFavorites(favorites);
        setRecipeTone('live');
        setRecipeStatus(
          favorites.length === 0
            ? 'No saved recipe favorites yet'
            : `${favorites.length} saved favorite${favorites.length === 1 ? '' : 's'} loaded`
        );

        setSelectedRecipeId((current) => {
          if (current && nextCatalog.some((recipe) => recipe.id === current)) {
            return current;
          }
          return favorites[0]?.id ?? nextCatalog[0]?.id ?? null;
        });

        setSelectedRecipe((current) => {
          if (current && nextCatalog.some((recipe) => recipe.id === current.id)) {
            return current;
          }
          return favorites[0] ?? nextCatalog[0] ?? null;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecipeCatalog(demoRecipeCatalog);
        setRecipeFavorites(demoRecipeFavorites);
        setSelectedRecipeId(demoRecipeFavorites[0]?.id ?? demoRecipeCatalog[0]?.id ?? null);
        setSelectedRecipe(demoRecipeFavorites[0] ?? demoRecipeCatalog[0] ?? null);
        setRecipeTone('demo');
        setRecipeStatus('Showing demo recipe favorites');
        setRecipeError(error instanceof Error ? error.message : 'Recipe favorites unavailable.');
      } finally {
        if (!cancelled) {
          setRecipeLoading(false);
        }
      }
    }

    void loadRecipeFavorites();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (importedRecipeId) {
      setSelectedRecipeId(importedRecipeId);
    }
  }, [importedRecipeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedRecipe() {
      if (!selectedRecipeId) {
        setSelectedRecipe(null);
        setRecipeDetailLoading(false);
        return;
      }

      setRecipeDetailLoading(true);

      try {
        const recipe = await fetchRecipe(selectedRecipeId);

        if (cancelled) {
          return;
        }

        setSelectedRecipe(recipe);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallback = recipeFavorites.find((item) => item.id === selectedRecipeId) ?? null;
        setSelectedRecipe(fallback);
        if (fallback === null) {
          setRecipeTone('demo');
          setRecipeStatus('Showing demo recipe detail');
          setRecipeError(error instanceof Error ? error.message : 'Recipe detail unavailable.');
        }
      } finally {
        if (!cancelled) {
          setRecipeDetailLoading(false);
        }
      }
    }

    void loadSelectedRecipe();

    return () => {
      cancelled = true;
    };
  }, [recipeFavorites, selectedRecipeId]);

  const selectedSeries = useMemo(
    () => selectRangeSeries(snapshot.rangeSeries, activeRange),
    [activeRange, snapshot.rangeSeries]
  );
  const recipeImportResult = snapshot.recipeImport ?? null;
  const selectedFood = useMemo(
    () => selectFoodById(foodResults, selectedFoodId),
    [foodResults, selectedFoodId]
  );
  const selectedLogFood = useMemo(
    () => selectFoodById(logFoodResults, selectedLogFoodId),
    [logFoodResults, selectedLogFoodId]
  );
  const sortedMealPlanDays = useMemo(() => sortMealPlanDaysByDate(mealPlanDays), [mealPlanDays]);
  const selectedMealPlanDay = useMemo(
    () => selectMealPlanDay(sortedMealPlanDays, selectedMealPlanDate),
    [selectedMealPlanDate, sortedMealPlanDays]
  );
  const trackerTotals = useMemo(() => buildTrackerTotals(foodLog, exerciseEntries), [exerciseEntries, foodLog]);
  const weightProgress = useMemo(
    () => buildWeightProgressSummary(profileProgress, weightEntries),
    [profileProgress, weightEntries]
  );
  const mealPreview = useMemo(() => scaleMealIngredients(demoMeal, recipeScale), [recipeScale]);
  const recipeTotals = useMemo(() => mealTotals(mealPreview), [mealPreview]);
  const importedRecipeSelected = importedRecipeId !== null && selectedRecipeId === importedRecipeId;
  const logEntryPreview = useMemo(() => {
    if (!selectedLogFood || selectedLogFood.serving_size <= 0) {
      return null;
    }

    const grams = Number(logGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      return null;
    }

    const multiplier = grams / selectedLogFood.serving_size;
    return {
      calories: round1(selectedLogFood.calories * multiplier),
      macros: {
        protein: round1(selectedLogFood.macros.protein * multiplier),
        carbs: round1(selectedLogFood.macros.carbs * multiplier),
        fat: round1(selectedLogFood.macros.fat * multiplier)
      }
    };
  }, [logGrams, selectedLogFood]);
  const calorieProgress = progressPercent(
    selectedSeries.caloriesConsumed,
    selectedSeries.targetCalories
  );
  const rangeRemaining = remainingCalories(
    selectedSeries.targetCalories,
    selectedSeries.caloriesConsumed
  );

  function submitFoodSearch() {
    setIsSubmittingSearch(true);
    setFoodSearchTerm(foodDraft);
    setTimeout(() => setIsSubmittingSearch(false), 250);
  }

  function foodQuantityForId(foodId: string): number {
    return foodQuantities[foodId] ?? 1;
  }

  function adjustFoodQuantity(foodId: string, delta: number) {
    setFoodQuantities((current) => ({
      ...current,
      [foodId]: clampFoodQuantity((current[foodId] ?? 1) + delta)
    }));
  }

  async function toggleFoodFavorite(food: FoodItem) {
    if (foodFavoriteSavingId === food.id) {
      return;
    }

    const nextFavorite = !food.favorite;
    const optimisticFood = { ...food, favorite: nextFavorite };
    const nextFavorites = nextFavorite
      ? sortFoodsForPicker(mergeFoodsById(favoriteFoods, [optimisticFood]))
      : sortFoodsForPicker(favoriteFoods.filter((item) => item.id !== food.id));
    const nextResults = sortFoodsForPicker(
      foodSearchTerm.trim()
        ? mergeFoodsById(
            foodResults.map((item) => (item.id === food.id ? optimisticFood : item)),
            nextFavorites
          )
        : nextFavorites
    );

    setFoodFavoriteSavingId(food.id);
    setFavoriteFoods(nextFavorites);
    setFoodResults(nextResults);
    setSelectedFoodId(food.id);
    setFoodTone(foodSessionToken ? 'checking' : 'demo');
    setFoodStatus(nextFavorite ? `Saving ${food.name} to favorite foods` : `Removing ${food.name} from favorite foods`);
    setFoodError(null);

    try {
      if (foodSessionToken) {
        if (nextFavorite) {
          await addFavoriteFood(food.id, foodSessionToken);
        } else {
          await unfavoriteFood(food.id, foodSessionToken);
        }
      }
      setFoodTone(foodSessionToken ? 'live' : 'demo');
      setFoodStatus(nextFavorite ? `${food.name} added to favorite foods` : `${food.name} removed from favorite foods`);
    } catch (error) {
      const revertedFavorites = favoriteFoods;
      const revertedResults = foodResults;
      setFavoriteFoods(revertedFavorites);
      setFoodResults(revertedResults);
      setSelectedFoodId((current) => selectFoodById(revertedResults, current)?.id ?? revertedResults[0]?.id ?? '');
      setFoodTone('demo');
      setFoodStatus(`Could not save ${food.name}`);
      setFoodError(error instanceof Error ? error.message : 'Unable to save favorite food.');
    } finally {
      setFoodFavoriteSavingId(null);
    }
  }

  async function quickAddFoodToToday(food: FoodItem) {
    const quantity = foodQuantityForId(food.id);
    const grams = calculateFoodGrams(food, quantity);

    if (!Number.isFinite(grams) || grams <= 0) {
      setFoodLogTone('checking');
      setFoodLogStatus('Choose a valid quantity before adding.');
      setFoodLogError('Choose a valid quantity before adding.');
      return;
    }

    setIsSavingLogEntry(true);
    setFoodLogTone('checking');
    setFoodLogStatus(`Adding ${formatFoodQuantity(quantity)} of ${food.name} to today`);
    setFoodLogError(null);

    try {
      const updatedLog = await addFoodLogEntry({
        food_id: food.id,
        grams
      });
      setFoodLog(updatedLog);
      setFoodLogTone('live');
      setFoodLogStatus(`Added ${food.name} to today at ${grams.toLocaleString()} g`);
    } catch (error) {
      setFoodLogTone('checking');
      setFoodLogStatus(`Could not save ${food.name}`);
      setFoodLogError(error instanceof Error ? error.message : 'Unable to add food log entry.');
    } finally {
      setIsSavingLogEntry(false);
    }
  }

  async function submitFoodLogEntry() {
    const grams = Number(logGrams);
    if (!selectedLogFood || !Number.isFinite(grams) || grams <= 0) {
      setFoodLogTone('checking');
      setFoodLogStatus('Enter a valid gram amount before adding.');
      setFoodLogError('Enter a valid gram amount before adding.');
      return;
    }

    setIsSavingLogEntry(true);
    setFoodLogTone('checking');
    setFoodLogStatus(`Adding ${selectedLogFood.name} to today`);
    setFoodLogError(null);

    try {
      const updatedLog = await addFoodLogEntry({
        food_id: selectedLogFood.id,
        grams: round1(grams)
      });
      setFoodLog(updatedLog);
      setFoodLogTone('live');
      setFoodLogStatus(`Added ${selectedLogFood.name} to today's log`);
      setLogGrams('100');
    } catch (error) {
      setFoodLogTone('checking');
      setFoodLogStatus(`Could not save ${selectedLogFood.name}`);
      setFoodLogError(error instanceof Error ? error.message : 'Unable to add food log entry.');
    } finally {
      setIsSavingLogEntry(false);
    }
  }

  async function addExerciseEntry() {
    const duration_minutes = Number(exerciseMinutesDraft);
    const calories_burned = Number(exerciseCaloriesDraft);
    const title = exerciseTitleDraft.trim();

    if (!title || !Number.isFinite(duration_minutes) || duration_minutes <= 0 || !Number.isFinite(calories_burned) || calories_burned <= 0) {
      return;
    }

    const payload = {
      title,
      duration_minutes: Math.round(duration_minutes),
      calories_burned: Math.round(calories_burned),
      logged_on: new Date().toISOString().slice(0, 10),
      logged_at: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      intensity: calories_burned >= 300 ? 'High' : duration_minutes >= 30 ? 'Moderate' : 'Low'
    } as const;

    const optimisticEntry: ExerciseEntry = {
      id: `exercise-${Date.now()}`,
      ...payload
    };

    setExerciseSaving(true);
    setTrackerTone('checking');
    setTrackerStatus(`Saving ${title}`);
    setTrackerError(null);
    setExerciseEntries((current) => [optimisticEntry, ...current]);

    try {
      if (foodSessionToken) {
        const saved = await createExerciseEntry(payload, foodSessionToken);
        setExerciseEntries((current) => [saved, ...current.filter((entry) => entry.id !== optimisticEntry.id)]);
      }
      setTrackerTone('live');
      setTrackerStatus(`${title} added to tracker`);
      setExerciseTitleDraft('Walk');
      setExerciseMinutesDraft('20');
      setExerciseCaloriesDraft('120');
    } catch (error) {
      setExerciseEntries((current) => current.filter((entry) => entry.id !== optimisticEntry.id));
      setTrackerTone('checking');
      setTrackerStatus(`Could not save ${title}`);
      setTrackerError(error instanceof Error ? error.message : 'Unable to save tracker entry.');
    } finally {
      setExerciseSaving(false);
    }
  }

  async function saveProfileSettings() {
    if (!profile) {
      return;
    }

    const payload = {
      display_name: profileDisplayNameDraft.trim().length > 0 ? profileDisplayNameDraft.trim() : null,
      timezone: profileTimezoneDraft.trim() || 'UTC',
      units: profileUnitsDraft
    } satisfies Parameters<typeof updateProfile>[0];

    setProfileSaving(true);
    setProfileTone('checking');
    setProfileStatus('Saving profile settings');
    setProfileError(null);

    try {
      if (foodSessionToken) {
        const updated = await updateProfile(payload, foodSessionToken);
        setProfile(updated);
        setProfileDisplayNameDraft(updated.display_name ?? '');
        setProfileTimezoneDraft(updated.timezone);
        setProfileUnitsDraft(updated.units);
      }
      setProfileTone('live');
      setProfileStatus('Profile settings saved');
    } catch (error) {
      setProfileTone('checking');
      setProfileStatus('Could not save profile settings');
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile settings.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function addGoal() {
    const calorie_goal = Number(goalCaloriesDraft);
    const protein_goal = Number(goalProteinDraft);
    const carbs_goal = Number(goalCarbsDraft);
    const fat_goal = Number(goalFatDraft);
    const target_weight_lbs = goalWeightDraft.trim() === '' ? null : Number(goalWeightDraft);

    if (
      !Number.isFinite(calorie_goal) ||
      calorie_goal <= 0 ||
      !Number.isFinite(protein_goal) ||
      protein_goal < 0 ||
      !Number.isFinite(carbs_goal) ||
      carbs_goal < 0 ||
      !Number.isFinite(fat_goal) ||
      fat_goal < 0 ||
      (target_weight_lbs !== null && !Number.isFinite(target_weight_lbs))
    ) {
      return;
    }

    setGoalSaving(true);
    setProfileTone('checking');
    setProfileStatus('Saving new goal');
    setProfileError(null);

    try {
      const saved = foodSessionToken
        ? await createUserGoal(
            {
              effective_at: goalEffectiveAtDraft,
              calorie_goal: Math.round(calorie_goal),
              protein_goal,
              carbs_goal,
              fat_goal,
              target_weight_lbs
            },
            foodSessionToken
          )
        : null;

      if (saved) {
        setProfileGoals((current) => [saved, ...current]);
      }
      setProfileTone('live');
      setProfileStatus('Goal saved');
      setGoalEffectiveAtDraft(new Date().toISOString().slice(0, 10));
      setGoalCaloriesDraft('2100');
      setGoalProteinDraft('180');
      setGoalCarbsDraft('190');
      setGoalFatDraft('60');
      setGoalWeightDraft('178.5');
    } catch (error) {
      setProfileTone('checking');
      setProfileStatus('Could not save goal');
      setProfileError(error instanceof Error ? error.message : 'Unable to save goal.');
    } finally {
      setGoalSaving(false);
    }
  }

  async function cycleMealPrepStatus(taskId: string) {
    const nextStatusByCurrent: Record<MealPrepTask['status'], MealPrepTask['status']> = {
      Queued: 'In progress',
      'In progress': 'Done',
      Done: 'Queued'
    };
    const currentTask = mealPrepTasks.find((task) => task.id === taskId);
    if (!currentTask) {
      return;
    }

    const nextStatus = nextStatusByCurrent[currentTask.status];
    const optimisticTask = { ...currentTask, status: nextStatus };

    setMealPrepSavingId(taskId);
    setMealPrepTone('checking');
    setMealPrepStatus(`Marking ${currentTask.title} as ${nextStatus.toLowerCase()}`);
    setMealPrepError(null);
    setMealPrepTasks((current) => current.map((task) => (task.id === taskId ? optimisticTask : task)));

    try {
      if (foodSessionToken) {
        const updated = await updateMealPrepTaskStatus(taskId, nextStatus, foodSessionToken);
        setMealPrepTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
      }
      setMealPrepTone(foodSessionToken ? 'live' : 'demo');
      setMealPrepStatus(`${currentTask.title} marked ${nextStatus.toLowerCase()}`);
    } catch (error) {
      setMealPrepTasks((current) => current.map((task) => (task.id === taskId ? currentTask : task)));
      setMealPrepTone('demo');
      setMealPrepStatus(`Could not update ${currentTask.title}`);
      setMealPrepError(error instanceof Error ? error.message : 'Unable to update meal prep task.');
    } finally {
      setMealPrepSavingId(null);
    }
  }

  function toggleMealPlanMeal(day: MealPlanDay, slotId: string, slotLabel: string) {
    const currentlyLogged = mealPlanEatenSlots[day.id]?.[slotId] ?? false;
    setMealPlanEatenSlots((current) => {
      const nextDayState = { ...(current[day.id] ?? {}) };
      const nextLogged = !nextDayState[slotId];
      if (nextLogged) {
        nextDayState[slotId] = true;
      } else {
        delete nextDayState[slotId];
      }

      const nextState = { ...current };
      if (Object.keys(nextDayState).length === 0) {
        delete nextState[day.id];
      } else {
        nextState[day.id] = nextDayState;
      }

      return nextState;
    });

    setMealPlanTone('live');
    setMealPlanStatus(`${slotLabel} ${currentlyLogged ? 'unchecked' : 'logged as eaten'} for ${day.label}`);
  }

  function updateRecipeCollection(recipes: RecipeDefinition[], updatedRecipe: RecipeDefinition): RecipeDefinition[] {
    const remaining = recipes.filter((recipe) => recipe.id !== updatedRecipe.id);
    return updatedRecipe.favorite ? [updatedRecipe, ...remaining] : remaining;
  }

  async function toggleRecipeFavorite(recipe: RecipeDefinition, nextFavorite: boolean) {
    if (recipeSavingId === recipe.id) {
      return;
    }

    setRecipeSavingId(recipe.id);
    setRecipeTone('checking');
    setRecipeStatus(
      nextFavorite ? `Saving ${recipe.title} to favorites` : `Removing ${recipe.title} from favorites`
    );
    setRecipeError(null);

    const previousCatalog = recipeCatalog;
    const previousFavorites = recipeFavorites;
    const previousSelected = selectedRecipe;
    const previousSelectedId = selectedRecipeId;

    const optimisticRecipe = { ...recipe, favorite: nextFavorite };
    setRecipeCatalog((current) => updateRecipeCollection(current, optimisticRecipe));
    setRecipeFavorites((current) => updateRecipeCollection(current, optimisticRecipe));
    if (previousSelectedId === recipe.id) {
      setSelectedRecipe(optimisticRecipe);
    } else if (previousSelected?.id === recipe.id) {
      setSelectedRecipe(optimisticRecipe);
    }

    try {
      const updated = nextFavorite
        ? await favoriteRecipe(recipe.id)
        : await unfavoriteRecipe(recipe.id);

      setRecipeCatalog((current) => updateRecipeCollection(current, updated));
      setRecipeFavorites((current) => updateRecipeCollection(current, updated));
      setSelectedRecipe(updated);
      setSelectedRecipeId(updated.id);
      setRecipeTone('live');
      setRecipeStatus(
        nextFavorite ? `${updated.title} saved to favorites` : `${updated.title} removed from favorites`
      );
    } catch (error) {
      setRecipeCatalog(previousCatalog);
      setRecipeFavorites(previousFavorites);
      setSelectedRecipe(previousSelected);
      setSelectedRecipeId(previousSelectedId);
      setRecipeTone('demo');
      setRecipeStatus(`Could not update ${recipe.title}`);
      setRecipeError(error instanceof Error ? error.message : 'Unable to update recipe favorite.');
    } finally {
      setRecipeSavingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Nutrition OS</Text>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.headline}>Expo-powered nutrition tracking for browser and iPhone.</Text>
              <Text style={styles.lede}>
                The frontend now runs as an Expo app with web support, so you can preview in a browser and in Expo Go while the FastAPI backend stays unchanged.
              </Text>
            </View>

            <View style={styles.heroAside}>
              <View style={styles.ringCard}>
                <Text style={styles.ringValue}>{calorieProgress}%</Text>
                <Text style={styles.ringLabel}>{selectedSeries.label}</Text>
                <Text style={styles.ringCaption}>
                  {selectedSeries.caloriesConsumed.toLocaleString()} / {selectedSeries.targetCalories.toLocaleString()} kcal
                </Text>
              </View>

              <View style={styles.mascotCard}>
                <Image source={heroBrandImage} style={styles.mascotImage} resizeMode="contain" />
                <Text style={styles.mascotLabel}>Pickle keeps the cut on track.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.statusBanner, { borderColor: toneColor(syncTone) }]}>
          <Text style={styles.statusLabel}>{syncLabel}</Text>
          <Text style={styles.statusDetail}>{syncDetail}</Text>
        </View>

        <View style={styles.sectionTabs}>
          {sectionTabs.map((item) => {
            const active = item.id === section;
            return (
              <Pressable
                key={item.id}
                style={[styles.sectionTab, active && styles.sectionTabActive]}
                onPress={() => setSection(item.id)}
              >
                <Text style={[styles.sectionTabLabel, active && styles.sectionTabLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {section === 'dashboard' && (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Dashboard</Text>
                  <Text style={styles.panelTitle}>Calorie target vs consumed</Text>
                </View>
                <Text style={styles.panelDetail}>{selectedSeries.detail}</Text>
              </View>

              <View style={styles.rangeTabs}>
                {rangeTabs.map((range) => {
                  const active = range === activeRange;
                  return (
                    <Pressable
                      key={range}
                      style={[styles.rangeTab, active && styles.rangeTabActive]}
                      onPress={() => setActiveRange(range)}
                    >
                      <Text style={[styles.rangeTabLabel, active && styles.rangeTabLabelActive]}>
                        {range}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.metricRow}>
                <MetricTile label="Target" value={`${selectedSeries.targetCalories.toLocaleString()} kcal`} />
                <MetricTile label="Consumed" value={`${selectedSeries.caloriesConsumed.toLocaleString()} kcal`} />
                <MetricTile label="Remaining" value={`${rangeRemaining.toLocaleString()} kcal`} />
              </View>

              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.panelEyebrow}>Live progress</Text>
                    <Text style={styles.detailTitle}>Weekly metrics, goals, and tracker totals</Text>
                  </View>
                  <Text style={styles.detailSubtitle}>
                    Live data already on main, summarized from the live backend data.
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <MetricTile
                    label="Weekly calories"
                    value={`${snapshot.weeklyMetrics.calories_consumed.toLocaleString()} / ${snapshot.weeklyMetrics.calorie_goal.toLocaleString()} kcal`}
                  />
                  <MetricTile label="Adherence" value={`${snapshot.weeklyMetrics.adherence_score}%`} />
                  <MetricTile
                    label="Weekly change"
                    value={`${weightProgress.weeklyWeightChange > 0 ? '+' : ''}${weightProgress.weeklyWeightChange} lb`}
                  />
                </View>

                <View style={styles.metricRow}>
                  <MetricTile
                    label="Current weight"
                    value={
                      weightProgress.currentWeightLbs !== null
                        ? `${weightProgress.currentWeightLbs.toLocaleString()} lb`
                        : '—'
                    }
                  />
                  <MetricTile
                    label="Target weight"
                    value={
                      weightProgress.targetWeightLbs !== null
                        ? `${weightProgress.targetWeightLbs.toLocaleString()} lb`
                        : '—'
                    }
                  />
                  <MetricTile
                    label="Exercise burn"
                    value={`${trackerTotals.exerciseCalories.toLocaleString()} kcal`}
                  />
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.panelEyebrow}>Tracker totals</Text>
                    <Text style={styles.detailTitle}>Food, movement, and net calories</Text>
                  </View>
                  <Text style={styles.detailSubtitle}>
                    Today’s tracker data updates from the live food log and exercise entries.
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <MetricTile label="Food" value={`${trackerTotals.foodCalories.toLocaleString()} kcal`} />
                  <MetricTile label="Exercise" value={`${trackerTotals.exerciseCalories.toLocaleString()} kcal`} />
                  <MetricTile label="Net" value={`${trackerTotals.netCalories.toLocaleString()} kcal`} />
                </View>
                <View style={styles.metricRow}>
                  <MetricTile label="Log entries" value={`${trackerTotals.foodEntryCount}`} />
                  <MetricTile label="Exercise entries" value={`${trackerTotals.exerciseEntryCount}`} />
                  <MetricTile label="Exercise minutes" value={`${trackerTotals.exerciseMinutes} min`} />
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Trend line</Text>
                <LineTrendChart
                  points={selectedSeries.points}
                  targetCalories={selectedSeries.targetCalories}
                />
              </View>

              <View style={styles.macroStack}>
                <MacroProgress
                  label="Protein"
                  consumed={selectedSeries.macroConsumed.protein}
                  target={selectedSeries.macroTargets.protein}
                  color="#0f766e"
                />
                <MacroProgress
                  label="Carbs"
                  consumed={selectedSeries.macroConsumed.carbs}
                  target={selectedSeries.macroTargets.carbs}
                  color="#ea580c"
                />
                <MacroProgress
                  label="Fat"
                  consumed={selectedSeries.macroConsumed.fat}
                  target={selectedSeries.macroTargets.fat}
                  color="#2563eb"
                />
              </View>

              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.panelEyebrow}>Weight history</Text>
                    <Text style={styles.detailTitle}>Latest weigh-ins and trend</Text>
                  </View>
                  <Text style={styles.detailSubtitle}>
                    {weightProgress.weightEntryCount} recorded weigh-ins · current{' '}
                    {weightProgress.currentWeightLbs !== null
                      ? `${weightProgress.currentWeightLbs.toLocaleString()} lb`
                      : '—'}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <MetricTile
                    label="Start"
                    value={
                      weightProgress.startWeightLbs !== null
                        ? `${weightProgress.startWeightLbs.toLocaleString()} lb`
                        : '—'
                    }
                  />
                  <MetricTile
                    label="Change"
                    value={`${weightProgress.weeklyWeightChange > 0 ? '+' : ''}${weightProgress.weeklyWeightChange} lb`}
                  />
                  <MetricTile
                    label="Current"
                    value={
                      weightProgress.currentWeightLbs !== null
                        ? `${weightProgress.currentWeightLbs.toLocaleString()} lb`
                        : '—'
                    }
                  />
                </View>

                <View style={styles.foodList}>
                  {weightEntries.slice(-3).reverse().map((entry) => (
                    <View key={entry.id} style={styles.listRow}>
                      <View>
                        <Text style={styles.listTitle}>{entry.weight_lbs.toLocaleString()} lb</Text>
                        <Text style={styles.listCaption}>{entry.recorded_at}</Text>
                      </View>
                      <Text style={styles.listMetric}>weigh-in</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

          </>
        )}

        {section === 'profile' && (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Profile</Text>
                  <Text style={styles.panelTitle}>Settings and goals</Text>
                </View>
                <Text style={styles.panelDetail}>Load your session profile, keep your display settings current, and manage goal targets in one place.</Text>
              </View>

              <View style={[styles.inlineStatus, { borderColor: toneColor(profileTone) }]}>
                <Text style={styles.inlineStatusLabel}>{profileStatus}</Text>
                {profileError ? <Text style={styles.inlineStatusDetail}>{profileError}</Text> : null}
              </View>

              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.panelEyebrow}>Progress snapshot</Text>
                    <Text style={styles.detailTitle}>Weight, goal, and adherence</Text>
                  </View>
                  <Text style={styles.detailSubtitle}>
                    Live progress is pulled from the profile, goal, and weight history APIs.
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <MetricTile
                    label="Current weight"
                    value={
                      weightProgress.currentWeightLbs !== null
                        ? `${weightProgress.currentWeightLbs.toLocaleString()} lb`
                        : '—'
                    }
                  />
                  <MetricTile
                    label="Target"
                    value={
                      weightProgress.targetWeightLbs !== null
                        ? `${weightProgress.targetWeightLbs.toLocaleString()} lb`
                        : '—'
                    }
                  />
                  <MetricTile label="Adherence" value={`${profileProgress?.adherence_score ?? 0}%`} />
                </View>
                <View style={styles.metricRow}>
                  <MetricTile
                    label="Goals"
                    value={`${profileGoals.length} saved`}
                  />
                  <MetricTile
                    label="Weights"
                    value={`${weightProgress.weightEntryCount} entries`}
                  />
                  <MetricTile
                    label="Weekly change"
                    value={`${weightProgress.weeklyWeightChange > 0 ? '+' : ''}${weightProgress.weeklyWeightChange} lb`}
                  />
                </View>
              </View>

              {profile ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{profile.display_name ?? 'Unnamed profile'}</Text>
                  <Text style={styles.detailSubtitle}>
                    {profile.email} · {profile.timezone} · {profile.units}
                  </Text>

                  <View style={styles.profileFieldStack}>
                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Display name</Text>
                      <TextInput
                        value={profileDisplayNameDraft}
                        onChangeText={setProfileDisplayNameDraft}
                        placeholder="Nutrition User"
                        placeholderTextColor="#7c8aa5"
                        style={styles.profileFieldInput}
                      />
                    </View>

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Timezone</Text>
                      <TextInput
                        value={profileTimezoneDraft}
                        onChangeText={setProfileTimezoneDraft}
                        placeholder="America/New_York"
                        placeholderTextColor="#7c8aa5"
                        style={styles.profileFieldInput}
                      />
                    </View>
                  </View>

                  <View style={styles.profileToggleRow}>
                    {(['imperial', 'metric'] as const).map((units) => {
                      const active = units === profileUnitsDraft;
                      return (
                        <Pressable
                          key={units}
                          style={[styles.profileToggle, active && styles.profileToggleActive]}
                          onPress={() => setProfileUnitsDraft(units)}
                        >
                          <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                            {units === 'imperial' ? 'Imperial' : 'Metric'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => void saveProfileSettings()}
                    disabled={profileSaving}
                  >
                    <Text style={styles.primaryButtonLabel}>
                      {profileSaving ? 'Saving...' : 'Save profile settings'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Goals</Text>
              <Text style={styles.panelTitle}>Target management</Text>
              <Text style={styles.panelDetail}>Current goals are visible below, and you can add a new target block without leaving the app.</Text>

              <View style={styles.foodList}>
                {profileGoals.length > 0 ? (
                  profileGoals.map((goal, index) => (
                    <View key={goal.id} style={styles.goalCard}>
                      <View style={styles.recipeRowTitleWrap}>
                        <Text style={styles.listTitle}>
                          Goal {profileGoals.length - index}
                        </Text>
                        <Text style={styles.listCaption}>{goal.effective_at}</Text>
                      </View>
                      <View style={styles.goalMetaRow}>
                        <Text style={styles.goalMetaChip}>{goal.calorie_goal} kcal</Text>
                        <Text style={styles.goalMetaChip}>{goal.protein_goal}P</Text>
                        <Text style={styles.goalMetaChip}>{goal.carbs_goal}C</Text>
                        <Text style={styles.goalMetaChip}>{goal.fat_goal}F</Text>
                        {goal.target_weight_lbs !== null ? (
                          <Text style={styles.goalMetaChip}>{goal.target_weight_lbs} lb</Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>No goals saved yet</Text>
                    <Text style={styles.detailSubtitle}>Create a starting target block below to populate this list.</Text>
                  </View>
                )}
              </View>

              <View style={styles.profileFieldStack}>
                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Effective date</Text>
                  <TextInput
                    value={goalEffectiveAtDraft}
                    onChangeText={setGoalEffectiveAtDraft}
                    placeholder="2026-03-30"
                    placeholderTextColor="#7c8aa5"
                    style={styles.profileFieldInput}
                  />
                </View>

                <View style={styles.profileFieldRow}>
                  <View style={styles.profileFieldHalf}>
                    <Text style={styles.profileFieldLabel}>Calories</Text>
                    <TextInput
                      value={goalCaloriesDraft}
                      onChangeText={setGoalCaloriesDraft}
                      placeholder="2100"
                      placeholderTextColor="#7c8aa5"
                      keyboardType="numeric"
                      style={styles.profileFieldInput}
                    />
                  </View>
                  <View style={styles.profileFieldHalf}>
                    <Text style={styles.profileFieldLabel}>Protein</Text>
                    <TextInput
                      value={goalProteinDraft}
                      onChangeText={setGoalProteinDraft}
                      placeholder="180"
                      placeholderTextColor="#7c8aa5"
                      keyboardType="numeric"
                      style={styles.profileFieldInput}
                    />
                  </View>
                </View>

                <View style={styles.profileFieldRow}>
                  <View style={styles.profileFieldHalf}>
                    <Text style={styles.profileFieldLabel}>Carbs</Text>
                    <TextInput
                      value={goalCarbsDraft}
                      onChangeText={setGoalCarbsDraft}
                      placeholder="190"
                      placeholderTextColor="#7c8aa5"
                      keyboardType="numeric"
                      style={styles.profileFieldInput}
                    />
                  </View>
                  <View style={styles.profileFieldHalf}>
                    <Text style={styles.profileFieldLabel}>Fat</Text>
                    <TextInput
                      value={goalFatDraft}
                      onChangeText={setGoalFatDraft}
                      placeholder="60"
                      placeholderTextColor="#7c8aa5"
                      keyboardType="numeric"
                      style={styles.profileFieldInput}
                    />
                  </View>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Target weight, lb</Text>
                  <TextInput
                    value={goalWeightDraft}
                    onChangeText={setGoalWeightDraft}
                    placeholder="178.5"
                    placeholderTextColor="#7c8aa5"
                    keyboardType="numeric"
                    style={styles.profileFieldInput}
                  />
                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void addGoal()}
                  disabled={goalSaving}
                >
                  <Text style={styles.primaryButtonLabel}>{goalSaving ? 'Saving...' : 'Add goal'}</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {section === 'tracker' && (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Tracker</Text>
                  <Text style={styles.panelTitle}>Food eaten and exercise performed</Text>
                </View>
                <Text style={styles.panelDetail}>Use one home for intake and output while backend exercise persistence is still pending.</Text>
              </View>

              <View style={[styles.inlineStatus, { borderColor: toneColor(trackerTone) }]}>
                <Text style={styles.inlineStatusLabel}>{trackerStatus}</Text>
                {trackerError ? <Text style={styles.inlineStatusDetail}>{trackerError}</Text> : null}
              </View>

              <View style={styles.metricRow}>
                <MetricTile label="Calories" value={`${foodLog.totals.calories.toLocaleString()} kcal`} />
                <MetricTile
                  label="Exercise burn"
                  value={`${exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)} kcal`}
                />
                <MetricTile
                  label="Macros"
                  value={`${round1(foodLog.totals.macros.protein)}P / ${round1(foodLog.totals.macros.carbs)}C / ${round1(foodLog.totals.macros.fat)}F`}
                />
                <MetricTile label="Tracked items" value={`${foodLog.entries.length + exerciseEntries.length}`} />
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Food eaten</Text>
              <Text style={styles.panelTitle}>Search and log an item</Text>
              <Text style={styles.panelDetail}>
                Type a food, choose a result, enter grams, and save it to today’s log.
              </Text>

              <View style={[styles.inlineStatus, { borderColor: toneColor(foodLogTone) }]}>
                <Text style={styles.inlineStatusLabel}>{foodLogStatus}</Text>
                {foodLogError ? <Text style={styles.inlineStatusDetail}>{foodLogError}</Text> : null}
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  value={logFoodDraft}
                  onChangeText={setLogFoodDraft}
                  placeholder="Search yogurt, oats, blueberries..."
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    setLogFoodSearchTerm(logFoodDraft);
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>Search</Text>
                </Pressable>
              </View>

              <View style={[styles.inlineStatus, { borderColor: toneColor(logSearchTone) }]}>
                <Text style={styles.inlineStatusLabel}>{logSearchStatus}</Text>
                {logSearchError ? <Text style={styles.inlineStatusDetail}>{logSearchError}</Text> : null}
              </View>

              <View style={styles.foodList}>
                {logFoodResults.length > 0 ? (
                  logFoodResults.map((food) => {
                    const active = food.id === selectedLogFood?.id;

                    return (
                      <Pressable
                        key={food.id}
                        style={[styles.foodRow, active && styles.foodRowActive]}
                        onPress={() => setSelectedLogFoodId(food.id)}
                      >
                        <View style={styles.foodRowCopy}>
                          <Text style={styles.listTitle}>{food.name}</Text>
                          <Text style={styles.listCaption}>
                            {(food.brand ?? 'Unbranded')} · {food.source}
                          </Text>
                        </View>
                        <Text style={styles.listMetric}>{food.calories} kcal</Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>No search results yet</Text>
                    <Text style={styles.detailSubtitle}>
                      Search for a food to load live USDA-backed matches and log one to today.
                    </Text>
                  </View>
                )}
              </View>

              {selectedLogFood ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{selectedLogFood.name}</Text>
                  <Text style={styles.detailSubtitle}>
                    {selectedLogFood.brand ?? selectedLogFood.source} · {selectedLogFood.serving_size}
                    {selectedLogFood.serving_unit} base serving
                  </Text>

                  <View style={styles.searchRow}>
                    <TextInput
                      value={logGrams}
                      onChangeText={setLogGrams}
                      placeholder="100"
                      placeholderTextColor="#7c8aa5"
                      style={styles.searchInput}
                      keyboardType="numeric"
                      autoCorrect={false}
                    />
                    <Pressable
                      style={styles.primaryButton}
                      onPress={submitFoodLogEntry}
                      disabled={isSavingLogEntry}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {isSavingLogEntry ? 'Saving...' : 'Add to today'}
                      </Text>
                    </Pressable>
                  </View>

                  {logEntryPreview ? (
                    <View style={styles.metricRow}>
                      <MetricTile label="Preview calories" value={`${logEntryPreview.calories} kcal`} compact />
                      <MetricTile
                        label="Preview macros"
                        value={`${logEntryPreview.macros.protein}P / ${logEntryPreview.macros.carbs}C / ${logEntryPreview.macros.fat}F`}
                        compact
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Exercise performed</Text>
              <Text style={styles.panelTitle}>Log activity output</Text>
              <Text style={styles.panelDetail}>
                Capture exercise locally now so the tracker reflects both food and movement in one place.
              </Text>

              <View style={styles.searchRow}>
                <TextInput
                  value={exerciseTitleDraft}
                  onChangeText={setExerciseTitleDraft}
                  placeholder="Walk, bike, lift..."
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  autoCorrect={false}
                />
                <Pressable style={styles.primaryButton} onPress={() => void addExerciseEntry()}>
                  <Text style={styles.primaryButtonLabel}>{exerciseSaving ? 'Saving...' : 'Add exercise'}</Text>
                </Pressable>
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  value={exerciseMinutesDraft}
                  onChangeText={setExerciseMinutesDraft}
                  placeholder="Minutes"
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  keyboardType="numeric"
                  autoCorrect={false}
                />
                <TextInput
                  value={exerciseCaloriesDraft}
                  onChangeText={setExerciseCaloriesDraft}
                  placeholder="Calories burned"
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  keyboardType="numeric"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricTile label="Minutes" value={`${exerciseMinutesDraft} min`} compact />
                <MetricTile label="Burn" value={`${exerciseCaloriesDraft} kcal`} compact />
              </View>

              <View style={styles.foodList}>
                {exerciseEntries.length > 0 ? (
                  exerciseEntries.map((entry) => (
                    <View key={entry.id} style={styles.foodRow}>
                      <View style={styles.foodRowCopy}>
                        <Text style={styles.listTitle}>{entry.title}</Text>
                        <Text style={styles.listCaption}>
                          {entry.duration_minutes} min · {entry.intensity} · {entry.logged_at}
                        </Text>
                      </View>
                      <Text style={styles.listMetric}>{entry.calories_burned} kcal</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>No exercise entries yet</Text>
                    <Text style={styles.detailSubtitle}>
                      Add a workout above to start tracking calories burned and movement.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Today</Text>
              <Text style={styles.panelTitle}>{foodLogLoading ? 'Loading entries' : formatLogDate(foodLog.date)}</Text>
              {foodLogLoading ? (
                <View style={styles.detailCard}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Fetching today’s persisted log...</Text>
                </View>
              ) : foodLog.entries.length === 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>No entries yet</Text>
                  <Text style={styles.detailSubtitle}>Add a searched food above to start today’s log.</Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {foodLog.entries.map((entry) => (
                    <View key={entry.id} style={styles.foodRow}>
                      <View style={styles.foodRowCopy}>
                        <Text style={styles.listTitle}>{entry.food_name}</Text>
                        <Text style={styles.listCaption}>
                          {entry.grams} g · {entry.logged_at} · {(entry.brand ?? 'Unbranded')} · {entry.source}
                        </Text>
                      </View>
                      <Text style={styles.listMetric}>{entry.calories} kcal</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {section === 'foods' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Food search</Text>
            <Text style={styles.panelTitle}>Favorite foods first</Text>
            <Text style={styles.panelDetail}>
              Start from a cached favorite-food list on app load, then narrow it as you type. When a search reaches beyond favorites, live USDA matches can be added back into favorites.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                value={foodDraft}
                onChangeText={setFoodDraft}
                placeholder="Search yogurt, oats, blueberries..."
                placeholderTextColor="#7c8aa5"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
                <Pressable style={styles.primaryButton} onPress={submitFoodSearch}>
                <Text style={styles.primaryButtonLabel}>{isSubmittingSearch ? '...' : 'Refresh'}</Text>
              </Pressable>
            </View>

            <View style={[styles.inlineStatus, { borderColor: toneColor(foodTone) }]}>
              <Text style={styles.inlineStatusLabel}>{foodStatus}</Text>
              {foodError ? <Text style={styles.inlineStatusDetail}>{foodError}</Text> : null}
            </View>

            <View style={styles.foodList}>
              {foodResults.map((food) => {
                const active = food.id === selectedFood?.id;
                const quantity = foodQuantityForId(food.id);
                const grams = calculateFoodGrams(food, quantity);
                return (
                  <Pressable
                    key={food.id}
                    style={[styles.foodRow, active && styles.foodRowActive]}
                    onPress={() => setSelectedFoodId(food.id)}
                  >
                    <View style={styles.foodCardCopy}>
                      <View style={styles.foodRowHeader}>
                        <View style={styles.foodRowCopy}>
                          <Text style={styles.listTitle}>{food.name}</Text>
                          <Text style={styles.listCaption}>
                            {(food.brand ?? 'Unbranded')} · {food.source} · {food.favorite ? 'Favorite' : 'Search match'}
                          </Text>
                        </View>
                        <Text style={styles.listMetric}>{food.calories} kcal</Text>
                      </View>

                      <View style={styles.foodCardMetaRow}>
                        <Text style={styles.foodCardChip}>{`Base ${formatFoodReference(food)}`}</Text>
                        <Text style={styles.foodCardChip}>{`Qty ${formatFoodQuantity(quantity)}`}</Text>
                      </View>

                      <View style={styles.foodCardActionsRow}>
                        <View style={styles.quantityStepper}>
                          <Pressable
                            style={styles.quantityStepperButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              adjustFoodQuantity(food.id, -0.5);
                            }}
                            disabled={quantity <= 0.5}
                          >
                            <Text style={styles.quantityStepperButtonLabel}>−</Text>
                          </Pressable>
                          <Text style={styles.quantityStepperValue}>{formatFoodQuantity(quantity)}</Text>
                          <Pressable
                            style={styles.quantityStepperButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              adjustFoodQuantity(food.id, 0.5);
                            }}
                          >
                            <Text style={styles.quantityStepperButtonLabel}>+</Text>
                          </Pressable>
                        </View>

                        <Pressable
                          style={styles.inlinePillButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            void quickAddFoodToToday(food);
                          }}
                          disabled={isSavingLogEntry}
                        >
                          <Text style={styles.inlinePillButtonLabel}>
                            {isSavingLogEntry ? 'Saving...' : `Add ${grams.toLocaleString()} g to today`}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.favoriteToggleButton,
                            food.favorite && styles.favoriteToggleButtonActive
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            void toggleFoodFavorite(food);
                          }}
                          disabled={foodFavoriteSavingId === food.id}
                        >
                          <Text
                            style={[
                              styles.favoriteToggleButtonLabel,
                              food.favorite && styles.favoriteToggleButtonLabelActive
                            ]}
                          >
                            {foodFavoriteSavingId === food.id ? '...' : food.favorite ? '♥' : '♡'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectedFood ? (
              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.detailTitle}>{selectedFood.name}</Text>
                    <Text style={styles.detailSubtitle}>
                      {selectedFood.brand ?? 'Unbranded'} · {selectedFood.source}
                    </Text>
                  </View>
                  <Text style={styles.detailSubtitle}>{selectedFood.favorite ? 'Favorite' : 'Search match'}</Text>
                </View>
                <View style={styles.metricRow}>
                  <MetricTile label="Calories" value={`${selectedFood.calories}`} compact />
                  <MetricTile label="Macros" value={foodMacroLine(selectedFood)} compact />
                </View>
                <View style={styles.foodCardMetaRow}>
                  <Text style={styles.foodCardChip}>{`Base ${formatFoodReference(selectedFood)}`}</Text>
                  <Text style={styles.foodCardChip}>{`Qty ${formatFoodQuantity(foodQuantityForId(selectedFood.id))}`}</Text>
                </View>
                <View style={styles.foodCardActionsRow}>
                  <View style={styles.quantityStepper}>
                    <Pressable
                      style={styles.quantityStepperButton}
                      onPress={() => adjustFoodQuantity(selectedFood.id, -0.5)}
                      disabled={foodQuantityForId(selectedFood.id) <= 0.5}
                    >
                      <Text style={styles.quantityStepperButtonLabel}>−</Text>
                    </Pressable>
                    <Text style={styles.quantityStepperValue}>{formatFoodQuantity(foodQuantityForId(selectedFood.id))}</Text>
                    <Pressable
                      style={styles.quantityStepperButton}
                      onPress={() => adjustFoodQuantity(selectedFood.id, 0.5)}
                    >
                      <Text style={styles.quantityStepperButtonLabel}>+</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.inlinePillButton}
                    onPress={() => void quickAddFoodToToday(selectedFood)}
                    disabled={isSavingLogEntry}
                  >
                    <Text style={styles.inlinePillButtonLabel}>
                      {isSavingLogEntry ? 'Saving...' : `Add ${calculateFoodGrams(selectedFood, foodQuantityForId(selectedFood.id)).toLocaleString()} g to today`}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.favoriteToggleButton,
                      selectedFood.favorite && styles.favoriteToggleButtonActive
                    ]}
                    onPress={() => void toggleFoodFavorite(selectedFood)}
                    disabled={foodFavoriteSavingId === selectedFood.id}
                  >
                    <Text
                      style={[
                        styles.favoriteToggleButtonLabel,
                        selectedFood.favorite && styles.favoriteToggleButtonLabelActive
                      ]}
                    >
                      {foodFavoriteSavingId === selectedFood.id ? '...' : selectedFood.favorite ? '♥' : '♡'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.detailSubtitle}>
                  {selectedFood.favorite
                    ? 'Already cached in this session’s favorite foods.'
                    : 'Tap the heart to save this search result into favorites.'}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {section === 'meal-plan' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Meal plan</Text>
            <Text style={styles.panelTitle}>Weekly date cards</Text>
            <Text style={styles.panelDetail}>
              Tap a date card to switch the visible plan, then mark planned meals as eaten for that day.
            </Text>

            <View style={[styles.inlineStatus, { borderColor: toneColor(mealPlanTone) }]}>
              <Text style={styles.inlineStatusLabel}>{mealPlanStatus}</Text>
              {mealPlanError ? <Text style={styles.inlineStatusDetail}>{mealPlanError}</Text> : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealPlanDateStrip}
            >
              {sortedMealPlanDays.map((day) => {
                const active = day.plan_date === selectedMealPlanDate;
                const isToday = day.plan_date === new Date().toISOString().slice(0, 10);

                return (
                  <Pressable
                    key={day.id}
                    style={[styles.mealPlanDateCard, active && styles.mealPlanDateCardActive]}
                    onPress={() => {
                      setSelectedMealPlanDate(day.plan_date ?? null);
                      setMealPlanTone('live');
                      setMealPlanStatus(`Showing ${formatMealPlanCardDate(day.plan_date)} plan`);
                    }}
                  >
                    <Text style={[styles.mealPlanDateWeekday, active && styles.mealPlanDateWeekdayActive]}>
                      {formatMealPlanCardWeekday(day.plan_date)}
                    </Text>
                    <Text style={[styles.mealPlanDateLabel, active && styles.mealPlanDateLabelActive]}>
                      {formatMealPlanCardDate(day.plan_date)}
                    </Text>
                    <Text style={[styles.mealPlanDateMeta, active && styles.mealPlanDateMetaActive]}>
                      {day.label}
                      {isToday ? ' · Today' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedMealPlanDay ? (
              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.detailTitle}>{selectedMealPlanDay.label}</Text>
                    <Text style={styles.detailSubtitle}>
                      {selectedMealPlanDay.focus} · {formatMealPlanCardDate(selectedMealPlanDay.plan_date)}
                    </Text>
                  </View>
                  <Text style={styles.detailSubtitle}>
                    {selectedMealPlanDay.slots.length} planned meal{selectedMealPlanDay.slots.length === 1 ? '' : 's'}
                  </Text>
                </View>

                <View style={styles.foodList}>
                  {selectedMealPlanDay.slots.map((slot) => {
                    const logged = mealPlanEatenSlots[selectedMealPlanDay.id]?.[slot.id] ?? false;

                    return (
                      <Pressable
                        key={slot.id}
                        style={[styles.listRow, logged && styles.mealPlanLoggedRow]}
                        onPress={() => toggleMealPlanMeal(selectedMealPlanDay, slot.id, slot.meal_label)}
                      >
                        <View style={styles.foodRowCopy}>
                          <Text style={styles.listTitle}>{slot.meal_label}</Text>
                          <Text style={styles.listCaption}>{slot.title}</Text>
                        </View>
                        <View style={styles.foodRowActions}>
                          <View style={[styles.mealPlanCheck, logged && styles.mealPlanCheckActive]}>
                            <Text style={[styles.mealPlanCheckLabel, logged && styles.mealPlanCheckLabelActive]}>
                              {logged ? '☑' : '☐'}
                            </Text>
                          </View>
                          <Text style={styles.listMetric}>{slot.calories} kcal</Text>
                          <Text style={styles.listCaption}>{slot.prep_status}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>No meal plan saved yet</Text>
                <Text style={styles.detailSubtitle}>Save a weekly plan to populate the date cards here.</Text>
              </View>
            )}
          </View>
        )}

        {section === 'meal-prep' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Meal prep</Text>
            <Text style={styles.panelTitle}>Prep the week in batches</Text>
            <Text style={styles.panelDetail}>
              Track what to cook, portion, and assemble so the meal plan is realistic.
            </Text>

            <View style={[styles.inlineStatus, { borderColor: toneColor(mealPrepTone) }]}>
              <Text style={styles.inlineStatusLabel}>{mealPrepStatus}</Text>
              {mealPrepError ? <Text style={styles.inlineStatusDetail}>{mealPrepError}</Text> : null}
            </View>

            <View style={styles.foodList}>
              {mealPrepTasks.map((task) => (
                <Pressable
                  key={task.id}
                  style={styles.foodRow}
                  onPress={() => void cycleMealPrepStatus(task.id)}
                  disabled={mealPrepSavingId === task.id}
                >
                  <View style={styles.foodRowCopy}>
                    <Text style={styles.listTitle}>{task.title}</Text>
                    <Text style={styles.listCaption}>
                      {task.category} · {task.portions}
                    </Text>
                  </View>
                  <View style={styles.foodRowActions}>
                    <Text style={styles.listMetric}>{mealPrepSavingId === task.id ? 'Saving...' : task.status}</Text>
                    <Text style={styles.listCaption}>Tap to cycle</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {section === 'meals' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Meal builder</Text>
            <Text style={styles.panelTitle}>{demoMeal.name}</Text>
            <Text style={styles.panelDetail}>Scale the ingredient weights and serving count like you would on mobile.</Text>

            <View style={styles.dropdownWrap}>
              <Text style={styles.dropdownLabel}>Recipe scale</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setShowScaleOptions((current) => !current)}
              >
                <Text style={styles.dropdownValue}>{recipeScaleLabel(recipeScale)}</Text>
                <Text style={styles.dropdownCaret}>{showScaleOptions ? '▲' : '▼'}</Text>
              </Pressable>
              {showScaleOptions ? (
                <View style={styles.dropdownMenu}>
                  {recipeScales.map((scale) => {
                    const active = scale === recipeScale;
                    return (
                      <Pressable
                        key={scale}
                        style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                        onPress={() => {
                          setRecipeScale(scale);
                          setShowScaleOptions(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionLabel, active && styles.dropdownOptionLabelActive]}>
                          {recipeScaleLabel(scale)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {mealPreview.ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.listRow}>
                <View>
                  <Text style={styles.listTitle}>{ingredient.name}</Text>
                  <Text style={styles.listCaption}>{ingredient.grams} g</Text>
                </View>
                <Text style={styles.listMetric}>
                  {Math.round((ingredient.calories_per_100g * ingredient.grams) / 100)} kcal
                </Text>
              </View>
            ))}

            <View style={styles.metricRow}>
              <MetricTile label="Meal calories" value={`${recipeTotals.calories} kcal`} />
              <MetricTile label="Per serving" value={`${recipeTotals.per_serving_calories} kcal`} />
            </View>
          </View>
        )}

        {section === 'recipes' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Recipes</Text>
            <Text style={styles.panelTitle}>Saved recipe favorites and import review</Text>
            <Text style={styles.panelDetail}>
              Your starred recipes load first, and the latest imported recipe is surfaced as a reviewable detail.
            </Text>

            <View style={[styles.inlineStatus, { borderColor: toneColor(recipeTone) }]}>
              <Text style={styles.inlineStatusLabel}>{recipeStatus}</Text>
              {recipeError ? <Text style={styles.inlineStatusDetail}>{recipeError}</Text> : null}
            </View>

            <View style={[styles.inlineStatus, { borderColor: toneColor(recipeImportTone) }]}>
              <Text style={styles.inlineStatusLabel}>{recipeImportStatus}</Text>
              {recipeImportError ? <Text style={styles.inlineStatusDetail}>{recipeImportError}</Text> : null}
            </View>

            <View style={styles.recipeImportCard}>
              <Text style={styles.recipeMetaLabel}>Import review</Text>
              {recipeImportLoading ? (
                <View style={styles.recipeDetailLoading}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Waiting for the imported recipe result...</Text>
                </View>
              ) : recipeImportResult ? (
                <>
                  <View style={styles.recipeDetailHeader}>
                    <View style={styles.recipeDetailHeaderCopy}>
                      <Text style={styles.detailTitle}>{recipeImportResult.title}</Text>
                      <Text style={styles.detailSubtitle}>
                        Imported recipe {recipeImportResult.favorite ? 'saved' : 'not yet starred'} ·{' '}
                        {importedRecipeSelected ? 'selected for review' : 'tap below to review'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.recipeStarToggle}
                      onPress={() => setSelectedRecipeId(recipeImportResult.id)}
                    >
                      <Text style={styles.recipeStarToggleLabel}>Review</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.recipeMetaItem}>
                    Result id: {recipeImportResult.id} · Favorite state: {recipeImportResult.favorite ? 'saved' : 'draft'}
                  </Text>
                </>
              ) : (
                <Text style={styles.detailSubtitle}>No recipe import result is available yet.</Text>
              )}
            </View>

            <View style={styles.recipeSection}>
              {recipeLoading ? (
                <View style={styles.detailCard}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Fetching saved recipe favorites...</Text>
                </View>
              ) : recipeFavorites.length === 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>No saved favorites yet</Text>
                  <Text style={styles.detailSubtitle}>
                    Save a recipe from the detail card once it appears, or import a new one below.
                  </Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {recipeFavorites.map((recipe) => {
                    const active = recipe.id === selectedRecipe?.id;
                    const saving = recipeSavingId === recipe.id;

                    return (
                      <Pressable
                        key={recipe.id}
                        style={[styles.foodRow, active && styles.foodRowActive]}
                        onPress={() => setSelectedRecipeId(recipe.id)}
                      >
                        <View style={styles.foodRowCopy}>
                          <View style={styles.recipeRowTitleWrap}>
                            <Text style={styles.listTitle}>{recipe.title}</Text>
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                void toggleRecipeFavorite(recipe, false);
                              }}
                              style={styles.recipeStarButton}
                              disabled={saving}
                            >
                              <Text style={styles.recipeStarButtonLabel}>{saving ? 'Saving...' : '★'}</Text>
                            </Pressable>
                          </View>
                          <Text style={styles.listCaption}>
                            {recipe.steps.length} steps · {recipe.ingredients.length} ingredients · {recipe.assets.length} assets
                          </Text>
                        </View>
                        <Text style={styles.listMetric}>{recipe.default_yield} servings</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.detailCard}>
              {recipeDetailLoading && selectedRecipe ? (
                <View style={styles.recipeDetailLoading}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Loading recipe detail...</Text>
                </View>
              ) : selectedRecipe ? (
                <>
                  <View style={styles.recipeDetailHeader}>
                    <View style={styles.recipeDetailHeaderCopy}>
                      <View style={styles.recipeRowTitleWrap}>
                        <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                        {importedRecipeSelected ? (
                          <View style={styles.recipeReviewBadge}>
                            <Text style={styles.recipeReviewBadgeLabel}>Imported review</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.detailSubtitle}>
                        {selectedRecipe.steps.length} steps · {selectedRecipe.ingredients.length} ingredients ·{' '}
                        {selectedRecipe.assets.length} assets · {selectedRecipe.default_yield} servings
                        {importedRecipeSelected ? ' · selected import' : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void toggleRecipeFavorite(selectedRecipe, !selectedRecipe.favorite)}
                      style={[
                        styles.recipeStarToggle,
                        selectedRecipe.favorite ? styles.recipeStarToggleActive : styles.recipeStarToggleInactive
                      ]}
                      disabled={recipeSavingId === selectedRecipe.id}
                    >
                      <Text
                        style={[
                          styles.recipeStarToggleLabel,
                          selectedRecipe.favorite && styles.recipeStarToggleLabelActive
                        ]}
                      >
                        {recipeSavingId === selectedRecipe.id
                          ? 'Saving...'
                          : selectedRecipe.favorite
                          ? 'Unfavorite'
                          : 'Favorite'}
                      </Text>
                    </Pressable>
                  </View>

                  {selectedRecipe.steps.length > 0 ? (
                    <View style={styles.recipeMetaBlock}>
                      <Text style={styles.recipeMetaLabel}>Steps</Text>
                      {selectedRecipe.steps.slice(0, 3).map((step, index) => (
                        <Text key={`${selectedRecipe.id}-step-${index}`} style={styles.recipeStep}>
                          {index + 1}. {step}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {selectedRecipe.ingredients.length > 0 ? (
                    <View style={styles.recipeMetaBlock}>
                      <Text style={styles.recipeMetaLabel}>Ingredients</Text>
                      {selectedRecipe.ingredients.slice(0, 3).map((ingredient) => (
                        <Text key={ingredient.id} style={styles.recipeMetaItem}>
                          {ingredient.name} · {ingredient.grams} g
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.recipeMetaBlock}>
                    <Text style={styles.recipeMetaLabel}>Assets</Text>
                    {selectedRecipe.assets.length === 0 ? (
                      <Text style={styles.recipeMetaItem}>No imported assets attached yet.</Text>
                    ) : (
                      selectedRecipe.assets.slice(0, 3).map((asset, index) => (
                        <Text key={`${selectedRecipe.id}-asset-${index}`} style={styles.recipeMetaItem}>
                          {asset.kind.toUpperCase()} asset {asset.url ? 'linked' : 'embedded'}
                        </Text>
                      ))
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.recipeDetailLoading}>
                  <Text style={styles.detailTitle}>Select a recipe</Text>
                  <Text style={styles.detailSubtitle}>
                    The selected recipe detail will appear here, including its steps, ingredients, and favorite toggle.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.recipeSecondaryCard}>
              <Text style={styles.panelEyebrow}>Import and scale</Text>
              <Text style={styles.panelDetail}>
                Text, PDF, and image ingestion stay in the secondary flow while favorites remain primary.
              </Text>
              {demoRecipeImports.sources.map((source) => (
                <View key={source.kind} style={styles.listRow}>
                  <View>
                    <Text style={styles.listTitle}>{source.label}</Text>
                    <Text style={styles.listCaption}>{source.kind.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.listMetric}>Ready</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {section === 'ingestion' && <IngestionReviewPanel accessToken={foodSessionToken} />}

        {Platform.OS === 'web' ? (
          <Text style={styles.footer}>
            Browser preview runs with Expo web. For iPhone preview, run `npm start` in `frontend/` and scan the QR code with Expo Go.
          </Text>
        ) : (
          <Text style={styles.footer}>
            Running inside Expo. Use the same backend and switch devices without changing the frontend architecture.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricTile({
  label,
  value,
  compact = false
}: {
  label: string;
  value: string;
  compact?: boolean;
}): ReactElement {
  return (
    <View style={[styles.metricTile, compact && styles.metricTileCompact]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MacroProgress({
  label,
  consumed,
  target,
  color
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}): ReactElement {
  const width = `${progressPercent(consumed, target)}%` as DimensionValue;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabels}>
        <Text style={styles.listTitle}>{label}</Text>
        <Text style={styles.listCaption}>
          {Math.round(consumed)} / {Math.round(target)} g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function formatLogDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function createEmptyFoodLog(date = new Date().toISOString().slice(0, 10)): FoodLogSummary {
  return {
    date,
    entries: [],
    totals: {
      calories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 }
    }
  };
}

function LineTrendChart({
  points,
  targetCalories
}: {
  points: { label: string; calories: number }[];
  targetCalories: number;
}): ReactElement {
  const [frameWidth, setFrameWidth] = useState(0);
  const geometry = useMemo(
    () => (frameWidth > 0 ? buildTrendChartGeometry(points, targetCalories, frameWidth, chartHeight) : null),
    [frameWidth, points, targetCalories]
  );

  return (
    <View>
      <View
        style={styles.lineChartFrame}
        onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
      >
        {geometry ? (
          <>
            <View style={[styles.targetGuide, { top: geometry.targetY }]} />
            {geometry.segments.map((segment) => (
              <View
                key={segment.key}
                style={[
                  styles.lineSegment,
                  {
                    left: segment.centerX - segment.width / 2,
                    top: segment.centerY - 1.5,
                    width: segment.width,
                    transform: [{ rotate: `${segment.angle}deg` }]
                  }
                ]}
              />
            ))}
            {geometry.nodes.map((point) => (
              <View
                key={point.label}
                style={[
                  styles.lineNode,
                  {
                    left: point.x - 5,
                    top: point.y - 5
                  }
                ]}
              />
            ))}
          </>
        ) : (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="small" color="#17324d" />
          </View>
        )}
      </View>
      <View style={styles.lineChartLabels}>
        {points.map((point) => (
          <View key={point.label} style={styles.lineChartLabelItem}>
            <Text style={styles.chartValue}>{point.calories}</Text>
            <Text style={styles.chartLabel}>{point.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.chartTargetCaption}>Target guide: {targetCalories.toLocaleString()} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4efe4'
  },
  screen: {
    flex: 1,
    backgroundColor: '#f4efe4'
  },
  content: {
    padding: 16,
    gap: 16
  },
  hero: {
    backgroundColor: '#17324d',
    borderRadius: 28,
    padding: 20,
    gap: 16
  },
  eyebrow: {
    color: '#d8e1ed',
    letterSpacing: 1.5,
    fontSize: 12,
    fontWeight: '700'
  },
  heroHeader: {
    gap: 16
  },
  heroAside: {
    gap: 14,
    alignItems: 'stretch'
  },
  heroCopy: {
    gap: 10
  },
  headline: {
    color: '#f8fafc',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800'
  },
  lede: {
    color: '#d6e0ea',
    fontSize: 15,
    lineHeight: 22
  },
  ringCard: {
    alignSelf: 'flex-start',
    backgroundColor: '#f6f0e7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 132
  },
  ringValue: {
    color: '#17324d',
    fontSize: 30,
    fontWeight: '800'
  },
  ringLabel: {
    color: '#17324d',
    fontWeight: '700',
    marginTop: 4
  },
  ringCaption: {
    color: '#5c6d80',
    marginTop: 4,
    fontSize: 12
  },
  mascotCard: {
    backgroundColor: '#f6f0e7',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    gap: 10
  },
  mascotImage: {
    width: '100%',
    maxWidth: 220,
    height: 220
  },
  mascotLabel: {
    color: '#17324d',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  statusBanner: {
    backgroundColor: '#fffaf0',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    gap: 4
  },
  statusLabel: {
    color: '#132536',
    fontWeight: '700',
    fontSize: 15
  },
  statusDetail: {
    color: '#5c6d80',
    fontSize: 13,
    lineHeight: 18
  },
  sectionTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  sectionTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ced7e3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  sectionTabActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  sectionTabLabel: {
    color: '#17324d',
    fontSize: 12,
    fontWeight: '700'
  },
  sectionTabLabelActive: {
    color: '#ffffff'
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 14
  },
  panelHeader: {
    gap: 6
  },
  panelEyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  panelTitle: {
    color: '#132536',
    fontSize: 22,
    fontWeight: '800'
  },
  panelDetail: {
    color: '#66778c',
    fontSize: 13,
    lineHeight: 18
  },
  rangeTabs: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  rangeTab: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#edf1f5'
  },
  rangeTabActive: {
    backgroundColor: '#17324d'
  },
  rangeTabLabel: {
    color: '#17324d',
    fontWeight: '700'
  },
  rangeTabLabelActive: {
    color: '#ffffff'
  },
  mealPlanDateStrip: {
    flexDirection: 'row',
    gap: 10
  },
  mealPlanDateCard: {
    minWidth: 96,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f3f6fb',
    borderWidth: 1,
    borderColor: '#dbe3ec',
    gap: 4
  },
  mealPlanDateCardActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  mealPlanDateWeekday: {
    color: '#6b7b90',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  mealPlanDateWeekdayActive: {
    color: '#dbe7f2'
  },
  mealPlanDateLabel: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800'
  },
  mealPlanDateLabelActive: {
    color: '#ffffff'
  },
  mealPlanDateMeta: {
    color: '#66778c',
    fontSize: 12
  },
  mealPlanDateMetaActive: {
    color: '#dbe7f2'
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  metricTile: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: '#f7f4ef',
    borderRadius: 18,
    padding: 14,
    gap: 6
  },
  metricTileCompact: {
    minWidth: 140
  },
  metricLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: '#17324d',
    fontWeight: '800',
    fontSize: 18
  },
  chartCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    padding: 16
  },
  chartTitle: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10
  },
  lineChartFrame: {
    height: chartHeight,
    borderRadius: 18,
    backgroundColor: '#eef3f8',
    paddingHorizontal: 16,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden'
  },
  chartLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  targetGuide: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    borderStyle: 'dashed'
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#0f766e',
    borderRadius: 999,
    opacity: 0.9
  },
  lineNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#17324d',
    borderWidth: 2,
    borderColor: '#f8fafc'
  },
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12
  },
  lineChartLabelItem: {
    flex: 1,
    alignItems: 'center'
  },
  chartValue: {
    color: '#17324d',
    fontSize: 11,
    fontWeight: '700'
  },
  chartLabel: {
    color: '#66778c',
    fontSize: 12
  },
  chartTargetCaption: {
    color: '#66778c',
    marginTop: 10,
    fontSize: 12
  },
  macroStack: {
    gap: 12
  },
  quickLogCard: {
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    padding: 14,
    gap: 4
  },
  quickLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start'
  },
  quickLogTitle: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800'
  },
  quickLogHint: {
    color: '#7c8aa5',
    fontSize: 11,
    maxWidth: 120,
    textAlign: 'right'
  },
  macroRow: {
    gap: 8
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  macroTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden'
  },
  macroFill: {
    height: '100%',
    borderRadius: 999
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5'
  },
  listTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '700'
  },
  listCaption: {
    color: '#7c8aa5',
    fontSize: 12
  },
  listMetric: {
    color: '#17324d',
    fontWeight: '700'
  },
  searchRow: {
    gap: 10
  },
  dropdownWrap: {
    gap: 8
  },
  dropdownLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  dropdownTrigger: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownValue: {
    color: '#17324d',
    fontWeight: '800',
    fontSize: 16
  },
  dropdownCaret: {
    color: '#66778c',
    fontSize: 12
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    overflow: 'hidden'
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5'
  },
  dropdownOptionActive: {
    backgroundColor: '#17324d'
  },
  dropdownOptionLabel: {
    color: '#17324d',
    fontWeight: '700'
  },
  dropdownOptionLabelActive: {
    color: '#ffffff'
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: '#132536'
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: '#17324d',
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '800'
  },
  inlineStatus: {
    backgroundColor: '#fffaf0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4
  },
  inlineStatusLabel: {
    color: '#132536',
    fontWeight: '700'
  },
  inlineStatusDetail: {
    color: '#8a5a1d',
    fontSize: 12
  },
  foodList: {
    gap: 8
  },
  foodRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  foodCardCopy: {
    flex: 1,
    gap: 10
  },
  foodRowActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  mealPlanLoggedRow: {
    borderColor: '#0f766e',
    backgroundColor: '#effaf7'
  },
  foodRowCopy: {
    flex: 1,
    gap: 2
  },
  foodRowActions: {
    alignItems: 'flex-end',
    gap: 8
  },
  foodRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start'
  },
  foodCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  foodCardChip: {
    backgroundColor: '#edf1f5',
    color: '#17324d',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700'
  },
  foodCardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  quantityStepperButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc'
  },
  quantityStepperButtonLabel: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800'
  },
  quantityStepperValue: {
    minWidth: 56,
    paddingHorizontal: 10,
    textAlign: 'center',
    color: '#17324d',
    fontWeight: '800'
  },
  mealPlanCheck: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  mealPlanCheckActive: {
    borderColor: '#0f766e',
    backgroundColor: '#0f766e'
  },
  mealPlanCheckLabel: {
    color: '#6b7b90',
    fontSize: 16,
    fontWeight: '800'
  },
  mealPlanCheckLabelActive: {
    color: '#ffffff'
  },
  inlinePillButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#17324d',
    backgroundColor: '#eef3f8',
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  inlinePillButtonLabel: {
    color: '#17324d',
    fontSize: 12,
    fontWeight: '800'
  },
  favoriteToggleButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fff8ea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  favoriteToggleButtonActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  favoriteToggleButtonLabel: {
    color: '#b45309',
    fontSize: 16,
    fontWeight: '800'
  },
  favoriteToggleButtonLabelActive: {
    color: '#ffffff'
  },
  recipeSection: {
    gap: 12
  },
  recipeRowTitleWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  recipeStarButton: {
    borderRadius: 999,
    backgroundColor: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  recipeStarButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  detailCard: {
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  profileFieldStack: {
    gap: 12
  },
  profileFieldRow: {
    flexDirection: 'row',
    gap: 10
  },
  profileFieldHalf: {
    flex: 1,
    gap: 6
  },
  profileField: {
    gap: 6
  },
  profileFieldLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  profileFieldInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: '#132536'
  },
  profileToggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  profileToggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  profileToggleActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  profileToggleLabel: {
    color: '#17324d',
    fontWeight: '700'
  },
  profileToggleLabelActive: {
    color: '#ffffff'
  },
  goalCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    padding: 14,
    gap: 10
  },
  goalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  goalMetaChip: {
    borderRadius: 999,
    backgroundColor: '#eef3f8',
    color: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700'
  },
  recipeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  recipeDetailHeaderCopy: {
    flex: 1,
    gap: 4
  },
  recipeStarToggle: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  recipeStarToggleActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  recipeStarToggleInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1'
  },
  recipeStarToggleLabel: {
    color: '#17324d',
    fontWeight: '800'
  },
  recipeStarToggleLabelActive: {
    color: '#ffffff'
  },
  recipeMetaBlock: {
    gap: 6,
    paddingTop: 4
  },
  recipeMetaLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  recipeStep: {
    color: '#132536',
    fontSize: 13,
    lineHeight: 18
  },
  recipeMetaItem: {
    color: '#132536',
    fontSize: 13,
    lineHeight: 18
  },
  recipeDetailLoading: {
    gap: 8
  },
  recipeImportCard: {
    backgroundColor: '#f3efe8',
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  recipeReviewBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  recipeReviewBadgeLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  recipeSecondaryCard: {
    backgroundColor: '#f2f6fb',
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  detailTitle: {
    color: '#132536',
    fontSize: 20,
    fontWeight: '800'
  },
  detailSubtitle: {
    color: '#66778c'
  },
  footer: {
    color: '#66778c',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 16
  }
});
