import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
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
  createLocalSession,
  createWeightEntry,
  completeOnboarding,
  createUserGoal,
  fetchBackendHealth,
  getApiBaseUrl,
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
  searchFoodsWithSession,
  unfavoriteFood,
  updateProfile,
  updateMealPrepTaskStatus,
  unfavoriteRecipe,
  searchFoods
} from './src/lib/api';
import { buildTrendChartGeometry, remainingCalories, selectRangeSeries } from './src/lib/dashboard';
import { DashboardHeaderMetrics } from './src/components/dashboard/DashboardHeaderMetrics';
import { DashboardTimeRangeTabs } from './src/components/dashboard/DashboardTimeRangeTabs';
import { DashboardHeroChart } from './src/components/dashboard/DashboardHeroChart';
import { DashboardSecondaryMetrics } from './src/components/dashboard/DashboardSecondaryMetrics';
import {
  formatMealPlanCardDate,
  formatMealPlanCardWeekday,
  resolveSelectedMealPlanDate,
  selectMealPlanDay,
  sortMealPlanDaysByDate
} from './src/lib/meal-plan';
import { buildTrackerTotals, buildWeightProgressSummary } from './src/lib/progress';
import { filterRecipesFuzzy, sortRecipesAlphabetically } from './src/lib/recipes';
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
import type {
  AppSection,
  DashboardRange,
  DashboardSnapshot,
  DashboardMetricKey,
  DashboardRangeSeries,
  ExerciseEntry,
  FoodItem,
  FoodLogSummary,
  MealInput,
  MealTotals,
  MealPlanDay,
  MealPrepTask,
  ProfileProgress,
  RecipeDefinition,
  UserGoal,
  UserProfile,
  WeeklyMetrics,
  WeightEntry
} from './src/types';
import {
  demoDashboardSnapshot,
  demoExerciseEntries,
  demoFoodLog,
  demoProfileProgress,
  demoWeightEntries
} from './src/mock-data';

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
const scaleStops = [0.5, 1, 1.25, 1.5, 2] as const;
type ScaleStop = (typeof scaleStops)[number];
type EntryMode = 'live' | 'preview';
const chartHeight = 160;

function toneColor(tone: 'checking' | 'live'): string {
  if (tone === 'live') {
    return '#0f766e';
  }
  return '#1d4ed8';
}

function formatGoalTypeLabel(goalType: 'lose' | 'maintain' | 'gain' | null | undefined): string {
  if (goalType === 'lose') {
    return 'Weight Loss';
  }
  if (goalType === 'gain') {
    return 'Weight Gain';
  }
  if (goalType === 'maintain') {
    return 'Maintenance';
  }
  return '—';
}

function splitHeightCm(heightCm: number | null | undefined): { feet: string; inches: string } {
  if (heightCm === null || heightCm === undefined || !Number.isFinite(heightCm) || heightCm <= 0) {
    return { feet: '5', inches: '10' };
  }

  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);

  if (inches === 12) {
    return { feet: String(feet + 1), inches: '0' };
  }

  return { feet: String(feet), inches: String(inches) };
}

function createEmptyWeeklyMetrics(): WeeklyMetrics {
  return {
    calorie_goal: 0,
    calories_consumed: 0,
    macro_targets: { protein: 0, carbs: 0, fat: 0 },
    macro_consumed: { protein: 0, carbs: 0, fat: 0 },
    weekly_weight_change: 0,
    adherence_score: 0
  };
}

function createEmptyMealTotals(): MealTotals {
  return {
    calories: 0,
    macros: { protein: 0, carbs: 0, fat: 0 },
    per_serving_calories: 0,
    per_serving_macros: { protein: 0, carbs: 0, fat: 0 }
  };
}

function createEmptyDashboardRangeSeries(range: DashboardRange): DashboardRangeSeries {
  return {
    range,
    label: range,
    detail: 'Live summary is loading',
    targetCalories: 0,
    caloriesConsumed: 0,
    macroTargets: { protein: 0, carbs: 0, fat: 0 },
    macroConsumed: { protein: 0, carbs: 0, fat: 0 },
    points: [
      { label: 'Start', calories: 0 },
      { label: 'Mid', calories: 0 },
      { label: 'Late', calories: 0 },
      { label: 'Now', calories: 0 }
    ]
  };
}

function createEmptyDashboardSnapshot(): DashboardSnapshot {
  return {
    connectionLabel: 'Loading live summary',
    connectionDetail: 'Waiting for backend metrics.',
    weeklyMetrics: createEmptyWeeklyMetrics(),
    mealTotals: createEmptyMealTotals(),
    rangeSeries: rangeTabs.map((range) => createEmptyDashboardRangeSeries(range))
  };
}

function createEmptyMealDraft(): MealInput {
  return {
    id: 'meal-draft',
    name: 'Untitled meal',
    serving_count: 1,
    ingredients: []
  };
}

export default function App(): ReactElement {
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [entryEmailDraft, setEntryEmailDraft] = useState('dev@example.com');
  const [entryDisplayNameDraft, setEntryDisplayNameDraft] = useState('Local Dev User');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryBackendTone, setEntryBackendTone] = useState<'checking' | 'live'>('checking');
  const [entryBackendStatus, setEntryBackendStatus] = useState('Checking backend reachability');
  const [entryBackendDetail, setEntryBackendDetail] = useState(`Using ${getApiBaseUrl()}`);
  const [section, setSection] = useState<AppSection>('dashboard');
  const [activeRange, setActiveRange] = useState<DashboardRange>('1D');
  const [activeDashboardMetric, setActiveDashboardMetric] = useState<DashboardMetricKey>('net_calories');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(() => createEmptyDashboardSnapshot());
  const [syncTone, setSyncTone] = useState<'checking' | 'live'>('checking');
  const [syncLabel, setSyncLabel] = useState('Loading live summary');
  const [syncDetail, setSyncDetail] = useState('Waiting for live backend data.');
  const [mealScale, setMealScale] = useState<ScaleStop>(1);
  const [recipeScale, setRecipeScale] = useState<ScaleStop>(1);
  const [mealDraft, setMealDraft] = useState<MealInput>(() => createEmptyMealDraft());
  const [foodDraft, setFoodDraft] = useState('');
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [foodSessionToken, setFoodSessionToken] = useState<string | null>(null);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [foodQuantities, setFoodQuantities] = useState<Record<string, number>>({});
  const [foodTone, setFoodTone] = useState<'checking' | 'live'>('checking');
  const [foodStatus, setFoodStatus] = useState('Loading favorite foods');
  const [foodError, setFoodError] = useState<string | null>(null);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [foodFavoriteSavingId, setFoodFavoriteSavingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileGoals, setProfileGoals] = useState<UserGoal[]>([]);
  const [profileTone, setProfileTone] = useState<'checking' | 'live'>('checking');
  const [profileStatus, setProfileStatus] = useState('Loading profile settings');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [profileProgress, setProfileProgress] = useState<ProfileProgress | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightRecordedAtDraft, setWeightRecordedAtDraft] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightValueDraft, setWeightValueDraft] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
  const [profileDisplayNameDraft, setProfileDisplayNameDraft] = useState('');
  const [profileTimezoneDraft, setProfileTimezoneDraft] = useState('UTC');
  const [profileUnitsDraft, setProfileUnitsDraft] = useState<'imperial' | 'metric'>('imperial');
  const [goalEffectiveAtDraft, setGoalEffectiveAtDraft] = useState(() => new Date().toISOString().slice(0, 10));
  const [goalCaloriesDraft, setGoalCaloriesDraft] = useState('2100');
  const [goalProteinDraft, setGoalProteinDraft] = useState('180');
  const [goalCarbsDraft, setGoalCarbsDraft] = useState('190');
  const [goalFatDraft, setGoalFatDraft] = useState('60');
  const [goalWeightDraft, setGoalWeightDraft] = useState('178.5');
  const [onboardingSexDraft, setOnboardingSexDraft] = useState<'male' | 'female'>('female');
  const [onboardingAgeDraft, setOnboardingAgeDraft] = useState('34');
  const [onboardingHeightFeetDraft, setOnboardingHeightFeetDraft] = useState('5');
  const [onboardingHeightInchesDraft, setOnboardingHeightInchesDraft] = useState('10');
  const [onboardingCurrentWeightDraft, setOnboardingCurrentWeightDraft] = useState('180');
  const [onboardingGoalTypeDraft, setOnboardingGoalTypeDraft] = useState<'lose' | 'maintain' | 'gain'>('lose');
  const [onboardingTargetWeightDraft, setOnboardingTargetWeightDraft] = useState('170');
  const [onboardingActivityLevelDraft, setOnboardingActivityLevelDraft] = useState<
    'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'
  >('moderate');
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState('Loading first-run setup');
  const [logFoodDraft, setLogFoodDraft] = useState('chicken');
  const [logFoodSearchTerm, setLogFoodSearchTerm] = useState('chicken');
  const [logFoodResults, setLogFoodResults] = useState<FoodItem[]>([]);
  const [selectedLogFoodId, setSelectedLogFoodId] = useState('');
  const [logGrams, setLogGrams] = useState('100');
  const [foodLog, setFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog());
  const [foodLogTone, setFoodLogTone] = useState<'checking' | 'live'>('checking');
  const [foodLogStatus, setFoodLogStatus] = useState("Loading today's log");
  const [foodLogError, setFoodLogError] = useState<string | null>(null);
  const [foodLogLoading, setFoodLogLoading] = useState(true);
  const [isSavingLogEntry, setIsSavingLogEntry] = useState(false);
  const [logSearchTone, setLogSearchTone] = useState<'checking' | 'live'>('checking');
  const [logSearchStatus, setLogSearchStatus] = useState('Ready to search');
  const [logSearchError, setLogSearchError] = useState<string | null>(null);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [exerciseTitleDraft, setExerciseTitleDraft] = useState('Bike ride');
  const [exerciseMinutesDraft, setExerciseMinutesDraft] = useState('30');
  const [exerciseCaloriesDraft, setExerciseCaloriesDraft] = useState('220');
  const [trackerTone, setTrackerTone] = useState<'checking' | 'live'>('checking');
  const [trackerStatus, setTrackerStatus] = useState('Loading tracker data');
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [recipeFavorites, setRecipeFavorites] = useState<RecipeDefinition[]>([]);
  const [recipeCatalog, setRecipeCatalog] = useState<RecipeDefinition[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDefinition | null>(null);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [recipeTone, setRecipeTone] = useState<'checking' | 'live'>('checking');
  const [recipeStatus, setRecipeStatus] = useState('Loading recipe favorites');
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(true);
  const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);
  const [recipeSavingId, setRecipeSavingId] = useState<string | null>(null);
  const [recipeImportTone, setRecipeImportTone] = useState<'checking' | 'live'>('checking');
  const [recipeImportStatus, setRecipeImportStatus] = useState('No imported recipe selected');
  const [recipeImportError, setRecipeImportError] = useState<string | null>(null);
  const [mealPlanDays, setMealPlanDays] = useState<MealPlanDay[]>([]);
  const [selectedMealPlanDate, setSelectedMealPlanDate] = useState<string | null>(null);
  const [mealPlanEatenSlots, setMealPlanEatenSlots] = useState<Record<string, Record<string, boolean>>>({});
  const [mealPlanTone, setMealPlanTone] = useState<'checking' | 'live'>('checking');
  const [mealPlanStatus, setMealPlanStatus] = useState('Loading meal plan');
  const [mealPlanError, setMealPlanError] = useState<string | null>(null);
  const [mealPrepTasks, setMealPrepTasks] = useState<MealPrepTask[]>([]);
  const [mealPrepTone, setMealPrepTone] = useState<'checking' | 'live'>('checking');
  const [mealPrepStatus, setMealPrepStatus] = useState('Loading meal prep');
  const [mealPrepError, setMealPrepError] = useState<string | null>(null);
  const [exerciseSaving, setExerciseSaving] = useState(false);
  const [mealPrepSavingId, setMealPrepSavingId] = useState<string | null>(null);

  function resetPreviewProfileDrafts() {
    setProfileDisplayNameDraft('');
    setProfileTimezoneDraft('UTC');
    setProfileUnitsDraft('imperial');
    setOnboardingSexDraft('female');
    setOnboardingAgeDraft('34');
    setOnboardingHeightFeetDraft('5');
    setOnboardingHeightInchesDraft('10');
    setOnboardingCurrentWeightDraft('180');
    setOnboardingGoalTypeDraft('lose');
    setOnboardingTargetWeightDraft('170');
    setOnboardingActivityLevelDraft('moderate');
  }

  function applyProfileDrafts(loadedProfile: UserProfile, goals: UserGoal[] = []) {
    const { feet, inches } = splitHeightCm(loadedProfile.height_cm);
    setProfileDisplayNameDraft(loadedProfile.display_name ?? '');
    setProfileTimezoneDraft(loadedProfile.timezone);
    setProfileUnitsDraft(loadedProfile.units);
    setOnboardingSexDraft(loadedProfile.sex ?? 'female');
    setOnboardingAgeDraft(
      loadedProfile.age_years !== null && loadedProfile.age_years !== undefined
        ? String(loadedProfile.age_years)
        : '34'
    );
    setOnboardingHeightFeetDraft(feet);
    setOnboardingHeightInchesDraft(inches);
    setOnboardingCurrentWeightDraft(
      loadedProfile.current_weight_lbs !== null && loadedProfile.current_weight_lbs !== undefined
        ? String(loadedProfile.current_weight_lbs)
        : '180'
    );
    setOnboardingGoalTypeDraft(loadedProfile.goal_type ?? 'lose');
    setOnboardingTargetWeightDraft(
      loadedProfile.target_weight_lbs !== null && loadedProfile.target_weight_lbs !== undefined
        ? String(loadedProfile.target_weight_lbs)
        : ''
    );
    setOnboardingActivityLevelDraft(loadedProfile.activity_level ?? 'moderate');

    const latestGoal = goals[0];
    if (latestGoal) {
      setGoalEffectiveAtDraft(latestGoal.effective_at);
      setGoalCaloriesDraft(String(latestGoal.calorie_goal));
      setGoalProteinDraft(String(latestGoal.protein_goal));
      setGoalCarbsDraft(String(latestGoal.carbs_goal));
      setGoalFatDraft(String(latestGoal.fat_goal));
      setGoalWeightDraft(latestGoal.target_weight_lbs !== null ? String(latestGoal.target_weight_lbs) : '');
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkEntryBackend() {
      setEntryBackendTone('checking');
      setEntryBackendStatus('Checking backend reachability');
      setEntryBackendDetail(`Using ${getApiBaseUrl()}`);

      try {
        const health = await fetchBackendHealth();
        if (cancelled) {
          return;
        }
        setEntryBackendTone('live');
        setEntryBackendStatus(`${health.service} reachable`);
        setEntryBackendDetail(`${getApiBaseUrl()} responded at ${new Date(health.timestamp).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })}`);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setEntryBackendTone('checking');
        setEntryBackendStatus('Backend unavailable for live profile mode');
        setEntryBackendDetail(
          `Could not reach ${getApiBaseUrl()}. Start the backend on port 8000 or set EXPO_PUBLIC_API_BASE_URL in frontend/.env.`
        );
      }
    }

    void checkEntryBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadFavoriteFoods() {
      setFoodTone('checking');
      setFoodStatus('Loading favorite foods');
      setFoodError(null);

      if (entryMode !== 'live' || !foodSessionToken) {
        setFavoriteFoods([]);
        setFoodResults([]);
        setSelectedFoodId('');
        setFoodTone('checking');
        setFoodStatus('Preview mode uses demo data instead of a live favorites session');
        setFoodError(null);
        return;
      }

      try {
        const favorites = await fetchFavoriteFoods(foodSessionToken);
        if (cancelled) {
          return;
        }

        const liveFavorites = sortFoodsForPicker(favorites.map((food) => ({ ...food, favorite: true })));
        setFavoriteFoods(liveFavorites);
        setFoodResults((current) => (foodSearchTerm.trim() ? current : liveFavorites));
        setSelectedFoodId((current) => selectFoodById(liveFavorites, current)?.id ?? liveFavorites[0]?.id ?? '');
        setFoodTone('live');
        setFoodStatus(`${liveFavorites.length} favorite foods loaded`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFavoriteFoods([]);
        setFoodResults([]);
        setSelectedFoodId('');
        setFoodTone('checking');
        setFoodStatus('Favorite foods unavailable');
        setFoodError(error instanceof Error ? error.message : 'Favorite foods unavailable.');
      }
    }

    async function syncBackend() {
      if (entryMode === 'preview') {
        setSnapshot(demoDashboardSnapshot);
        setRecipeImportTone('checking');
        setRecipeImportStatus('Preview mode active');
        setRecipeImportError(null);
        setSyncTone('checking');
        setSyncLabel('Preview mode');
        setSyncDetail('Showing demo data without a live local profile session.');
        return;
      }

      setRecipeImportTone('checking');
      setRecipeImportStatus('Loading live dashboard summary');
      setRecipeImportError(null);

      try {
        const [health, metrics] = await Promise.all([
          fetchBackendHealth(),
          fetchWeeklyMetrics()
        ]);
        if (cancelled) {
          return;
        }

        setSnapshot({
          connectionLabel: health.service,
          connectionDetail: `Connected at ${new Date(health.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}`,
          weeklyMetrics: metrics,
          mealTotals: mealTotals(mealDraft),
          rangeSeries: rangeTabs.map((range) =>
            range === '1W'
              ? {
                  range,
                  label: '1W',
                  detail: `${metrics.calories_consumed.toLocaleString()} kcal tracked from the live summary`,
                  targetCalories: metrics.calorie_goal,
                  caloriesConsumed: metrics.calories_consumed,
                  macroTargets: metrics.macro_targets,
                  macroConsumed: metrics.macro_consumed,
                  points: [
                    { label: 'Start', calories: Math.round(metrics.calorie_goal * 0.2) },
                    { label: 'Mid', calories: Math.round(metrics.calories_consumed * 0.4) },
                    { label: 'Late', calories: Math.round(metrics.calories_consumed * 0.7) },
                    { label: 'Now', calories: metrics.calories_consumed }
                  ]
                }
              : createEmptyDashboardRangeSeries(range)
          ),
        });
        setRecipeImportTone('live');
        setRecipeImportStatus('No imported recipe selected yet');
        setSyncTone('live');
        setSyncLabel('Live backend');
        setSyncDetail('Expo is reading live summary metrics from the Python API.');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSyncTone('checking');
        setSyncLabel('Backend unavailable');
        setSyncDetail(error instanceof Error ? error.message : 'Backend unavailable.');
        setRecipeImportTone('checking');
        setRecipeImportStatus('Live recipe import unavailable');
        setRecipeImportError(error instanceof Error ? error.message : 'Recipe import unavailable.');
        setSnapshot(demoDashboardSnapshot);
      }
    }

    void loadFavoriteFoods();
    void syncBackend();

    return () => {
      cancelled = true;
    };
  }, [entryMode, foodSearchTerm, foodSessionToken, mealDraft]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadProfileSettings() {
      if (!foodSessionToken) {
        setProfileLoaded(true);
        setProfile(null);
        setProfileGoals([]);
        setProfileProgress(demoProfileProgress);
        setWeightEntries(demoWeightEntries);
        resetPreviewProfileDrafts();
        setProfileTone('checking');
        setProfileStatus('Preview profile loaded');
        setProfileError('No active profile session. Showing preview progress data.');
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
        applyProfileDrafts(loadedProfile, goals);
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
        setProfileProgress(demoProfileProgress);
        setWeightEntries(demoWeightEntries);
        resetPreviewProfileDrafts();
        setProfileTone('checking');
        setProfileStatus('Preview profile loaded');
        setProfileError(error instanceof Error ? `${error.message} Showing preview progress data.` : 'Profile settings unavailable. Showing preview progress data.');
      } finally {
        if (!cancelled) {
          setProfileLoaded(true);
        }
      }
    }

    void loadProfileSettings();

    return () => {
      cancelled = true;
    };
  }, [entryMode, foodSessionToken]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadTrackerSections() {
      if (!foodSessionToken) {
        setTrackerTone('checking');
        setTrackerStatus('Preview tracker loaded');
        setTrackerError('No active tracker session. Showing preview tracker data.');
        setExerciseEntries(demoExerciseEntries);
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
        setTrackerStatus('Preview tracker loaded');
        setTrackerError(error instanceof Error ? `${error.message} Showing preview tracker data.` : 'Tracker data unavailable. Showing preview tracker data.');
        setExerciseEntries(demoExerciseEntries);
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
  }, [entryMode, foodSessionToken]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadFoodLog() {
      setFoodLogLoading(true);
      setFoodLogTone('checking');
      setFoodLogStatus("Loading today's log");
      setFoodLogError(null);

      try {
        if (!foodSessionToken) {
          throw new Error('No active food session.');
        }
        const log = await fetchTodaysFoodLog(foodSessionToken);

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
        setFoodLog(demoFoodLog);
        setFoodLogTone('checking');
        setFoodLogStatus('Preview daily log loaded');
        setFoodLogError(error instanceof Error ? `${error.message} Showing preview daily log.` : 'Daily log unavailable. Showing preview daily log.');
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
  }, [entryMode, foodSessionToken]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function syncFoodSearch() {
      const query = foodSearchTerm.trim();
      if (!query) {
        const liveFavorites = sortFoodsForPicker(favoriteFoods);
        setFoodStatus(
          liveFavorites.length === 0
            ? 'No favorite foods loaded yet'
            : `${liveFavorites.length} favorite foods loaded`
        );
        setFoodTone(foodSessionToken ? 'live' : 'checking');
        setFoodError(null);
        setFoodResults(liveFavorites);
        setSelectedFoodId((current) => selectFoodById(liveFavorites, current)?.id ?? liveFavorites[0]?.id ?? '');
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
        setFoodTone(foodSessionToken ? 'live' : 'checking');
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
        setFoodTone('checking');
        setFoodStatus('Showing cached favorite matches');
        setFoodError(error instanceof Error ? error.message : 'Food search unavailable.');
      }
    }

    void syncFoodSearch();

    return () => {
      cancelled = true;
    };
  }, [favoriteFoods, foodSearchTerm, foodSessionToken]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    const timeoutId = setTimeout(() => setFoodSearchTerm(foodDraft), 150);
    return () => clearTimeout(timeoutId);
  }, [entryMode, foodDraft]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function syncLogFoodSearch() {
      const query = logFoodSearchTerm.trim();
      if (!query) {
        setLogFoodResults([]);
        setSelectedLogFoodId('');
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
  }, [entryMode, logFoodSearchTerm]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadRecipeFavorites() {
      setRecipeLoading(true);
      setRecipeTone('checking');
      setRecipeStatus('Loading recipe favorites');
      setRecipeError(null);

      try {
        if (!foodSessionToken) {
          throw new Error('No active recipe session.');
        }
        const [catalog, favorites] = await Promise.all([fetchRecipes(), fetchFavoriteRecipes(foodSessionToken)]);

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

        setRecipeCatalog([]);
        setRecipeFavorites([]);
        setSelectedRecipeId(null);
        setSelectedRecipe(null);
        setRecipeTone('checking');
        setRecipeStatus('Recipe favorites unavailable');
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
  }, [entryMode, foodSessionToken]);

  async function enterLiveMode() {
    const email = entryEmailDraft.trim().toLowerCase();
    const displayName = entryDisplayNameDraft.trim();

    if (!email || !displayName) {
      setEntryError('Enter an email and display name before creating a local profile session.');
      return;
    }

    setEntryLoading(true);
    setEntryError(null);
    setProfileLoaded(false);

    try {
      const session = await createLocalSession(email, displayName);
      setFoodSessionToken(session.access_token);
      setEntryMode('live');
    } catch (error) {
      const fallbackMessage = `Unable to create a local profile session via ${getApiBaseUrl()}. Start the backend or set EXPO_PUBLIC_API_BASE_URL in frontend/.env.`;
      setEntryError(error instanceof Error ? `${error.message} ${fallbackMessage}` : fallbackMessage);
    } finally {
      setEntryLoading(false);
    }
  }

  function enterPreviewMode() {
    setFoodSessionToken(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setEntryMode('preview');
  }

  function returnToEntryScreen() {
    setFoodSessionToken(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setEntryMode(null);
  }

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

        setSelectedRecipe(null);
        setRecipeTone('checking');
        setRecipeStatus('Recipe detail unavailable');
        setRecipeError(error instanceof Error ? error.message : 'Recipe detail unavailable.');
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
  }, [recipeCatalog, recipeFavorites, selectedRecipeId]);

  const selectedSeries = useMemo(
    () => selectRangeSeries(snapshot.rangeSeries, activeRange),
    [activeRange, snapshot.rangeSeries]
  );
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
  const latestProfileGoal = useMemo(() => profileGoals[0] ?? null, [profileGoals]);
  const filteredRecipeCatalog = useMemo(
    () => filterRecipesFuzzy(sortRecipesAlphabetically(recipeCatalog), recipeSearchTerm),
    [recipeCatalog, recipeSearchTerm]
  );
  const mealPreview = useMemo(() => scaleMealIngredients(mealDraft, mealScale), [mealDraft, mealScale]);
  const mealTotalsPreview = useMemo(() => mealTotals(mealPreview), [mealPreview]);
  const selectedRecipePreview = useMemo(() => {
    if (!selectedRecipe) {
      return null;
    }

    return scaleMealIngredients(
      {
        id: selectedRecipe.id,
        name: selectedRecipe.title,
        serving_count: selectedRecipe.default_yield,
        ingredients: selectedRecipe.ingredients
      },
      recipeScale
    );
  }, [recipeScale, selectedRecipe]);
  const selectedRecipeTotals = useMemo(
    () => (selectedRecipePreview ? mealTotals(selectedRecipePreview) : null),
    [selectedRecipePreview]
  );
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
  const macroCalories = {
    protein: selectedSeries.macroConsumed.protein * 4,
    carbs: selectedSeries.macroConsumed.carbs * 4,
    fat: selectedSeries.macroConsumed.fat * 9
  };
  const macroCalorieTotal = Math.max(macroCalories.protein + macroCalories.carbs + macroCalories.fat, 1);
  const fiberConsumed = 0;
  const fiberGoal = 30;
  const netCaloriePoints = selectedSeries.points.map((point) => ({
    label: point.label,
    calories: point.calories
  }));
  const proteinPoints = selectedSeries.points.map((point) => ({
    label: point.label,
    calories: Math.round((point.calories / Math.max(selectedSeries.caloriesConsumed, 1)) * selectedSeries.macroConsumed.protein)
  }));
  const carbsPoints = selectedSeries.points.map((point) => ({
    label: point.label,
    calories: Math.round((point.calories / Math.max(selectedSeries.caloriesConsumed, 1)) * selectedSeries.macroConsumed.carbs)
  }));
  const fatPoints = selectedSeries.points.map((point) => ({
    label: point.label,
    calories: Math.round((point.calories / Math.max(selectedSeries.caloriesConsumed, 1)) * selectedSeries.macroConsumed.fat)
  }));
  const fiberPoints = selectedSeries.points.map((point) => ({
    label: point.label,
    calories: Math.round((point.calories / Math.max(selectedSeries.caloriesConsumed, 1)) * fiberConsumed)
  }));
  const dashboardMetricConfig: Record<
    DashboardMetricKey,
    {
      label: string;
      value: string;
      detail: string;
      targetLabel: string;
      targetValue: number;
      points: { label: string; calories: number }[];
      accentColor?: string;
      ringPercentage?: number;
      ringText?: string;
      chartTitle: string;
      legendLabel: string;
    }
  > = {
    net_calories: {
      label: 'Net Calories',
      value: `${trackerTotals.netCalories.toLocaleString()} kcal`,
      detail:
        activeRange === '1D'
          ? 'Net calories after exercise across today'
          : 'Daily net calories compared against the daily goal',
      targetLabel: 'Daily goal',
      targetValue: activeRange === '1D' ? selectedSeries.targetCalories : Math.round(selectedSeries.targetCalories / Math.max(selectedSeries.points.length, 1)),
      points: netCaloriePoints,
      chartTitle: `Net calories across ${activeRange}`,
      legendLabel: 'Daily calories'
    },
    protein: {
      label: 'Protein',
      value: `${Math.round(selectedSeries.macroConsumed.protein)} g`,
      detail: 'Protein intake over the selected range',
      targetLabel: 'Protein goal',
      targetValue: activeRange === '1D' ? Math.round(selectedSeries.macroTargets.protein) : Math.round(selectedSeries.macroTargets.protein / Math.max(selectedSeries.points.length, 1)),
      points: proteinPoints,
      accentColor: '#0f766e',
      ringPercentage: (macroCalories.protein / macroCalorieTotal) * 100,
      ringText: `${Math.round((macroCalories.protein / macroCalorieTotal) * 100)}%`,
      chartTitle: `Protein tracked across ${activeRange}`,
      legendLabel: 'Daily protein'
    },
    carbs: {
      label: 'Carbs',
      value: `${Math.round(selectedSeries.macroConsumed.carbs)} g`,
      detail: 'Carbohydrate intake over the selected range',
      targetLabel: 'Carb goal',
      targetValue: activeRange === '1D' ? Math.round(selectedSeries.macroTargets.carbs) : Math.round(selectedSeries.macroTargets.carbs / Math.max(selectedSeries.points.length, 1)),
      points: carbsPoints,
      accentColor: '#ea580c',
      ringPercentage: (macroCalories.carbs / macroCalorieTotal) * 100,
      ringText: `${Math.round((macroCalories.carbs / macroCalorieTotal) * 100)}%`,
      chartTitle: `Carbs tracked across ${activeRange}`,
      legendLabel: 'Daily carbs'
    },
    fat: {
      label: 'Fat',
      value: `${Math.round(selectedSeries.macroConsumed.fat)} g`,
      detail: 'Fat intake over the selected range',
      targetLabel: 'Fat goal',
      targetValue: activeRange === '1D' ? Math.round(selectedSeries.macroTargets.fat) : Math.round(selectedSeries.macroTargets.fat / Math.max(selectedSeries.points.length, 1)),
      points: fatPoints,
      accentColor: '#2563eb',
      ringPercentage: (macroCalories.fat / macroCalorieTotal) * 100,
      ringText: `${Math.round((macroCalories.fat / macroCalorieTotal) * 100)}%`,
      chartTitle: `Fat tracked across ${activeRange}`,
      legendLabel: 'Daily fat'
    },
    fiber: {
      label: 'Fiber',
      value: fiberConsumed > 0 ? `${fiberConsumed} g` : '—',
      detail: 'Fiber tracking remains a placeholder until fiber is wired into the saved totals',
      targetLabel: 'Fiber goal',
      targetValue: fiberGoal,
      points: fiberPoints,
      accentColor: '#7c3aed',
      ringPercentage: fiberConsumed > 0 && fiberGoal > 0 ? (fiberConsumed / fiberGoal) * 100 : 0,
      ringText: fiberConsumed > 0 && fiberGoal > 0 ? `${Math.round((fiberConsumed / fiberGoal) * 100)}%` : '—',
      chartTitle: `Fiber tracked across ${activeRange}`,
      legendLabel: 'Daily fiber'
    }
  };
  const activeMetricConfig = dashboardMetricConfig[activeDashboardMetric];
  const dashboardHeaderMetrics = [
    {
      key: 'net_calories' as const,
      label: dashboardMetricConfig.net_calories.label,
      value: dashboardMetricConfig.net_calories.value
    },
    {
      key: 'protein' as const,
      label: dashboardMetricConfig.protein.label,
      value: dashboardMetricConfig.protein.value,
      accentColor: dashboardMetricConfig.protein.accentColor,
      ringPercentage: dashboardMetricConfig.protein.ringPercentage,
      ringText: dashboardMetricConfig.protein.ringText
    },
    {
      key: 'carbs' as const,
      label: dashboardMetricConfig.carbs.label,
      value: dashboardMetricConfig.carbs.value,
      accentColor: dashboardMetricConfig.carbs.accentColor,
      ringPercentage: dashboardMetricConfig.carbs.ringPercentage,
      ringText: dashboardMetricConfig.carbs.ringText
    },
    {
      key: 'fat' as const,
      label: dashboardMetricConfig.fat.label,
      value: dashboardMetricConfig.fat.value,
      accentColor: dashboardMetricConfig.fat.accentColor,
      ringPercentage: dashboardMetricConfig.fat.ringPercentage,
      ringText: dashboardMetricConfig.fat.ringText
    },
    {
      key: 'fiber' as const,
      label: dashboardMetricConfig.fiber.label,
      value: dashboardMetricConfig.fiber.value,
      accentColor: dashboardMetricConfig.fiber.accentColor,
      ringPercentage: dashboardMetricConfig.fiber.ringPercentage,
      ringText: dashboardMetricConfig.fiber.ringText
    }
  ];
  const missingInputs = [
    ...(foodLog.entries.length === 0 ? ['No foods logged for today yet.'] : []),
    ...(exerciseEntries.length === 0 ? ['No exercise entries recorded for the current period.'] : []),
    ...(weightEntries.length === 0 ? ['No weight entries saved yet.'] : []),
    ...(fiberConsumed === 0 ? ['Fiber tracking is not wired into the dashboard totals yet.'] : [])
  ];
  const onboardingRequired = profileLoaded && profile !== null && profile.setup_complete === false;

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
    setFoodTone('checking');
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
      setFoodTone('live');
      setFoodStatus(nextFavorite ? `${food.name} added to favorite foods` : `${food.name} removed from favorite foods`);
    } catch (error) {
      const revertedFavorites = favoriteFoods;
      const revertedResults = foodResults;
      setFavoriteFoods(revertedFavorites);
      setFoodResults(revertedResults);
      setSelectedFoodId((current) => selectFoodById(revertedResults, current)?.id ?? revertedResults[0]?.id ?? '');
      setFoodTone('checking');
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
      if (!foodSessionToken) {
        throw new Error('Create a local session before saving food log entries.');
      }
      const updatedLog = await addFoodLogEntry(
        {
          food_id: food.id,
          grams,
          calories: round1((food.calories * grams) / Math.max(food.serving_size, 1)),
          protein: round1((food.macros.protein * grams) / Math.max(food.serving_size, 1)),
          carbs: round1((food.macros.carbs * grams) / Math.max(food.serving_size, 1)),
          fat: round1((food.macros.fat * grams) / Math.max(food.serving_size, 1))
        },
        foodSessionToken
      );
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

  async function completeOnboardingSetup() {
    const age_years = Number(onboardingAgeDraft);
    const feet = Number(onboardingHeightFeetDraft);
    const inches = Number(onboardingHeightInchesDraft);
    const current_weight_lbs = Number(onboardingCurrentWeightDraft);
    const target_weight_lbs = Number(onboardingTargetWeightDraft);

    if (
      !Number.isFinite(age_years) ||
      age_years <= 0 ||
      !Number.isFinite(feet) ||
      feet <= 0 ||
      !Number.isFinite(inches) ||
      inches < 0 ||
      !Number.isFinite(current_weight_lbs) ||
      current_weight_lbs <= 0 ||
      !Number.isFinite(target_weight_lbs) ||
      target_weight_lbs <= 0
    ) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError('Enter a valid age, height, weight, and target weight before continuing.');
      return;
    }

    if (!foodSessionToken) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError('Create a live local session before continuing to the app.');
      return;
    }

    const height_cm = round1(((feet * 12 + inches) * 2.54));

    setOnboardingSaving(true);
    setOnboardingStatus('Saving your first-run setup');
    setOnboardingError(null);

    try {
      const completed = await completeOnboarding(
        {
          sex: onboardingSexDraft,
          age_years: Math.round(age_years),
          height_cm,
          current_weight_lbs: round1(current_weight_lbs),
          goal_type: onboardingGoalTypeDraft,
          target_weight_lbs: round1(target_weight_lbs),
          activity_level: onboardingActivityLevelDraft
        },
        foodSessionToken
      );
      setProfile(completed);

      const [loadedProfile, goals, progress, weights] = await Promise.all([
        fetchProfile(foodSessionToken),
        fetchUserGoals(foodSessionToken),
        fetchProfileProgress(foodSessionToken),
        fetchWeightEntries(foodSessionToken)
      ]);

      setProfile(loadedProfile);
      setProfileGoals(goals);
      setProfileProgress(progress);
      setWeightEntries(weights);
      applyProfileDrafts(loadedProfile, goals);

      setProfileLoaded(true);
      setProfileTone('live');
      setProfileStatus('Onboarding completed');
      setOnboardingStatus('Setup complete. Opening the app...');
      setSection('dashboard');
    } catch (error) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      setOnboardingSaving(false);
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
      if (!foodSessionToken) {
        throw new Error('Create a local session before saving food log entries.');
      }
      const updatedLog = await addFoodLogEntry(
        {
          food_id: selectedLogFood.id,
          grams: round1(grams),
          calories: logEntryPreview?.calories ?? 0,
          protein: logEntryPreview?.macros.protein ?? 0,
          carbs: logEntryPreview?.macros.carbs ?? 0,
          fat: logEntryPreview?.macros.fat ?? 0
        },
        foodSessionToken
      );
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

    const age_years = Number(onboardingAgeDraft);
    const feet = Number(onboardingHeightFeetDraft);
    const inches = Number(onboardingHeightInchesDraft);
    const current_weight_lbs = Number(onboardingCurrentWeightDraft);
    const target_weight_lbs =
      onboardingTargetWeightDraft.trim().length === 0 ? null : Number(onboardingTargetWeightDraft);

    if (
      !Number.isFinite(age_years) ||
      age_years <= 0 ||
      !Number.isFinite(feet) ||
      feet <= 0 ||
      !Number.isFinite(inches) ||
      inches < 0 ||
      !Number.isFinite(current_weight_lbs) ||
      current_weight_lbs <= 0 ||
      (target_weight_lbs !== null && (!Number.isFinite(target_weight_lbs) || target_weight_lbs <= 0))
    ) {
      setProfileTone('checking');
      setProfileStatus('Could not save profile settings');
      setProfileError('Enter a valid age, height, weight, and optional target weight before saving.');
      return;
    }

    const height_cm = round1(((feet * 12 + inches) * 2.54));

    const payload = {
      display_name: profileDisplayNameDraft.trim().length > 0 ? profileDisplayNameDraft.trim() : null,
      timezone: profileTimezoneDraft.trim() || 'UTC',
      units: profileUnitsDraft,
      sex: onboardingSexDraft,
      age_years: Math.round(age_years),
      height_cm,
      current_weight_lbs: round1(current_weight_lbs),
      goal_type: onboardingGoalTypeDraft,
      target_weight_lbs: target_weight_lbs === null ? null : round1(target_weight_lbs),
      activity_level: onboardingActivityLevelDraft
    } satisfies Parameters<typeof updateProfile>[0];

    setProfileSaving(true);
    setProfileTone('checking');
    setProfileStatus('Saving profile and recalculating targets');
    setProfileError(null);

    try {
      if (foodSessionToken) {
        const updated = await updateProfile(payload, foodSessionToken);
        const [goals, progress, weights] = await Promise.all([
          fetchUserGoals(foodSessionToken),
          fetchProfileProgress(foodSessionToken),
          fetchWeightEntries(foodSessionToken)
        ]);
        setProfile(updated);
        setProfileGoals(goals);
        setProfileProgress(progress);
        setWeightEntries(weights);
        applyProfileDrafts(updated, goals);
      }
      setProfileTone('live');
      setProfileStatus('Profile and targets saved');
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

  async function addWeightRecord() {
    if (!foodSessionToken) {
      setProfileTone('checking');
      setProfileStatus('Preview profile loaded');
      setProfileError('Create a local session before saving weight entries.');
      return;
    }

    const weightLbs = Number(weightValueDraft);
    if (!Number.isFinite(weightLbs) || weightLbs <= 0) {
      setProfileTone('checking');
      setProfileStatus('Could not save weight entry');
      setProfileError('Enter a valid weight in pounds before saving.');
      return;
    }

    if (weightRecordedAtDraft.trim().length === 0) {
      setProfileTone('checking');
      setProfileStatus('Could not save weight entry');
      setProfileError('Enter a valid recorded date before saving.');
      return;
    }

    setWeightSaving(true);
    setProfileTone('checking');
    setProfileStatus('Saving weight entry');
    setProfileError(null);

    try {
      await createWeightEntry(
        {
          recorded_at: weightRecordedAtDraft,
          weight_lbs: Number(weightLbs.toFixed(1))
        },
        foodSessionToken
      );
      const [progress, weights] = await Promise.all([
        fetchProfileProgress(foodSessionToken),
        fetchWeightEntries(foodSessionToken)
      ]);
      setProfileProgress(progress);
      setWeightEntries(weights);
      setWeightValueDraft('');
      setProfileTone('live');
      setProfileStatus('Weight entry saved');
    } catch (error) {
      setProfileTone('checking');
      setProfileStatus('Could not save weight entry');
      setProfileError(error instanceof Error ? error.message : 'Unable to save weight entry.');
    } finally {
      setWeightSaving(false);
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
      setMealPrepTone('live');
      setMealPrepStatus(`${currentTask.title} marked ${nextStatus.toLowerCase()}`);
    } catch (error) {
      setMealPrepTasks((current) => current.map((task) => (task.id === taskId ? currentTask : task)));
      setMealPrepTone('checking');
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

  function updateMealIngredientGrams(ingredientId: string, gramsValue: string) {
    const grams = Number(gramsValue);
    if (!Number.isFinite(grams) || grams < 0) {
      return;
    }

    setMealDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, grams: round1(grams) } : ingredient
      )
    }));
  }

  function resetMealDraft() {
    setMealDraft(createEmptyMealDraft());
    setMealScale(1);
  }

  function updateMealName(name: string) {
    setMealDraft((current) => ({
      ...current,
      name
    }));
  }

  function updateMealServings(value: string) {
    const nextServingCount = Number(value);
    if (!Number.isFinite(nextServingCount) || nextServingCount <= 0) {
      return;
    }

    setMealDraft((current) => ({
      ...current,
      serving_count: round1(nextServingCount)
    }));
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
      if (!foodSessionToken) {
        throw new Error('Create a local session before updating recipe favorites.');
      }
      const updated = nextFavorite
        ? await favoriteRecipe(recipe.id, foodSessionToken)
        : await unfavoriteRecipe(recipe.id, foodSessionToken);

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
      setRecipeTone('checking');
      setRecipeStatus(`Could not update ${recipe.title}`);
      setRecipeError(error instanceof Error ? error.message : 'Unable to update recipe favorite.');
    } finally {
      setRecipeSavingId(null);
    }
  }

  if (entryMode === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Nutrition OS</Text>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.headline}>Start with a real local profile or open the demo app.</Text>
                <Text style={styles.lede}>
                  Use the live path to test session creation, onboarding, and profile-driven business logic. Use preview mode to inspect the post-setup experience with dummy data.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Entry</Text>
            <Text style={styles.panelTitle}>Choose how to open the app</Text>
            <Text style={styles.panelDetail}>
              The live path creates a local backend session and routes you through profile creation. Preview mode skips session creation and loads demo data only.
            </Text>

            <View style={[styles.inlineStatus, { borderColor: toneColor(entryBackendTone) }]}>
              <Text style={styles.inlineStatusLabel}>{entryBackendStatus}</Text>
              <Text style={styles.inlineStatusDetail}>{entryBackendDetail}</Text>
            </View>

            <View style={styles.profileFieldStack}>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Email</Text>
                <TextInput
                  value={entryEmailDraft}
                  onChangeText={setEntryEmailDraft}
                  placeholder="dev@example.com"
                  placeholderTextColor="#7c8aa5"
                  style={styles.profileFieldInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Display name</Text>
                <TextInput
                  value={entryDisplayNameDraft}
                  onChangeText={setEntryDisplayNameDraft}
                  placeholder="Local Dev User"
                  placeholderTextColor="#7c8aa5"
                  style={styles.profileFieldInput}
                />
              </View>
            </View>

            {entryError ? (
              <View style={[styles.inlineStatus, { borderColor: toneColor('checking') }]}>
                <Text style={styles.inlineStatusLabel}>Could not create local profile session</Text>
                <Text style={styles.inlineStatusDetail}>{entryError}</Text>
              </View>
            ) : null}

            <View style={styles.profileFieldStack}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => void enterLiveMode()}
                disabled={entryLoading}
              >
                <Text style={styles.primaryButtonLabel}>
                  {entryLoading ? 'Creating session...' : 'Create local profile'}
                </Text>
              </Pressable>

              <Pressable style={styles.inlinePillButton} onPress={enterPreviewMode} disabled={entryLoading}>
                <Text style={styles.inlinePillButtonLabel}>Open preview mode</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!profileLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.bootState}>
          <ActivityIndicator size="large" color="#17324d" />
          <Text style={styles.bootStateTitle}>Loading your profile</Text>
          <Text style={styles.bootStateDetail}>{profileStatus}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (onboardingRequired) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Nutrition OS</Text>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.headline}>Set up your first profile before the main app opens.</Text>
                <Text style={styles.lede}>
                  This one-time setup uses the live backend onboarding route to calculate your starting target and unlock the main app after completion.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.inlineStatus, { borderColor: toneColor(onboardingSaving ? 'checking' : 'live') }]}>
            <Text style={styles.inlineStatusLabel}>{onboardingStatus}</Text>
            {onboardingError ? <Text style={styles.inlineStatusDetail}>{onboardingError}</Text> : null}
          </View>

          <View style={styles.modeControlCard}>
            <Text style={styles.modeControlLabel}>Mode</Text>
            <Text style={styles.modeControlValue}>Live profile setup</Text>
            <View style={styles.modeControlActions}>
              <Pressable style={styles.inlinePillButton} onPress={enterPreviewMode} disabled={onboardingSaving}>
                <Text style={styles.inlinePillButtonLabel}>Switch to preview</Text>
              </Pressable>
              <Pressable style={styles.inlinePillButton} onPress={returnToEntryScreen} disabled={onboardingSaving}>
                <Text style={styles.inlinePillButtonLabel}>Back to entry</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>First run</Text>
            <Text style={styles.panelTitle}>Tell us about you</Text>
            <Text style={styles.panelDetail}>
              We’ll use these values to calculate a starting calorie and macro target for your selected goal, then unlock the app for this profile.
            </Text>

            <View style={styles.profileFieldStack}>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Sex</Text>
                <View style={styles.profileToggleRow}>
                  {(['female', 'male'] as const).map((option) => {
                    const active = onboardingSexDraft === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingSexDraft(option)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                          {option === 'male' ? 'Male' : 'Female'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Age</Text>
                  <TextInput
                    value={onboardingAgeDraft}
                    onChangeText={setOnboardingAgeDraft}
                    keyboardType="numeric"
                    placeholder="34"
                    placeholderTextColor="#7c8aa5"
                    style={styles.profileFieldInput}
                  />
                </View>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Current weight, lb</Text>
                  <TextInput
                    value={onboardingCurrentWeightDraft}
                    onChangeText={setOnboardingCurrentWeightDraft}
                    keyboardType="decimal-pad"
                    placeholder="180"
                    placeholderTextColor="#7c8aa5"
                    style={styles.profileFieldInput}
                  />
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Height, ft</Text>
                  <TextInput
                    value={onboardingHeightFeetDraft}
                    onChangeText={setOnboardingHeightFeetDraft}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="#7c8aa5"
                    style={styles.profileFieldInput}
                  />
                </View>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Height, in</Text>
                  <TextInput
                    value={onboardingHeightInchesDraft}
                    onChangeText={setOnboardingHeightInchesDraft}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#7c8aa5"
                    style={styles.profileFieldInput}
                  />
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Goal</Text>
                <View style={styles.profileToggleRow}>
                  {(['lose', 'maintain', 'gain'] as const).map((option) => {
                    const active = onboardingGoalTypeDraft === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingGoalTypeDraft(option)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                          {option === 'lose' ? 'Weight Loss' : option === 'maintain' ? 'Maintenance' : 'Weight Gain'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Target weight, lb</Text>
                <TextInput
                  value={onboardingTargetWeightDraft}
                  onChangeText={setOnboardingTargetWeightDraft}
                  keyboardType="decimal-pad"
                  placeholder="170"
                  placeholderTextColor="#7c8aa5"
                  style={styles.profileFieldInput}
                />
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Activity level</Text>
                <View style={styles.profileToggleRow}>
                  {(['sedentary', 'light', 'moderate', 'very_active', 'extra_active'] as const).map((option) => {
                    const active = onboardingActivityLevelDraft === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingActivityLevelDraft(option)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                          {option === 'very_active'
                            ? 'Very active'
                            : option === 'extra_active'
                              ? 'Extra active'
                              : option === 'sedentary'
                                ? 'Sedentary'
                                : option === 'light'
                                  ? 'Light'
                                  : 'Moderate'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={() => void completeOnboardingSetup()}
                disabled={onboardingSaving}
              >
                <Text style={styles.primaryButtonLabel}>{onboardingSaving ? 'Saving...' : 'Continue to the app'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.appHeader}>
          <View style={styles.appHeaderCopy}>
            <Text style={styles.appEyebrow}>Nutrition OS</Text>
            <Text style={styles.appTitle}>Personal nutrition dashboard</Text>
            <Text style={styles.appDetail}>Keep the first screen focused on actual intake, targets, and missing inputs.</Text>
          </View>
          <View style={[styles.appStatusCard, { borderColor: toneColor(syncTone) }]}>
            <Text style={styles.appStatusLabel}>{syncLabel}</Text>
            <Text style={styles.appStatusDetail}>{syncDetail}</Text>
          </View>
        </View>

        <View style={styles.modeControlCard}>
          <View style={styles.modeControlHeader}>
            <View>
              <Text style={styles.modeControlLabel}>Mode</Text>
              <Text style={styles.modeControlValue}>{entryMode === 'live' ? 'Live local profile' : 'Preview demo'}</Text>
            </View>
            <Text style={styles.modeControlDetail}>
              {entryMode === 'live' ? profile?.display_name ?? entryDisplayNameDraft : 'Demo state only'}
            </Text>
          </View>
          <View style={styles.modeControlActions}>
            {entryMode === 'live' ? (
              <Pressable style={styles.inlinePillButton} onPress={enterPreviewMode}>
                <Text style={styles.inlinePillButtonLabel}>Switch to preview</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.inlinePillButton} onPress={returnToEntryScreen}>
                <Text style={styles.inlinePillButtonLabel}>Create live profile</Text>
              </Pressable>
            )}
            <Pressable style={styles.inlinePillButton} onPress={returnToEntryScreen}>
              <Text style={styles.inlinePillButtonLabel}>Change entry mode</Text>
            </Pressable>
          </View>
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
            <View style={styles.dashboardStack}>
              <View style={styles.dashboardIntro}>
                <View>
                  <Text style={styles.panelEyebrow}>Dashboard</Text>
                  <Text style={styles.dashboardTitle}>High-level intake overview</Text>
                </View>
                <Text style={styles.panelDetail}>
                  The dashboard now prioritizes the core metrics, one main chart, and the inputs still missing from live tracking.
                </Text>
              </View>

              <DashboardHeaderMetrics
                activeMetric={activeDashboardMetric}
                metrics={dashboardHeaderMetrics}
                onSelect={setActiveDashboardMetric}
              />

              <DashboardTimeRangeTabs
                activeRange={activeRange}
                onChange={setActiveRange}
                ranges={rangeTabs}
              />

              <DashboardHeroChart
                detail={activeMetricConfig.detail}
                legendLabel={activeMetricConfig.legendLabel}
                points={activeMetricConfig.points}
                range={activeRange}
                targetLabel={activeMetricConfig.targetLabel}
                targetValue={activeMetricConfig.targetValue}
                title={activeMetricConfig.chartTitle}
              />

              <DashboardSecondaryMetrics
                adherence={`${snapshot.weeklyMetrics.adherence_score}%`}
                currentWeight={
                  weightProgress.currentWeightLbs !== null
                    ? `${weightProgress.currentWeightLbs.toLocaleString()} lb`
                    : '—'
                }
                missingInputs={missingInputs}
                weeklyChange={`${weightProgress.weeklyWeightChange > 0 ? '+' : ''}${weightProgress.weeklyWeightChange} lb`}
              />

              <View style={styles.summaryStrip}>
                <MetricTile label="Remaining" value={`${rangeRemaining.toLocaleString()} kcal`} compact />
                <MetricTile label="Net" value={`${trackerTotals.netCalories.toLocaleString()} kcal`} compact />
                <MetricTile label="Exercise" value={`${trackerTotals.exerciseCalories.toLocaleString()} kcal`} compact />
                <MetricTile label="Weigh-ins" value={`${weightProgress.weightEntryCount}`} compact />
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
                    label="Goal"
                    value={formatGoalTypeLabel(profile?.goal_type)}
                  />
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
                    label="Initial target"
                    value={
                      profile?.initial_calorie_target !== null && profile?.initial_calorie_target !== undefined
                        ? `${profile.initial_calorie_target.toLocaleString()} kcal`
                        : '—'
                    }
                  />
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

              <View style={styles.detailCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.panelEyebrow}>Weight history</Text>
                    <Text style={styles.detailTitle}>Add a live weigh-in</Text>
                  </View>
                  <Text style={styles.detailSubtitle}>
                    Save a dated weight entry, then refresh the progress snapshot from the backend.
                  </Text>
                </View>

                <View style={styles.profileFieldRow}>
                  <View style={styles.profileFieldHalf}>
                    <Text style={styles.profileFieldLabel}>Recorded date</Text>
                    <TextInput
                      value={weightRecordedAtDraft}
                      onChangeText={setWeightRecordedAtDraft}
                      placeholder="2026-03-29"
                      placeholderTextColor="#7c8aa5"
                      style={styles.profileFieldInput}
                    />
                  </View>
                  <View style={styles.profileFieldHalf}>
                    <Text style={styles.profileFieldLabel}>Weight, lb</Text>
                    <TextInput
                      value={weightValueDraft}
                      onChangeText={setWeightValueDraft}
                      placeholder="181.2"
                      placeholderTextColor="#7c8aa5"
                      keyboardType="numeric"
                      inputMode="decimal"
                      style={styles.profileFieldInput}
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void addWeightRecord()}
                  disabled={weightSaving}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {weightSaving ? 'Saving...' : 'Add weight entry'}
                  </Text>
                </Pressable>
              </View>

              {profile ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{profile.display_name ?? 'Unnamed profile'}</Text>
                  <Text style={styles.detailSubtitle}>
                    {profile.email} · {profile.timezone} · {profile.units}
                  </Text>

                  <View style={styles.profileFieldStack}>
                    <View style={styles.profileFieldRow}>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Display name</Text>
                        <TextInput
                          value={profileDisplayNameDraft}
                          onChangeText={setProfileDisplayNameDraft}
                          placeholder="Nutrition User"
                          placeholderTextColor="#7c8aa5"
                          style={styles.profileFieldInput}
                        />
                      </View>
                      <View style={styles.profileFieldHalf}>
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

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Units</Text>
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
                    </View>

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Sex</Text>
                      <View style={styles.profileToggleRow}>
                        {(['female', 'male'] as const).map((option) => {
                          const active = onboardingSexDraft === option;
                          return (
                            <Pressable
                              key={option}
                              style={[styles.profileToggle, active && styles.profileToggleActive]}
                              onPress={() => setOnboardingSexDraft(option)}
                            >
                              <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                                {option === 'male' ? 'Male' : 'Female'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.profileFieldRow}>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Age</Text>
                        <TextInput
                          value={onboardingAgeDraft}
                          onChangeText={setOnboardingAgeDraft}
                          keyboardType="numeric"
                          placeholder="34"
                          placeholderTextColor="#7c8aa5"
                          style={styles.profileFieldInput}
                        />
                      </View>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Current weight, lb</Text>
                        <TextInput
                          value={onboardingCurrentWeightDraft}
                          onChangeText={setOnboardingCurrentWeightDraft}
                          keyboardType="decimal-pad"
                          placeholder="180"
                          placeholderTextColor="#7c8aa5"
                          style={styles.profileFieldInput}
                        />
                      </View>
                    </View>

                    <View style={styles.profileFieldRow}>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Height, ft</Text>
                        <TextInput
                          value={onboardingHeightFeetDraft}
                          onChangeText={setOnboardingHeightFeetDraft}
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor="#7c8aa5"
                          style={styles.profileFieldInput}
                        />
                      </View>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Height, in</Text>
                        <TextInput
                          value={onboardingHeightInchesDraft}
                          onChangeText={setOnboardingHeightInchesDraft}
                          keyboardType="numeric"
                          placeholder="10"
                          placeholderTextColor="#7c8aa5"
                          style={styles.profileFieldInput}
                        />
                      </View>
                    </View>

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Goal</Text>
                      <View style={styles.profileToggleRow}>
                        {(['lose', 'maintain', 'gain'] as const).map((option) => {
                          const active = onboardingGoalTypeDraft === option;
                          return (
                            <Pressable
                              key={option}
                              style={[styles.profileToggle, active && styles.profileToggleActive]}
                              onPress={() => setOnboardingGoalTypeDraft(option)}
                            >
                              <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                                {option === 'lose' ? 'Weight Loss' : option === 'maintain' ? 'Maintenance' : 'Weight Gain'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.profileFieldRow}>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Target weight, lb</Text>
                        <TextInput
                          value={onboardingTargetWeightDraft}
                          onChangeText={setOnboardingTargetWeightDraft}
                          keyboardType="decimal-pad"
                          placeholder="170"
                          placeholderTextColor="#7c8aa5"
                          style={styles.profileFieldInput}
                        />
                      </View>
                      <View style={styles.profileFieldHalf}>
                        <Text style={styles.profileFieldLabel}>Activity level</Text>
                        <View style={styles.profileToggleRow}>
                          {(['sedentary', 'light', 'moderate', 'very_active', 'extra_active'] as const).map((option) => {
                            const active = onboardingActivityLevelDraft === option;
                            return (
                              <Pressable
                                key={option}
                                style={[styles.profileToggle, active && styles.profileToggleActive]}
                                onPress={() => setOnboardingActivityLevelDraft(option)}
                              >
                                <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                                  {option === 'very_active'
                                    ? 'Very active'
                                    : option === 'extra_active'
                                      ? 'Extra active'
                                      : option === 'sedentary'
                                        ? 'Sedentary'
                                        : option === 'light'
                                          ? 'Light'
                                          : 'Moderate'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => void saveProfileSettings()}
                    disabled={profileSaving}
                  >
                    <Text style={styles.primaryButtonLabel}>
                      {profileSaving ? 'Saving...' : 'Save profile and recalculate targets'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Goals</Text>
              <Text style={styles.panelTitle}>Target management</Text>
              <Text style={styles.panelDetail}>The profile form above now drives the active targets. Manual goal entries remain available below for temporary overrides or experiments.</Text>

              {latestProfileGoal ? (
                <View style={styles.detailCard}>
                  <View style={styles.recipeRowTitleWrap}>
                    <View>
                      <Text style={styles.panelEyebrow}>Active target</Text>
                      <Text style={styles.detailTitle}>Latest generated target block</Text>
                    </View>
                    <Text style={styles.detailSubtitle}>{latestProfileGoal.effective_at}</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <MetricTile label="Calories" value={`${latestProfileGoal.calorie_goal} kcal`} />
                    <MetricTile label="Protein" value={`${latestProfileGoal.protein_goal} g`} />
                    <MetricTile label="Carbs" value={`${latestProfileGoal.carbs_goal} g`} />
                    <MetricTile label="Fat" value={`${latestProfileGoal.fat_goal} g`} />
                  </View>
                </View>
              ) : null}

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
            <TextInput
              value={mealDraft.name}
              onChangeText={updateMealName}
              placeholder="Untitled meal"
              placeholderTextColor="#7c8aa5"
              style={styles.mealNameInput}
              autoCapitalize="words"
            />
            <Text style={styles.panelDetail}>
              Adjust the draft ingredients, then snap the serving scale to a fixed stop for a fast mobile-friendly preview.
            </Text>

            <View style={styles.mealBuilderHeaderRow}>
              <View style={styles.mealServingWrap}>
                <Text style={styles.mealMetaLabel}>Servings</Text>
                <TextInput
                  value={String(mealDraft.serving_count)}
                  onChangeText={updateMealServings}
                  keyboardType="numeric"
                  inputMode="decimal"
                  style={styles.mealServingInput}
                />
              </View>
              <View style={styles.mealBuilderHintWrap}>
                <Text style={styles.mealBuilderHint}>
                  Local draft only until meal persistence lands on the backend contract.
                </Text>
              </View>
            </View>

            <ScaleStopSelector
              label="Meal scale"
              helperText="Fixed stops keep the preview predictable while you edit the draft."
              value={mealScale}
              values={scaleStops}
              onChange={setMealScale}
            />

            <View style={styles.mealBuilderActionsRow}>
              <Pressable style={styles.inlinePillButton} onPress={resetMealDraft}>
                <Text style={styles.inlinePillButtonLabel}>Reset draft</Text>
              </Pressable>
              <Text style={styles.mealBuilderHint}>Meal save is still backend-gated, so this stays as a live preview.</Text>
            </View>

            <View style={styles.mealIngredientEditor}>
              {mealDraft.ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.mealIngredientRow}>
                  <View style={styles.foodRowCopy}>
                    <Text style={styles.listTitle}>{ingredient.name}</Text>
                    <Text style={styles.listCaption}>
                      {ingredient.food_id} · {ingredient.calories_per_100g} kcal / 100g
                    </Text>
                  </View>
                  <View style={styles.mealIngredientInputWrap}>
                    <TextInput
                      value={String(ingredient.grams)}
                      onChangeText={(value) => updateMealIngredientGrams(ingredient.id, value)}
                      keyboardType="numeric"
                      inputMode="decimal"
                      style={styles.mealIngredientInput}
                    />
                    <Text style={styles.mealIngredientUnit}>g</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.recipeMetaLabel}>Scaled preview</Text>
              {mealPreview.ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.listRow}>
                  <View>
                    <Text style={styles.listTitle}>{ingredient.name}</Text>
                    <Text style={styles.listCaption}>{ingredient.grams} g · {ingredient.food_id}</Text>
                  </View>
                  <Text style={styles.listMetric}>
                    {Math.round((ingredient.calories_per_100g * ingredient.grams) / 100)} kcal
                  </Text>
                </View>
              ))}

              <View style={styles.metricRow}>
                <MetricTile label="Meal calories" value={`${mealTotalsPreview.calories} kcal`} />
                <MetricTile label="Per serving" value={`${mealTotalsPreview.per_serving_calories} kcal`} />
              </View>
            </View>
          </View>
        )}

        {section === 'recipes' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Recipes</Text>
            <Text style={styles.panelTitle}>Recipe library and import review</Text>
            <Text style={styles.panelDetail}>
              Browse the full recipe catalog in alphabetical order, narrow it with fuzzy search, and open each recipe inline to review the details.
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
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>No live recipe import selected</Text>
                <Text style={styles.detailSubtitle}>
                  Imported recipes will appear here after a real text, PDF, or image upload is submitted.
                </Text>
              </View>
            </View>

            <View style={styles.recipeSection}>
              <View style={styles.searchRow}>
                <TextInput
                  value={recipeSearchTerm}
                  onChangeText={setRecipeSearchTerm}
                  placeholder="Find oats, chicken, parfait..."
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {recipeLoading ? (
                <View style={styles.detailCard}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Fetching recipes...</Text>
                </View>
              ) : filteredRecipeCatalog.length === 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>No recipe matches yet</Text>
                  <Text style={styles.detailSubtitle}>
                    Try another title or ingredient term to narrow the recipe list.
                  </Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {filteredRecipeCatalog.map((recipe) => {
                    const active = recipe.id === selectedRecipeId;
                    const saving = recipeSavingId === recipe.id;
                    const detailRecipe = active && selectedRecipe?.id === recipe.id ? selectedRecipe : recipe;
                    const scaledRecipe = active && selectedRecipePreview?.id === recipe.id ? selectedRecipePreview : detailRecipe;
                    const scaledTotals =
                      active && selectedRecipeTotals && selectedRecipe?.id === recipe.id
                        ? selectedRecipeTotals
                        : mealTotals({
                            id: detailRecipe.id,
                            name: detailRecipe.title,
                            serving_count: detailRecipe.default_yield,
                            ingredients: detailRecipe.ingredients
                          });

                    return (
                      <View key={recipe.id} style={[styles.recipeAccordionCard, active && styles.recipeAccordionCardActive]}>
                        <Pressable
                          style={styles.recipeAccordionHeader}
                          onPress={() => setSelectedRecipeId((current) => (current === recipe.id ? null : recipe.id))}
                        >
                          <View style={styles.foodRowCopy}>
                            <View style={styles.recipeRowTitleWrap}>
                              <Text style={styles.listTitle}>{recipe.title}</Text>
                              <Pressable
                                onPress={(event) => {
                                  event.stopPropagation();
                                  void toggleRecipeFavorite(recipe, !recipe.favorite);
                                }}
                                style={[styles.recipeStarButton, recipe.favorite && styles.recipeStarButtonActive]}
                                disabled={saving}
                              >
                                <Text style={styles.recipeStarButtonLabel}>
                                  {saving ? 'Saving...' : recipe.favorite ? '★' : '☆'}
                                </Text>
                              </Pressable>
                            </View>
                            <Text style={styles.listCaption}>
                              {recipe.steps.length} steps · {recipe.ingredients.length} ingredients · {recipe.assets.length} assets
                            </Text>
                          </View>
                          <View style={styles.recipeAccordionMeta}>
                            <Text style={styles.listMetric}>{recipe.default_yield} servings</Text>
                            <Text style={styles.recipeAccordionCaret}>{active ? '▲' : '▼'}</Text>
                          </View>
                        </Pressable>

                        {active ? (
                          <View style={styles.recipeAccordionBody}>
                            {recipeDetailLoading && selectedRecipe?.id === recipe.id ? (
                              <View style={styles.recipeDetailLoading}>
                                <ActivityIndicator size="small" color="#17324d" />
                                <Text style={styles.detailSubtitle}>Loading recipe detail...</Text>
                              </View>
                            ) : (
                              <>
                                <View style={styles.recipeDetailHeader}>
                                  <View style={styles.recipeDetailHeaderCopy}>
                                    <View style={styles.recipeRowTitleWrap}>
                                      <Text style={styles.detailTitle}>{detailRecipe.title}</Text>
                                    </View>
                                    <Text style={styles.detailSubtitle}>
                                      {detailRecipe.steps.length} steps · {detailRecipe.ingredients.length} ingredients ·{' '}
                                      {detailRecipe.assets.length} assets · {detailRecipe.default_yield} servings
                                    </Text>
                                  </View>
                                </View>

                                <ScaleStopSelector
                                  label="Recipe scale"
                                  helperText="The fixed stops keep the serving preview readable while you step through the accordion."
                                  value={recipeScale}
                                  values={scaleStops}
                                  onChange={setRecipeScale}
                                />

                                <View style={styles.metricRow}>
                                  <MetricTile
                                    label="Scaled yield"
                                    value={`${round1(detailRecipe.default_yield * recipeScale)} servings`}
                                  />
                                  <MetricTile label="Recipe calories" value={`${scaledTotals.calories} kcal`} />
                                  <MetricTile
                                    label="Per serving"
                                    value={`${scaledTotals.per_serving_calories} kcal`}
                                  />
                                </View>

                                {detailRecipe.steps.length > 0 ? (
                                  <View style={styles.recipeMetaBlock}>
                                    <Text style={styles.recipeMetaLabel}>Steps</Text>
                                    {detailRecipe.steps.map((step, index) => (
                                      <Text key={`${detailRecipe.id}-step-${index}`} style={styles.recipeStep}>
                                        {index + 1}. {step}
                                      </Text>
                                    ))}
                                  </View>
                                ) : null}

                                {scaledRecipe.ingredients.length > 0 ? (
                                  <View style={styles.recipeMetaBlock}>
                                    <Text style={styles.recipeMetaLabel}>Scaled ingredients</Text>
                                    {scaledRecipe.ingredients.map((ingredient) => (
                                      <Text key={`${detailRecipe.id}-${ingredient.id}`} style={styles.recipeMetaItem}>
                                        {ingredient.name} · {ingredient.grams} g
                                      </Text>
                                    ))}
                                  </View>
                                ) : null}

                                {detailRecipe.ingredients.length > 0 ? (
                                  <View style={styles.recipeMetaBlock}>
                                    <Text style={styles.recipeMetaLabel}>Original ingredients</Text>
                                    {detailRecipe.ingredients.map((ingredient) => (
                                      <Text key={ingredient.id} style={styles.recipeMetaItem}>
                                        {ingredient.name} · {ingredient.grams} g
                                      </Text>
                                    ))}
                                  </View>
                                ) : null}

                                <View style={styles.recipeMetaBlock}>
                                  <Text style={styles.recipeMetaLabel}>Assets</Text>
                                  {detailRecipe.assets.length === 0 ? (
                                    <Text style={styles.recipeMetaItem}>No imported assets attached yet.</Text>
                                  ) : (
                                    detailRecipe.assets.map((asset, index) => (
                                      <Text key={`${detailRecipe.id}-asset-${index}`} style={styles.recipeMetaItem}>
                                        {asset.kind.toUpperCase()} asset {asset.url ? 'linked' : 'embedded'}
                                      </Text>
                                    ))
                                  )}
                                </View>
                              </>
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.recipeSecondaryCard}>
              <Text style={styles.panelEyebrow}>Import and scale</Text>
              <Text style={styles.panelDetail}>
                Text, PDF, and image ingestion will appear here once the import composer is wired in.
              </Text>
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>No live import composer yet</Text>
                <Text style={styles.detailSubtitle}>
                  Imported recipes will show up here after a real text, PDF, or image submission.
                </Text>
              </View>
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

function ScaleStopSelector({
  label,
  helperText,
  value,
  values,
  onChange
}: {
  label: string;
  helperText?: string;
  value: ScaleStop;
  values: readonly ScaleStop[];
  onChange: (value: ScaleStop) => void;
}): ReactElement {
  const activeIndex = Math.max(values.indexOf(value), 0);
  const fillWidth = (values.length > 1 ? `${(activeIndex / (values.length - 1)) * 100}%` : '100%') as DimensionValue;

  return (
    <View style={styles.scaleSelectorCard}>
      <View style={styles.scaleSelectorHeader}>
        <View>
          <Text style={styles.scaleSelectorLabel}>{label}</Text>
          {helperText ? <Text style={styles.scaleSelectorHint}>{helperText}</Text> : null}
        </View>
        <Text style={styles.scaleSelectorValue}>{recipeScaleLabel(value)}</Text>
      </View>
      <View style={styles.scaleSelectorRailWrap}>
        <View style={styles.scaleSelectorRail} />
        <View style={[styles.scaleSelectorRailFill, { width: fillWidth }]} />
        <View style={styles.scaleSelectorStops}>
          {values.map((option) => {
            const active = option === value;

            return (
              <Pressable
                key={option}
                style={styles.scaleSelectorStop}
                onPress={() => onChange(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={recipeScaleLabel(option)}
              >
                <View style={[styles.scaleSelectorDot, active && styles.scaleSelectorDotActive]} />
                <Text style={[styles.scaleSelectorStopLabel, active && styles.scaleSelectorStopLabelActive]}>
                  {recipeScaleLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  bootState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24
  },
  bootStateTitle: {
    color: '#17324d',
    fontSize: 20,
    fontWeight: '800'
  },
  bootStateDetail: {
    color: '#66778c',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center'
  },
  appHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 18,
    gap: 14
  },
  appHeaderCopy: {
    gap: 6
  },
  appEyebrow: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  appTitle: {
    color: '#132536',
    fontSize: 24,
    fontWeight: '800'
  },
  appDetail: {
    color: '#66778c',
    fontSize: 13,
    lineHeight: 18
  },
  appStatusCard: {
    backgroundColor: '#f7fafc',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4
  },
  appStatusLabel: {
    color: '#132536',
    fontWeight: '700',
    fontSize: 14
  },
  appStatusDetail: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 17
  },
  modeControlCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 14,
    gap: 10
  },
  modeControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  modeControlLabel: {
    color: '#6b7b90',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  modeControlValue: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4
  },
  modeControlDetail: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 17,
    flexShrink: 1,
    textAlign: 'right'
  },
  modeControlActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
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
  dashboardStack: {
    gap: 14
  },
  dashboardIntro: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 16,
    gap: 8
  },
  dashboardTitle: {
    color: '#132536',
    fontSize: 22,
    fontWeight: '800'
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
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
  scaleSelectorCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    padding: 14,
    gap: 12
  },
  scaleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  scaleSelectorLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  scaleSelectorValue: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800'
  },
  scaleSelectorHint: {
    color: '#7c8aa5',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4
  },
  scaleSelectorRailWrap: {
    gap: 8
  },
  scaleSelectorRail: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0'
  },
  scaleSelectorRailFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0f766e'
  },
  scaleSelectorStops: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -2
  },
  scaleSelectorStop: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 2
  },
  scaleSelectorDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc'
  },
  scaleSelectorDotActive: {
    borderColor: '#17324d',
    backgroundColor: '#17324d'
  },
  scaleSelectorStopLabel: {
    color: '#7c8aa5',
    fontSize: 11,
    fontWeight: '700'
  },
  scaleSelectorStopLabelActive: {
    color: '#17324d'
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
  mealBuilderActionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  mealBuilderHint: {
    flex: 1,
    minWidth: 180,
    color: '#7c8aa5',
    fontSize: 12,
    lineHeight: 17
  },
  mealIngredientEditor: {
    gap: 10
  },
  mealIngredientRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  mealIngredientInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  mealIngredientInput: {
    minWidth: 64,
    color: '#17324d',
    fontWeight: '800',
    textAlign: 'right'
  },
  mealIngredientUnit: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mealNameInput: {
    borderWidth: 1,
    borderColor: '#d4dbe3',
    borderRadius: 16,
    backgroundColor: '#fff',
    color: '#132536',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  mealBuilderHeaderRow: {
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  mealServingWrap: {
    gap: 6,
    minWidth: 120
  },
  mealMetaLabel: {
    color: '#7a8797',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mealServingInput: {
    borderWidth: 1,
    borderColor: '#d4dbe3',
    borderRadius: 12,
    backgroundColor: '#fff',
    color: '#132536',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  mealBuilderHintWrap: {
    flex: 1,
    minWidth: 220
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
  recipeStarButtonActive: {
    backgroundColor: '#0f766e'
  },
  recipeStarButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  recipeAccordionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    padding: 14,
    gap: 10
  },
  recipeAccordionCardActive: {
    borderColor: '#17324d',
    backgroundColor: '#f7f4ef'
  },
  recipeAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  recipeAccordionMeta: {
    alignItems: 'flex-end',
    gap: 6
  },
  recipeAccordionCaret: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '800'
  },
  recipeAccordionBody: {
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#dbe3ec'
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
