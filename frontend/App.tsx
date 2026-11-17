import { startAppearance, useAppearance } from './src/theme/appearance';
import {
  formatDate,
  formatNumber,
  LanguageProvider,
  parseLanguage,
  useLanguage,
  useT,
  type Language,
  type TranslationKey
} from './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { Ribeye_400Regular, useFonts as useRibeyeFonts } from '@expo-google-fonts/ribeye';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from 'react-native';

import {
  addFavoriteFood,
  createPlannedWorkoutSession,
  createLocalSession,
  deleteExerciseEntry,
  deleteFoodLogEntry,
  updateFoodLogEntry,
  fetchCurrentSession,
  fetchOwnerSession,
  setUnauthorizedHandler,
  previewTargets,
  OWNER_SESSION_TOKEN,
  createWeightEntry,
  deletePlannedWorkoutSession,
  completeOnboarding,
  createUserGoal,
  fetchBackendHealth,
  getApiBaseUrl,
  fetchExerciseEntries,
  fetchWater,
  addWater,
  deleteWater,
  fetchGarminStatus,
  fetchFoodLogsBetween,
  fetchFoodBank,
  removeFoodFromBank,
  deleteMealPlanSlot,
  syncGarmin,
  fetchPlannedWorkoutSessions,
  fetchFavoriteFoods,
  fetchFavoriteRecipes,
  fetchFoodLogForDate,
  fetchMealPlanDays,
  fetchMealPrepTasks,
  fetchProfileProgress,
  fetchProfile,
  fetchUserGoals,
  fetchRecipes,
  fetchRecipe,
  fetchWeightEntries,
  fetchTodaysFoodLog,
  logFood,
  fetchWeeklyMetrics,
  favoriteRecipe,
  searchFoodsWithSession,
  unfavoriteFood,
  resetProfileSetup,
  updateProfile,
  updateMealPlanSlotEatenAt,
  updateMealPrepTaskStatus,
  updatePlannedWorkoutSession,
  updatePlannedWorkoutSessionCompletion,
  unfavoriteRecipe,
  searchFoods
} from './src/lib/api';
import {
  buildDailyTargetSummary,
  DEFAULT_WORKOUT_CALORIES_SHARE,
  type WorkoutCaloriesShare
} from './src/lib/daily-home';
import { buildCalorieBudget } from './src/lib/calorie-budget';
import { WorkoutDetailSheet } from './src/components/WorkoutDetailSheet';
import { SuggestMealSheet } from './src/components/SuggestMealSheet';
import { CreateMealPlan } from './src/components/CreateMealPlan';
import { defaultMealSlot } from './src/lib/meal-slots';
import { styleForSplit, type MealBlockKey, type MealStyleId } from './src/lib/meal-split';
import { fatShareFor } from './src/lib/macro-allowance';
import {
  buildDaySeries,
  calorieSummary,
  goalDate,
  HORIZON_DAYS,
  macroDays,
  paceStatus,
  plannedWeeklyChange,
  projectableRate,
  rangeStart,
  weeklyRate,
  weightTrend,
  type ProjectionHorizon,
  type TrendRange
} from './src/lib/trends';
import { initialWeighInIndexes, weighInColumns, weighInLbs, weighInSummary } from './src/lib/weigh-in';
import { QuickScanAdd } from './src/components/QuickScanAdd';
import { FoodSearchSheet } from './src/components/FoodSearchSheet';
import { QuickCaloriesSheet } from './src/components/QuickCaloriesSheet';
import { AddWorkoutSheet } from './src/components/AddWorkoutSheet';
import { ShoppingListsSheet } from './src/components/ShoppingListsSheet';
import { flushTicks as flushShoppingTicks, pendingCount as pendingShoppingTicks } from './src/lib/shopping-queue';
import { waterDays, waterForDay } from './src/lib/water';
import { groupByMeal } from './src/lib/meal-slots';
import { buildWorkoutDetail } from './src/lib/workout-detail';
import { garminSyncIsStale } from './src/lib/garmin';
import { APP_TABS, subTabsForSection, tabForSection, type AppTabId } from './src/lib/app-shell';
import { ActionSheet } from './src/components/ActionSheet';
import { SubTabs } from './src/components/SubTabs';
import { TabBar } from './src/components/TabBar';
import {
  resolveSelectedMealPlanDate,
  selectMealPlanDay,
  sortMealPlanDaysByDate
} from './src/lib/meal-plan';
import { filterRecipesFuzzy, sortRecipesAlphabetically } from './src/lib/recipes';
import {
  calculateFoodGrams,
  clampFoodQuantity,
  filterFoodsFuzzy,
  mergeFoodsById,
  selectFoodById,
  sortFoodsForPicker
} from './src/lib/foods';
import { mealTotals, round1, scaleMealIngredients } from './src/lib/nutrition';
import { formatAllergySelection, missingOtherAllergy, parseAllergySelection, type AllergyChoice } from './src/lib/allergies';
import { maintenanceForLevel } from './src/lib/activity-level';
import { PickerSheet } from './src/components/PickerSheet';
import {
  draftsFromWheel,
  type BodyField,
  type WheelDrafts
} from './src/lib/wheel-picker';
import {
  buildDemoPlannedWorkoutSessions,
  buildPlannedWorkoutPayload,
  buildOptimisticPlannedWorkoutSession,
  mapPlannedWorkoutSessionToEntry,
  sortPlannedWorkoutSessions,
  buildPlannedWorkoutEditDraft
} from './src/lib/planned-workouts';
import { fallbackForMode, liveLoadErrorMessage, type EntryMode } from './src/lib/live-fallback';
import { isTailnetHost, resolveOwnerAccess } from './src/lib/owner-access';
import { addDaysToDateKey, localDateKey } from './src/lib/dates';
import { isTyping, latestBundleHash, loadedBundleHash, MIN_CHECK_INTERVAL_MS, updateDecision } from './src/lib/app-update';
import { registerServiceWorker } from './src/lib/service-worker';
import {
  FONT_WAIT_MS,
  holdSplashForFonts,
  msSinceLaunch,
  splashHoldRemaining
} from './src/lib/launch-splash';
import { explainerBefore, type ExplainerStep } from './src/lib/onboarding-explainers';
import {
  DEFAULT_PACE,
  findPreviewOption,
  isPaceForGoal,
  needsFloorWarning,
  paceDisplay,
  withCalorieFloor,
  type CalorieFloorChoice,
  type GoalPace,
  type TargetPreview,
  type TargetPreviewOption
} from './src/lib/setup-goals';
import {
  bodyMeasurementsFromDrafts,
  convertBodyDrafts,
  defaultUnitSystemForLocale,
  deviceLocale,
  deviceTimeZone,
  LB_PER_KG,
  type BodyDrafts,
  type UnitSystem
} from './src/lib/body-units';
import { scaleEntryToGrams } from './src/lib/entry-edits';
import {
  clearStoredSessionToken,
  loadStoredSessionToken,
  storeSessionToken
} from './src/lib/session-store';
import type {
  AppSection,
  GarminStatus,
  ExerciseEntry,
  FoodItem,
  FoodLogEntry,
  FoodLogSummary,
  MealInput,
  MealPlanDay,
  MealPrepTask,
  PlannedExerciseEntry,
  PlannedWorkoutSession,
  RecipeDefinition,
  UserGoal,
  UserProfile,
  WaterEntry,
  WeightEntry
} from './src/types';
import {
  demoExerciseEntries,
  demoFoodLog,
  demoPlannedExerciseEntries,
  demoWeightEntries
} from './src/mock-data';
import { LaunchSplash } from './src/components/LaunchSplash';
import {
  createEmptyFoodLog,
  createEmptyMealDraft,
  deriveExerciseIntensity,
  mealStyleSplit,
  sortPlannedExerciseEntries,
  splitHeightCm
} from './src/lib/app-format';
import {
  estimatePlannedExerciseCalories,
  IS_DEVELOPMENT_BUILD,
  mascotAvatarImage,
  onboardingSteps,
  selectExercisePreset,
  type DietaryPattern,
  type NutritionStyle,
  type OnboardingStep,
  type ScaleStop
} from './src/screens/shared/constants';
import { styles } from './src/screens/shared/styles';
import { EntryScreen } from './src/screens/EntryScreen';
import { FoodsScreen } from './src/screens/FoodsScreen';
import { IngestionScreen } from './src/screens/IngestionScreen';
import { MealPlanScreen } from './src/screens/MealPlanScreen';
import { MealPrepScreen } from './src/screens/MealPrepScreen';
import { MealsScreen } from './src/screens/MealsScreen';
import { OnboardingExplainer } from './src/screens/onboarding/OnboardingExplainer';
import { OnboardingWelcome } from './src/screens/onboarding/OnboardingWelcome';
import { OnboardingWizard } from './src/screens/onboarding/OnboardingWizard';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import { WorkoutPlanScreen } from './src/screens/WorkoutPlanScreen';

// Colour variables and the light/dark choice, before the first render.
if (Platform.OS === 'web') {
  startAppearance();
}

/** Sub-tab labels (Plan, Food bank) by section; app-shell keeps the English ones for its tests. */
const SECTION_LABEL_KEYS: Partial<Record<AppSection, TranslationKey>> = {
  'meal-plan': 'nav.sections.mealPlan',
  'workout-plan': 'nav.sections.workoutPlan',
  foods: 'nav.sections.foods',
  recipes: 'nav.sections.recipes',
  meals: 'nav.sections.buildMeal',
  ingestion: 'nav.sections.recentScans'
};

export default function App(): ReactElement {
  return (
    <LanguageProvider>
      <RelishApp />
    </LanguageProvider>
  );
}

function RelishApp(): ReactElement {
  const appearance = useAppearance();
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const [ribeyeLoaded, ribeyeError] = useRibeyeFonts({
    Ribeye_400Regular
  });
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitExpired(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const entryModeRef = useRef<EntryMode | null>(null);
  const [entryIntent, setEntryIntent] = useState<'signup' | 'signin' | null>(null);
  const [entryEmailDraft, setEntryEmailDraft] = useState('');
  const [entryDisplayNameDraft, setEntryDisplayNameDraft] = useState('Local Dev User');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryEmailError, setEntryEmailError] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryBackendTone, setEntryBackendTone] = useState<'checking' | 'live'>('checking');
  const [entryBackendStatus, setEntryBackendStatus] = useState('Checking backend reachability');
  // 'checking' until the server says whether it already knows the owner; 'blocked' when the
  // server requires Tailscale identity and this device did not provide it.
  const [ownerAccess, setOwnerAccess] = useState<'checking' | 'signin' | 'blocked'>('checking');
  const [ownerAccessMessage, setOwnerAccessMessage] = useState<string | null>(null);
  const [ownerCheckNonce, setOwnerCheckNonce] = useState(0);
  const [entryBackendDetail, setEntryBackendDetail] = useState(`Using ${getApiBaseUrl()}`);
  const [section, setSection] = useState<AppSection>('dashboard');
  // Bottom sheets from the tab bar's ＋ and the header avatar.
  const [openSheet, setOpenSheet] = useState<'account' | 'add-food' | 'add-workout' | 'food-search' | 'quick-calories' | 'shopping-lists' | null>(null);
  // The shopping list to open straight away (after Create a Meal Plan), or null for all lists.
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const [workoutDetailId, setWorkoutDetailId] = useState<string | null>(null);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [scanAutoStart, setScanAutoStart] = useState(false);
  const [weighInOpen, setWeighInOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>('1W');
  const [weightHorizon, setWeightHorizon] = useState<ProjectionHorizon>('1M');
  // Gus's single-meal suggestion (Today → Meals).
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [trendLogs, setTrendLogs] = useState<FoodLogSummary[]>([]);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const [mealScale, setMealScale] = useState<ScaleStop>(1);
  const [recipeScale, setRecipeScale] = useState<ScaleStop>(1);
  const [mealDraft, setMealDraft] = useState<MealInput>(() => createEmptyMealDraft());
  const [foodDraft, setFoodDraft] = useState('');
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [foodSessionToken, setFoodSessionToken] = useState<string | null>(null);
  const isOwnerSession = foodSessionToken === OWNER_SESSION_TOKEN;
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
  // The whole food bank (favorites first), what the Food bank screen shows before a search.
  const [bankFoods, setBankFoods] = useState<FoodItem[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [foodQuantities, setFoodQuantities] = useState<Record<string, number>>({});
  const [foodTone, setFoodTone] = useState<'checking' | 'live'>('checking');
  const [foodStatus, setFoodStatus] = useState('Loading favorite foods');
  const [foodError, setFoodError] = useState<string | null>(null);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [foodFavoriteSavingId, setFoodFavoriteSavingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // The profile's language once loaded (the device's until then).
  const profileLanguage = parseLanguage(profile?.language);
  useEffect(() => {
    if (profileLanguage) {
      setLanguage(profileLanguage);
    }
  }, [profileLanguage, setLanguage]);
  const [profileGoals, setProfileGoals] = useState<UserGoal[]>([]);
  const [profileTone, setProfileTone] = useState<'checking' | 'live'>('checking');
  const [profileStatus, setProfileStatus] = useState('Loading profile settings');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [profileDisplayNameDraft, setProfileDisplayNameDraft] = useState('');
  const [profileTimezoneDraft, setProfileTimezoneDraft] = useState('UTC');
  const [profileUnitsDraft, setProfileUnitsDraft] = useState<'imperial' | 'metric'>('imperial');
  const [goalEffectiveAtDraft, setGoalEffectiveAtDraft] = useState(() => localDateKey());
  const [goalCaloriesDraft, setGoalCaloriesDraft] = useState('2100');
  const [goalProteinDraft, setGoalProteinDraft] = useState('180');
  const [goalCarbsDraft, setGoalCarbsDraft] = useState('190');
  const [goalFatDraft, setGoalFatDraft] = useState('60');
  const [goalWeightDraft, setGoalWeightDraft] = useState('178.5');
  const [onboardingSexDraft, setOnboardingSexDraft] = useState<'male' | 'female' | null>(null);
  const [onboardingAgeDraft, setOnboardingAgeDraft] = useState('34');
  const [onboardingHeightFeetDraft, setOnboardingHeightFeetDraft] = useState('5');
  const [onboardingHeightInchesDraft, setOnboardingHeightInchesDraft] = useState('10');
  const [onboardingCurrentWeightDraft, setOnboardingCurrentWeightDraft] = useState('180');
  // Setup asks in the user's units; the server always stores cm and lb.
  const [onboardingUnitsDraft, setOnboardingUnitsDraft] = useState<UnitSystem>(() =>
    defaultUnitSystemForLocale(deviceLocale())
  );
  const [onboardingHeightCmDraft, setOnboardingHeightCmDraft] = useState('');
  // Which setup wheel picker is open, if any.
  const [bodyPicker, setBodyPicker] = useState<BodyField | null>(null);
  // Recommended calorie minimum (1,200 women / 1,500 men), or "off" if the user opted out.
  const [onboardingCalorieFloorDraft, setOnboardingCalorieFloorDraft] = useState<CalorieFloorChoice>('recommended');
  // Goal/pace pairs whose below-the-minimum warning was answered "use the minimum" this setup.
  const [floorAnsweredPaces, setFloorAnsweredPaces] = useState<string[]>([]);
  const [floorMessage, setFloorMessage] = useState<string | null>(null);
  const [floorWarning, setFloorWarning] = useState<{ pace: GoalPace; thenNext: boolean } | null>(null);
  const [settingsFloorWarning, setSettingsFloorWarning] = useState(false);
  // Explainer cards before Daily activity and Your goal: the one showing, and those seen.
  const [activeExplainer, setActiveExplainer] = useState<ExplainerStep | null>(null);
  const [explainersSeen, setExplainersSeen] = useState<ExplainerStep[]>([]);
  const [onboardingGoalTypeDraft, setOnboardingGoalTypeDraft] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [onboardingGoalPaceDraft, setOnboardingGoalPaceDraft] = useState<GoalPace>('recommended');
  const [onboardingTargetWeightDraft, setOnboardingTargetWeightDraft] = useState('');
  const [onboardingActivityLevelDraft, setOnboardingActivityLevelDraft] = useState<
    'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'
  >('sedentary');
  const [onboardingDietaryPatternDraft, setOnboardingDietaryPatternDraft] = useState<DietaryPattern | null>(null);
  const [onboardingNutritionStyleDraft, setOnboardingNutritionStyleDraft] = useState<NutritionStyle | null>(null);
  // "How do you balance your meals?" (breakfast / lunch / dinner). Balanced is preselected.
  const [onboardingMealStyleDraft, setOnboardingMealStyleDraft] = useState<MealStyleId>('balanced');
  // The style as saved (null: custom or not chosen), to tell whether Profile changed it.
  const savedMealStyleRef = useRef<MealStyleId | null>(null);
  const [onboardingAllergySelectionsDraft, setOnboardingAllergySelectionsDraft] = useState<AllergyChoice[]>(['none']);
  const [onboardingAllergyOtherDraft, setOnboardingAllergyOtherDraft] = useState('');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  function handleSectionChange(nextSection: AppSection) {
    if (nextSection === 'settings' && profile) {
      // Settings always opens on the saved values, not edits left unsaved last time.
      setProfileDisplayNameDraft(profile.display_name ?? '');
      setProfileTimezoneDraft(profile.timezone);
      setProfileUnitsDraft(profile.units);
      setSettingsMessage(null);
      setSettingsError(null);
      setFloorMessage(null);
    }
    setSection(nextSection);
    setOpenSheet(null);
  }

  useEffect(() => {
    setOpenSheet(null);
  }, [section, entryMode]);

  // Every screen opens at the top (one ScrollView holds them all, so the offset would carry over).
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [section]);

  /** A tab opens its first screen; tapping the tab you're on scrolls back to the top, as on iOS. */
  function openTab(tab: AppTabId) {
    const target = APP_TABS.find((item) => item.id === tab);
    if (!target) {
      return;
    }
    if (tabForSection(section) === tab) {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    handleSectionChange(target.sections[0].id);
  }

  useEffect(() => {
    // A pace (lose/gain) or focus (maintain) always belongs to the chosen goal.
    if (onboardingGoalTypeDraft && !isPaceForGoal(onboardingGoalTypeDraft, onboardingGoalPaceDraft)) {
      setOnboardingGoalPaceDraft(DEFAULT_PACE[onboardingGoalTypeDraft]);
    }
  }, [onboardingGoalTypeDraft, onboardingGoalPaceDraft]);

  // Calorie preview for the activity, goal, and pace screens (server engine, nothing saved).
  const [targetPreviewState, setTargetPreviewState] = useState<{ key: string; preview: TargetPreview } | null>(null);
  // Only show numbers computed from the current inputs, never a previous answer.
  const targetBodyKey = [
    onboardingSexDraft,
    onboardingAgeDraft,
    onboardingUnitsDraft,
    onboardingHeightFeetDraft,
    onboardingHeightInchesDraft,
    onboardingHeightCmDraft,
    onboardingCurrentWeightDraft
  ].join('|');
  const targetPreviewKey = `${targetBodyKey}|${onboardingActivityLevelDraft}`;
  const targetPreview = targetPreviewState?.key === targetPreviewKey ? targetPreviewState.preview : null;
  // The energy bars only need the same body stats: BMR does not depend on activity, and the
  // preview carries maintenance for every level, so moving the slider updates them instantly.
  const energyPreview =
    targetPreviewState && targetPreviewState.key.startsWith(`${targetBodyKey}|`) ? targetPreviewState.preview : null;
  const energyMaintenance = maintenanceForLevel(energyPreview, onboardingActivityLevelDraft);
  const [showBmrExplainer, setShowBmrExplainer] = useState(false);
  const previewStepActive = onboardingStep === 'activity' || onboardingStep === 'goal' || onboardingStep === 'pace';
  useEffect(() => {
    if (!previewStepActive || !foodSessionToken) {
      return;
    }
    const age_years = Number(onboardingAgeDraft);
    const measurements = bodyMeasurementsFromDrafts(onboardingUnitsDraft, {
      heightFeet: onboardingHeightFeetDraft,
      heightInches: onboardingHeightInchesDraft,
      heightCm: onboardingHeightCmDraft,
      weight: onboardingCurrentWeightDraft
    });
    if (!measurements || !Number.isFinite(age_years) || age_years <= 0 || age_years >= 120) {
      return;
    }
    if (!onboardingSexDraft) {
      return; // BMR depends on sex; no numbers until it's chosen.
    }
    let cancelled = false;
    const requestKey = targetPreviewKey;
    previewTargets(
      {
        sex: onboardingSexDraft,
        age_years: Math.round(age_years),
        height_cm: measurements.height_cm,
        current_weight_lbs: measurements.weight_lbs,
        activity_level: onboardingActivityLevelDraft
      },
      foodSessionToken
    )
      .then((preview) => {
        if (!cancelled) {
          setTargetPreviewState({ key: requestKey, preview });
        }
      })
      .catch(() => {
        // Previews are a nicety: the choices still work without numbers.
      });
    return () => {
      cancelled = true;
    };
  }, [
    previewStepActive,
    foodSessionToken,
    onboardingSexDraft,
    onboardingAgeDraft,
    onboardingUnitsDraft,
    onboardingHeightFeetDraft,
    onboardingHeightInchesDraft,
    onboardingHeightCmDraft,
    onboardingCurrentWeightDraft,
    onboardingActivityLevelDraft,
    targetPreviewKey
  ]);

  function toggleOnboardingAllergy(choice: AllergyChoice) {
    setOnboardingAllergySelectionsDraft((current) => {
      if (choice === 'none') {
        setOnboardingAllergyOtherDraft('');
        return ['none'];
      }

      const withoutNone = current.filter((value) => value !== 'none');
      if (withoutNone.includes(choice)) {
        const next = withoutNone.filter((value) => value !== choice);
        if (choice === 'other') {
          setOnboardingAllergyOtherDraft('');
        }
        return next.length > 0 ? next : ['none'];
      }

      return [...withoutNone, choice];
    });
  }

  // Re-read when the app returns to the foreground so an app left open overnight rolls over.
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const [selectedHomeDate, setSelectedHomeDate] = useState(todayKey);
  const [foodLog, setFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog());
  const [homeFoodLog, setHomeFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog(todayKey));
  const [foodLogError, setFoodLogError] = useState<string | null>(null);
  const [isSavingLogEntry, setIsSavingLogEntry] = useState(false);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  // Water drunk over the last three months (and any older day shown on Today).
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterBusy, setWaterBusy] = useState(false);
  const [plannedExerciseEntries, setPlannedExerciseEntries] = useState<PlannedExerciseEntry[]>([]);
  const [plannedWorkoutSessions, setPlannedWorkoutSessions] = useState<PlannedWorkoutSession[]>([]);
  const [plannedExerciseTitleDraft, setPlannedExerciseTitleDraft] = useState('Swim');
  const [plannedExerciseMinutesDraft, setPlannedExerciseMinutesDraft] = useState('55');
  const [plannedExerciseWarmupEnabled, setPlannedExerciseWarmupEnabled] = useState(false);
  const [plannedExerciseWarmupMinutesDraft, setPlannedExerciseWarmupMinutesDraft] = useState('10');
  const [plannedExerciseCooldownEnabled, setPlannedExerciseCooldownEnabled] = useState(false);
  const [plannedExerciseCooldownMinutesDraft, setPlannedExerciseCooldownMinutesDraft] = useState('8');
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
  const [mealPlanEatenSlots, setMealPlanEatenSlots] = useState<Record<string, Record<string, string>>>({});
  // Inline edit/delete of logged food and exercise. Delete asks for a second tap.
  const [editingFoodEntryId, setEditingFoodEntryId] = useState<string | null>(null);
  const [editingFoodGramsDraft, setEditingFoodGramsDraft] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [profileResetting, setProfileResetting] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [garminStatus, setGarminStatus] = useState<GarminStatus | null>(null);
  const [garminSyncing, setGarminSyncing] = useState(false);
  const [garminNote, setGarminNote] = useState<string | null>(null);
  const garminSyncingRef = useRef(false);
  // The session a Garmin request belongs to (stale replies are dropped after sign-out), and the
  // last sync time whose workouts are on screen (the server also syncs on its own).
  const garminTokenRef = useRef<string | null>(null);
  const garminSeenSyncRef = useRef<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [entryActionBusyKey, setEntryActionBusyKey] = useState<string | null>(null);
  const [mealPlanTone, setMealPlanTone] = useState<'checking' | 'live'>('checking');
  const [mealPlanStatus, setMealPlanStatus] = useState('Loading meal plan');
  const [mealPlanError, setMealPlanError] = useState<string | null>(null);
  const [mealPrepTasks, setMealPrepTasks] = useState<MealPrepTask[]>([]);
  const [mealPrepTone, setMealPrepTone] = useState<'checking' | 'live'>('checking');
  const [mealPrepStatus, setMealPrepStatus] = useState('Loading meal prep');
  const [mealPrepError, setMealPrepError] = useState<string | null>(null);
  const activePlannedExercisePreset = useMemo(() => selectExercisePreset(plannedExerciseTitleDraft), [plannedExerciseTitleDraft]);
  const plannedExerciseDurationValue = Number(plannedExerciseMinutesDraft);
  const estimatedPlannedExerciseCalories = useMemo(
    () =>
      Number.isFinite(plannedExerciseDurationValue) && plannedExerciseDurationValue > 0
        ? estimatePlannedExerciseCalories(plannedExerciseDurationValue, activePlannedExercisePreset)
        : 0,
    [activePlannedExercisePreset, plannedExerciseDurationValue]
  );
  const [plannedExerciseSaving, setPlannedExerciseSaving] = useState(false);
  const [plannedExerciseUpdatingId, setPlannedExerciseUpdatingId] = useState<string | null>(null);
  const [plannedExerciseEditingId, setPlannedExerciseEditingId] = useState<string | null>(null);
  const [plannedExerciseDeletingId, setPlannedExerciseDeletingId] = useState<string | null>(null);
  const [mealPrepSavingId, setMealPrepSavingId] = useState<string | null>(null);

  function resetPreviewProfileDrafts() {
    setProfileDisplayNameDraft('');
    setProfileTimezoneDraft('UTC');
    setProfileUnitsDraft('imperial');
    setOnboardingSexDraft(null);
    setOnboardingAgeDraft('34');
    setOnboardingHeightFeetDraft('5');
    setOnboardingHeightInchesDraft('10');
    setOnboardingCurrentWeightDraft('180');
    setOnboardingGoalTypeDraft(null);
    setOnboardingGoalPaceDraft('recommended');
    setOnboardingTargetWeightDraft('');
    setOnboardingActivityLevelDraft('sedentary');
    setOnboardingDietaryPatternDraft(null);
    setOnboardingNutritionStyleDraft(null);
    setOnboardingAllergySelectionsDraft(['none']);
    setOnboardingAllergyOtherDraft('');
    setOnboardingCalorieFloorDraft('recommended');
    setOnboardingMealStyleDraft('balanced');
    setFloorAnsweredPaces([]);
    setActiveExplainer(null);
    setExplainersSeen([]);
    setOnboardingStep('welcome');
  }

  function applyProfileDrafts(loadedProfile: UserProfile, goals: UserGoal[] = []) {
    const { feet, inches } = splitHeightCm(loadedProfile.height_cm);
    setProfileDisplayNameDraft(loadedProfile.display_name ?? '');
    setProfileTimezoneDraft(loadedProfile.timezone);
    setProfileUnitsDraft(loadedProfile.units);
    // Setup leaves choices unselected until the user picks; saved answers fill in.
    setOnboardingSexDraft(loadedProfile.sex ?? null);
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
    if (!loadedProfile.setup_complete) {
      // First-time setup starts empty, with "e.g." hints, not sample values that look filled in.
      // That includes the name: never prefill it from the sign-in (Tailscale today, maybe an
      // App Store sign-in later); the user types what they want to be called.
      setProfileDisplayNameDraft('');
      const unitsForSetup = defaultUnitSystemForLocale(deviceLocale());
      setOnboardingUnitsDraft(unitsForSetup);
      setOnboardingHeightCmDraft('');
      if (loadedProfile.age_years === null || loadedProfile.age_years === undefined) {
        setOnboardingAgeDraft('');
      }
      if (loadedProfile.height_cm === null || loadedProfile.height_cm === undefined) {
        setOnboardingHeightFeetDraft('');
        setOnboardingHeightInchesDraft('');
      }
      if (loadedProfile.current_weight_lbs === null || loadedProfile.current_weight_lbs === undefined) {
        setOnboardingCurrentWeightDraft('');
      }
    }
    setOnboardingGoalTypeDraft(loadedProfile.goal_type ?? null);
    setOnboardingGoalPaceDraft(loadedProfile.goal_pace ?? DEFAULT_PACE[loadedProfile.goal_type ?? 'lose']);
    setOnboardingTargetWeightDraft(
      loadedProfile.target_weight_lbs !== null && loadedProfile.target_weight_lbs !== undefined
        ? String(loadedProfile.target_weight_lbs)
        : ''
    );
    // New setups start at Sedentary, so the activity bar starts short and grows with the slider.
    setOnboardingActivityLevelDraft(loadedProfile.activity_level ?? 'sedentary');
    setOnboardingDietaryPatternDraft(loadedProfile.dietary_pattern ?? null);
    setOnboardingNutritionStyleDraft(loadedProfile.nutrition_style ?? null);
    const savedStyle =
      loadedProfile.meal_pattern_chosen && (loadedProfile.meals_per_day ?? 3) === 3
        ? styleForSplit(3, loadedProfile.meal_split ?? [])
        : null;
    savedMealStyleRef.current = savedStyle;
    setOnboardingMealStyleDraft(savedStyle ?? 'balanced');
    const parsedAllergies = parseAllergySelection(loadedProfile.allergy_notes);
    setOnboardingAllergySelectionsDraft(parsedAllergies.selected);
    setOnboardingAllergyOtherDraft(parsedAllergies.otherText);
    setOnboardingCalorieFloorDraft(loadedProfile.calorie_floor ?? 'recommended');
    setFloorAnsweredPaces([]);
    setActiveExplainer(null);
    setExplainersSeen([]);
    setOnboardingStep('welcome');

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
      setOwnerAccess('checking');
      setEntryBackendTone('checking');
      setEntryBackendStatus('Checking backend reachability');
      setEntryBackendDetail(`Using ${getApiBaseUrl()}`);
      const tailnetHint = isTailnetHost(
        getApiBaseUrl(),
        typeof window !== 'undefined' ? window.location?.href : undefined
      );

      let health: Awaited<ReturnType<typeof fetchBackendHealth>> | null = null;
      try {
        health = await fetchBackendHealth();
      } catch {
        health = null;
      }
      if (cancelled) {
        return;
      }

      let ownerSessionFound = false;
      let ownerError: string | null = null;
      if (health) {
        setEntryBackendTone('live');
        setEntryBackendStatus(`${health.service} reachable`);
        setEntryBackendDetail(`${getApiBaseUrl()} responded at ${new Date(health.timestamp).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })}`);
        try {
          ownerSessionFound = (await fetchOwnerSession()) !== null;
        } catch (error) {
          ownerError = error instanceof Error ? error.message : 'Sign-in check failed.';
        }
        if (cancelled) {
          return;
        }

        // Local development sign-in: reuse a remembered session if the server still accepts it.
        const storedToken = !ownerSessionFound && health.auth_mode !== 'tailscale' ? loadStoredSessionToken() : null;
        if (storedToken) {
          let restored = false;
          try {
            restored = (await fetchCurrentSession(storedToken)) !== null;
          } catch {
            restored = false;
          }
          if (cancelled) {
            return;
          }
          if (restored && entryModeRef.current === null) {
            setOwnerAccess('signin');
            setOwnerAccessMessage(null);
            setProfileLoaded(false);
            setFoodSessionToken(storedToken);
            setEntryMode('live');
            return;
          }
          if (!restored) {
            clearStoredSessionToken();
          }
        }
      } else {
        setEntryBackendTone('checking');
        setEntryBackendStatus(tailnetHint ? 'Relish unreachable' : 'Backend unavailable for live profile mode');
        setEntryBackendDetail(
          tailnetHint
            ? `Could not reach ${getApiBaseUrl()}.`
            : IS_DEVELOPMENT_BUILD
              ? `Could not reach ${getApiBaseUrl()}. Start the backend on port 8000 or set EXPO_PUBLIC_API_BASE_URL in frontend/.env.`
              : `Could not reach ${getApiBaseUrl()}.`
        );
      }

      const decision = resolveOwnerAccess({
        healthReachable: health !== null,
        healthAuthMode: health?.auth_mode ?? null,
        ownerSessionFound,
        ownerError,
        tailnetHint
      });
      if (decision.access === 'owner') {
        setOwnerAccess('signin');
        setOwnerAccessMessage(null);
        // Never pull the user out of a mode they already chose (for example preview).
        if (entryModeRef.current === null) {
          setProfileLoaded(false);
          setFoodSessionToken(OWNER_SESSION_TOKEN);
          setEntryMode('live');
        }
        return;
      }
      setOwnerAccess(decision.access);
      setOwnerAccessMessage(decision.message);
    }

    void checkEntryBackend();

    return () => {
      cancelled = true;
    };
  }, [ownerCheckNonce]);

  useEffect(() => {
    entryModeRef.current = entryMode;
  }, [entryMode]);

  useEffect(() => {
    registerServiceWorker(Platform.OS, IS_DEVELOPMENT_BUILD);
  }, []);

  // A new deploy: iOS resumes the home-screen app from memory, so check on returning to it and
  // reload when nothing is in progress (else as soon as it is done). See src/lib/app-update.ts.
  // Only Today and Trends reload by themselves: other screens (Profile, Settings, Plan, Foods)
  // can hold unsaved edits, so an update waits until you're back on one of these two.
  const appBusy =
    (section !== 'dashboard' && section !== 'trends') ||
    profile === null ||
    settingsFloorWarning ||
    openSheet !== null ||
    weighInOpen ||
    createPlanOpen ||
    suggestOpen ||
    quickScanOpen ||
    workoutDetailId !== null ||
    editingFoodEntryId !== null ||
    (profile !== null && !profile.setup_complete);
  const appBusyRef = useRef(appBusy);
  appBusyRef.current = appBusy;
  const [updatePending, setUpdatePending] = useState(false);
  // Shopping-list ticks made without signal: retried in the background until saved.
  useEffect(() => {
    if (!foodSessionToken) {
      return;
    }
    const token = foodSessionToken;
    const retry = () => {
      if (pendingShoppingTicks() > 0) {
        void flushShoppingTicks(token);
      }
    };
    retry();
    const timer = setInterval(retry, 20_000);
    window.addEventListener('online', retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', retry);
    };
  }, [foodSessionToken]);
  // A tapped reminder: the service worker brings the app forward and asks for Today (never a
  // reload, so nothing in progress is lost; when something is open, the app just stays put).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    if (typeof window !== 'undefined' && window.location.search.includes('water=1')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'relish-open' && !appBusyRef.current) {
        setSection('dashboard');
        setSelectedHomeDate(localDateKey());
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || IS_DEVELOPMENT_BUILD || typeof document === 'undefined') {
      return;
    }
    const loaded = loadedBundleHash();
    if (!loaded) {
      return;
    }
    let lastCheck = 0;
    const check = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS) {
        return;
      }
      lastCheck = Date.now();
      const decision = updateDecision(loaded, await latestBundleHash(), appBusyRef.current || isTyping());
      if (decision === 'reload') {
        window.location.reload();
      } else if (decision === 'wait') {
        setUpdatePending(true);
      }
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const hourly = setInterval(check, 60 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      clearInterval(hourly);
    };
  }, []);
  useEffect(() => {
    if (!updatePending || appBusy) {
      return;
    }
    // Done with what was in progress: reload once the user isn't typing.
    const timer = setInterval(() => {
      if (!appBusyRef.current && !isTyping()) {
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [updatePending, appBusy]);

  useEffect(() => {
    // A home-screen app can stay open across midnight; refresh "today" when it comes back.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTodayKey(localDateKey());
      }
    });
    return () => subscription.remove();
  }, []);

  const [sessionRejected, setSessionRejected] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => setSessionRejected(true));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!sessionRejected) {
      return;
    }
    setSessionRejected(false);
    // Preview mode has no session; its 401s are expected and must not end preview.
    if (entryModeRef.current !== 'live') {
      return;
    }
    if (isOwnerSession) {
      // The server stopped recognizing this device (for example Tailscale went off):
      // go back to the launch check, which shows the Connect Tailscale card.
      setFoodSessionToken(null);
      setProfileLoaded(false);
      setEntryMode(null);
      setOwnerCheckNonce((nonce) => nonce + 1);
      return;
    }
    logoutToEntryScreen();
    setEntryError('Your session expired. Sign in again.');
  }, [sessionRejected, isOwnerSession]);

  useEffect(() => {
    if (ownerAccess !== 'blocked') {
      return;
    }
    // Re-check when the user comes back to the app, for example after turning on Tailscale.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setOwnerCheckNonce((nonce) => nonce + 1);
      }
    });
    return () => subscription.remove();
  }, [ownerAccess]);

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
        const [favorites, bank] = await Promise.all([fetchFavoriteFoods(foodSessionToken), fetchFoodBank(foodSessionToken)]);
        if (cancelled) {
          return;
        }

        const liveFavorites = sortFoodsForPicker(favorites.map((food) => ({ ...food, favorite: true })));
        const liveBank = sortFoodsForPicker(bank);
        setFavoriteFoods(liveFavorites);
        setBankFoods(liveBank);
        setFoodResults((current) => (foodSearchTerm.trim() ? current : liveBank.length > 0 ? liveBank : liveFavorites));
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
        setRecipeImportTone('checking');
        setRecipeImportStatus('Preview mode active');
        setRecipeImportError(null);
        return;
      }

      setRecipeImportTone('checking');
      setRecipeImportStatus('Loading live dashboard summary');
      setRecipeImportError(null);

      try {
        await Promise.all([
          fetchBackendHealth(),
          fetchWeeklyMetrics(foodSessionToken)
        ]);
        if (cancelled) {
          return;
        }

        setRecipeImportTone('live');
        setRecipeImportStatus('No imported recipe selected yet');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecipeImportTone('checking');
        setRecipeImportStatus('Live recipe import unavailable');
        setRecipeImportError(error instanceof Error ? error.message : 'Recipe import unavailable.');
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
        const isPreview = entryMode === 'preview';
        setProfileLoaded(true);
        setProfile(null);
        setProfileGoals([]);
        setWeightEntries(fallbackForMode(entryMode, demoWeightEntries, []));
        resetPreviewProfileDrafts();
        setProfileTone('checking');
        setProfileStatus(isPreview ? 'Preview profile loaded' : 'Profile unavailable');
        setProfileError(
          isPreview ? 'No active profile session. Showing preview progress data.' : 'No active profile session. Sign in again.'
        );
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
        setWeightEntries([]);
        resetPreviewProfileDrafts();
        setProfileTone('checking');
        setProfileStatus('Profile unavailable');
        setProfileError(liveLoadErrorMessage(error, 'Profile'));
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
    if (selectedHomeDate === todayKey) {
      setHomeFoodLog(foodLog);
      return;
    }
    if (entryMode === null) {
      return;
    }

    let cancelled = false;

    async function loadSelectedHomeFoodLog() {
      if (!foodSessionToken) {
        setHomeFoodLog(createEmptyFoodLog(selectedHomeDate));
        return;
      }

      try {
        const log = await fetchFoodLogForDate(selectedHomeDate, foodSessionToken);
        if (!cancelled) {
          setHomeFoodLog(log);
        }
      } catch {
        if (!cancelled) {
          setHomeFoodLog(createEmptyFoodLog(selectedHomeDate));
        }
      }
    }

    void loadSelectedHomeFoodLog();

    return () => {
      cancelled = true;
    };
  }, [entryMode, foodLog, foodSessionToken, selectedHomeDate, todayKey]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadTrackerSections() {
      if (!foodSessionToken) {
        const isPreview = entryMode === 'preview';
        const fallbackSessions = isPreview ? buildDemoPlannedWorkoutSessions(demoPlannedExerciseEntries) : [];
        setExerciseEntries(fallbackForMode(entryMode, demoExerciseEntries, []));
        setPlannedWorkoutSessions(fallbackSessions);
        setPlannedExerciseEntries(sortPlannedExerciseEntries(fallbackSessions.map(mapPlannedWorkoutSessionToEntry)));
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

      setMealPlanTone('checking');
      setMealPlanStatus('Loading meal plan');
      setMealPlanError(null);
      setMealPrepTone('checking');
      setMealPrepStatus('Loading meal prep');
      setMealPrepError(null);

      try {
        const [exercise, plannedWorkoutSessionItems, mealPlan, mealPrep] = await Promise.all([
          fetchExerciseEntries(foodSessionToken),
          fetchPlannedWorkoutSessions(foodSessionToken),
          fetchMealPlanDays(foodSessionToken),
          fetchMealPrepTasks(foodSessionToken)
        ]);

        if (cancelled) {
          return;
        }

        setExerciseEntries(exercise);
        setPlannedWorkoutSessions(plannedWorkoutSessionItems);
        setPlannedExerciseEntries(sortPlannedExerciseEntries(plannedWorkoutSessionItems.map(mapPlannedWorkoutSessionToEntry)));

        setMealPlanDays(mealPlan);
        setMealPlanEatenSlots(
          Object.fromEntries(
            mealPlan.map((day) => [
              day.id,
              Object.fromEntries(
                day.slots
                  .filter((slot) => Boolean(slot.eaten_at))
                  .map((slot) => [slot.id, slot.eaten_at as string])
              ),
            ])
          )
        );
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
        setPlannedExerciseEntries([]);
        setPlannedWorkoutSessions([]);
        setMealPlanDays([]);
        setSelectedMealPlanDate(null);
        setMealPlanEatenSlots({});
        setMealPrepTasks([]);
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

  // Trends: load the range's food logs when the page shows, the range changes, or today's log changes.
  useEffect(() => {
    if (section === 'trends') {
      void loadTrendLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, trendRange, foodSessionToken, foodLog, todayKey]);

  // Garmin: check on open and whenever the app comes back to the screen; sync if stale.
  useEffect(() => {
    if (!foodSessionToken) {
      setGarminStatus(null);
      return;
    }
    const token = foodSessionToken;
    garminTokenRef.current = token;
    garminSeenSyncRef.current = null;
    let cancelled = false;
    async function check() {
      try {
        const status = await fetchGarminStatus(token);
        if (cancelled) {
          return;
        }
        setGarminStatus(status);
        if (garminSyncIsStale(status, new Date())) {
          await runGarminSync(token);
        } else {
          await showGarminWorkoutsSince(token, status.last_success_at);
        }
      } catch {
        // Status is optional; Settings shows "Checking…" until it loads.
      }
    }
    void check();
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void check();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      cancelled = true;
      garminTokenRef.current = null;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [foodSessionToken]);

  useEffect(() => {
    if (entryMode === null) {
      return;
    }
    let cancelled = false;

    async function loadFoodLog() {
      setFoodLogError(null);

      if (!foodSessionToken) {
        const isPreview = entryMode === 'preview';
        setFoodLog(fallbackForMode(entryMode, demoFoodLog, createEmptyFoodLog()));
        setFoodLogError(
          isPreview ? 'No active food session. Showing preview daily log.' : 'No active food session. Sign in again.'
        );
        return;
      }

      try {
        const log = await fetchTodaysFoodLog(foodSessionToken);

        if (cancelled) {
          return;
        }

        setFoodLog(log);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFoodLog(createEmptyFoodLog());
        setFoodLogError(liveLoadErrorMessage(error, 'Daily log'));
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
        const shown = bankFoods.length > 0 ? sortFoodsForPicker(bankFoods) : liveFavorites;
        setFoodResults(shown);
        setSelectedFoodId((current) => selectFoodById(shown, current)?.id ?? shown[0]?.id ?? '');
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
  }, [bankFoods, favoriteFoods, foodSearchTerm, foodSessionToken]);

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

    async function loadRecipeFavorites() {
      setRecipeLoading(true);
      setRecipeTone('checking');
      setRecipeStatus('Loading recipe favorites');
      setRecipeError(null);

      try {
        if (!foodSessionToken) {
          throw new Error('No active recipe session.');
        }
        const [catalog, favorites] = await Promise.all([fetchRecipes(foodSessionToken), fetchFavoriteRecipes(foodSessionToken)]);

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
    const fallbackDisplayName =
      email.split('@')[0]?.trim().replace(/[._-]+/g, ' ') || 'Local User';
    const displayName = entryIntent === 'signin' ? (entryDisplayNameDraft.trim() || fallbackDisplayName) : entryDisplayNameDraft.trim();

    if (!email || (entryIntent !== 'signin' && !displayName)) {
      setEntryEmailError(
        entryIntent === 'signin'
          ? 'Enter your email before continuing.'
          : 'Enter an email and display name before creating a local profile session.'
      );
      setEntryError(null);
      return;
    }

    setEntryLoading(true);
    setEntryEmailError(null);
    setEntryError(null);
    setProfileLoaded(false);

    try {
      const session = await createLocalSession(email, displayName, entryIntent ?? 'signup');
      setFoodSessionToken(session.access_token);
      storeSessionToken(session.access_token);
      setEntryMode('live');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('That email already has a profile. Sign in instead.') ||
        message.includes('No profile found for that email. Sign up instead.')
      ) {
        setEntryEmailError(message);
        setEntryError(null);
        return;
      }
      const fallbackMessage = `Unable to create a local profile session via ${getApiBaseUrl()}. Start the backend or set EXPO_PUBLIC_API_BASE_URL in frontend/.env.`;
      setEntryError(error instanceof Error ? `${error.message} ${fallbackMessage}` : fallbackMessage);
    } finally {
      setEntryLoading(false);
    }
  }

  function enterPreviewMode() {
    setFoodSessionToken(null);
    setEntryEmailError(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setEntryIntent(null);
    setEntryMode('preview');
  }

  function returnToEntryScreen() {
    clearStoredSessionToken();
    setFoodSessionToken(null);
    setEntryEmailError(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setEntryIntent(null);
    setEntryMode(null);
  }

  function logoutToEntryScreen() {
    clearStoredSessionToken();
    setFoodSessionToken(null);
    setEntryEmailError(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setOpenSheet(null);
    setEntryIntent(null);
    setEntryMode(null);
    setEntryBackendStatus('Ready to create a new local profile session');
    setEntryBackendDetail(`Using ${getApiBaseUrl()}`);
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
        const recipe = await fetchRecipe(selectedRecipeId, foodSessionToken);

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
  }, [foodSessionToken, recipeCatalog, recipeFavorites, selectedRecipeId]);

  const selectedFood = useMemo(
    () => selectFoodById(foodResults, selectedFoodId),
    [foodResults, selectedFoodId]
  );
  const sortedMealPlanDays = useMemo(() => sortMealPlanDaysByDate(mealPlanDays), [mealPlanDays]);
  const selectedMealPlanDay = useMemo(
    () => selectMealPlanDay(sortedMealPlanDays, selectedMealPlanDate),
    [selectedMealPlanDate, sortedMealPlanDays]
  );
  const latestProfileGoal = useMemo(() => profileGoals[0] ?? null, [profileGoals]);
  const homeCompletedExerciseEntries = useMemo(
    () => exerciseEntries.filter((entry) => entry.logged_on === selectedHomeDate),
    [exerciseEntries, selectedHomeDate]
  );
  const homePlannedExerciseEntries = useMemo(
    () => plannedExerciseEntries.filter((entry) => entry.planned_on === selectedHomeDate),
    [plannedExerciseEntries, selectedHomeDate]
  );
  const homeMealPlanDay = useMemo(
    () => sortedMealPlanDays.find((day) => day.plan_date === selectedHomeDate) ?? null,
    [selectedHomeDate, sortedMealPlanDays]
  );
  // Planned items still open (a completed workout shows as recorded; an eaten meal as logged).
  const homeOpenPlannedWorkouts = useMemo(
    () => homePlannedExerciseEntries.filter((entry) => !entry.completed_at),
    [homePlannedExerciseEntries]
  );
  const homeMealPlanEatenSlots = useMemo(
    () => (homeMealPlanDay ? mealPlanEatenSlots[homeMealPlanDay.id] ?? {} : {}),
    [homeMealPlanDay, mealPlanEatenSlots]
  );
  const dailyHomeTargets = useMemo(
    () =>
      buildDailyTargetSummary({
        goal: latestProfileGoal,
        profile,
        foodLog: homeFoodLog,
        exerciseEntries: homeCompletedExerciseEntries,
        workoutCaloriesShare: profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE
      }),
    [homeCompletedExerciseEntries, homeFoodLog, latestProfileGoal, profile]
  );
  // "today", or the weekday in the display language (the sheets' Add buttons read it).
  const homeDayName =
    selectedHomeDate === todayKey ? 'today' : formatDate(new Date(`${selectedHomeDate}T00:00:00`), { weekday: 'long' }, t.locale);
  const homeMealGroups = useMemo(() => groupByMeal(homeFoodLog.entries, t), [homeFoodLog.entries, t]);
  const trendStart = rangeStart(todayKey, trendRange);
  const trendUnit = profile?.units === 'metric' ? 'kg' : 'lb';
  const trendDays = useMemo(
    () =>
      buildDaySeries({
        start: trendStart,
        today: todayKey,
        logs: trendLogs,
        exercise: exerciseEntries,
        calorieTarget: dailyHomeTargets.calorieTarget,
        sharePercent: profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE,
        macroTargets: dailyHomeTargets.macroTargets,
        fatShare: fatShareFor(profile?.goal_type, profile?.goal_pace)
      }),
    [trendStart, todayKey, trendLogs, exerciseEntries, dailyHomeTargets.calorieTarget, dailyHomeTargets.macroTargets, profile?.workout_calories_share, profile?.goal_type, profile?.goal_pace]
  );
  const trendCalories = useMemo(() => calorieSummary(trendDays), [trendDays]);
  const homeWaterToday = useMemo(() => waterForDay(waterEntries, selectedHomeDate), [waterEntries, selectedHomeDate]);
  const homeWaterMl = homeWaterToday.reduce((sum, entry) => sum + entry.amount_ml, 0);
  const trendWaterDays = useMemo(() => waterDays(trendStart, todayKey, waterEntries), [trendStart, todayKey, waterEntries]);
  // Load water for three months back (and any older day shown on Today).
  const waterStart = selectedHomeDate < rangeStart(todayKey, '3M') ? selectedHomeDate : rangeStart(todayKey, '3M');
  const waterEnd = selectedHomeDate > todayKey ? selectedHomeDate : todayKey;
  useEffect(() => {
    if (!foodSessionToken) {
      return;
    }
    let cancelled = false;
    fetchWater(waterStart, waterEnd, foodSessionToken)
      .then((entries) => {
        if (!cancelled) {
          setWaterEntries(entries);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [foodSessionToken, waterStart, waterEnd]);
  const trendMacroDays = useMemo(
    () => ({
      protein: macroDays(trendDays, 'protein'),
      carbs: macroDays(trendDays, 'carbs'),
      fat: macroDays(trendDays, 'fat')
    }),
    [trendDays]
  );
  const trendWeightPoints = useMemo(() => weightTrend(weightEntries), [weightEntries]);
  const trendWeight = useMemo(() => {
    const toUnit = (lbs: number) => (trendUnit === 'kg' ? Math.round(lbs * 0.45359237 * 10) / 10 : Math.round(lbs * 10) / 10);
    const inRange = trendWeightPoints.filter((point) => point.date >= trendStart);
    const last = trendWeightPoints.at(-1) ?? null;
    // From about a week before the last weigh-in, using the whole history when the range is short.
    const rate = (inRange.length >= 2 ? weeklyRate(inRange) : null) ?? weeklyRate(trendWeightPoints);
    const goal = profile?.target_weight_lbs ?? null;
    return {
      latest: last ? toUnit(last.trend) : null,
      rate: rate === null ? null : toUnit(rate),
      toGoal: last && goal ? Math.abs(Math.round((toUnit(last.trend) - toUnit(goal)) * 10) / 10) : null
    };
  }, [trendWeightPoints, trendStart, trendUnit, profile?.target_weight_lbs]);
  // Where the weight is heading: the trend carried forward (with a week of weigh-ins) and the
  // planned pace from the calorie target and the daily burn.
  const trendProjection = useMemo(() => {
    const toUnit = (lbs: number) => (trendUnit === 'kg' ? Math.round(lbs * 0.45359237 * 10) / 10 : Math.round(lbs * 10) / 10);
    const last = trendWeightPoints.at(-1) ?? null;
    const trendRate = projectableRate(trendWeightPoints);
    const paceRate = plannedWeeklyChange(dailyHomeTargets.calorieTarget, profile?.tdee_calories);
    const goal = profile?.target_weight_lbs ?? null;
    const days = HORIZON_DAYS[weightHorizon];
    const from = last ? { date: last.date, weight: last.trend } : null;
    const shortDate = (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(date.slice(0, 4) !== todayKey.slice(0, 4) ? { year: 'numeric' as const } : {})
      });
    const signed = (lbs: number) => {
      const value = toUnit(lbs);
      return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value)}`;
    };
    const direction = profile?.goal_type ?? null;
    const lines: string[] = [];
    if (from && trendRate !== null) {
      const horizonEnd = addDaysToDateKey(todayKey, days);
      const ahead = Math.max(0, Math.round((Date.parse(`${horizonEnd}T00:00:00Z`) - Date.parse(`${from.date}T00:00:00Z`)) / 86400000));
      const reach = goalDate(from, trendRate, goal, direction);
      lines.push(
        `At your current trend: ${toUnit(from.weight + (trendRate * ahead) / 7)} ${trendUnit} by ${shortDate(horizonEnd)}` +
          (goal !== null ? ` · goal ${reach ? (reach <= todayKey ? 'reached' : `by ${shortDate(reach)}`) : 'not at this rate'}` : '')
      );
    } else if (from) {
      const reach = paceRate !== null ? goalDate(from, paceRate, goal, direction) : null;
      lines.push(`Weigh in for about a week to see where your trend is heading${reach ? ` · at your planned pace, goal by ${shortDate(reach)}` : ''}`);
    }
    const status = paceStatus(trendRate, paceRate);
    if (status && trendRate !== null && paceRate !== null) {
      const rates = `${signed(trendRate)} vs ${signed(paceRate)} ${trendUnit} a week`;
      lines.push(
        status === 'on'
          ? `On pace (${rates})`
          : status === 'ahead'
            ? `Ahead of pace (${rates})`
            : status === 'behind'
              ? `Behind pace (${rates})`
              : `Drifting ${signed(trendRate)} ${trendUnit} a week (planned: steady)`
      );
    }
    return { trendRate, paceRate, days, lines, status };
  }, [trendWeightPoints, dailyHomeTargets.calorieTarget, profile?.tdee_calories, profile?.target_weight_lbs, profile?.goal_type, weightHorizon, trendUnit, todayKey]);
  const homeOpenPlannedMeals = useMemo(
    () => (homeMealPlanDay ? homeMealPlanDay.slots.filter((slot) => !homeMealPlanEatenSlots[slot.id]) : []),
    [homeMealPlanDay, homeMealPlanEatenSlots]
  );
  const homeCalorieBudget = useMemo(
    () =>
      buildCalorieBudget({
        summary: dailyHomeTargets,
        sharePercent: profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE,
        bmrCalories: profile?.bmr_calories,
        maintenanceCalories: profile?.tdee_calories,
        workouts: homeCompletedExerciseEntries,
        t
      }),
    [dailyHomeTargets, homeCompletedExerciseEntries, profile, t]
  );
  const homeConsumedMacros = homeFoodLog.totals.macros;
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
  const onboardingRequired = profileLoaded && profile !== null && profile.setup_complete === false;
  const [launchHoldDone, setLaunchHoldDone] = useState(false);
  useEffect(() => {
    if (launchHoldDone || !profileLoaded) {
      return;
    }
    const remaining = splashHoldRemaining({ elapsedMs: msSinceLaunch(), firstTimeSetup: onboardingRequired });
    if (remaining === 0) {
      setLaunchHoldDone(true);
      return;
    }
    const timer = setTimeout(() => setLaunchHoldDone(true), remaining);
    return () => clearTimeout(timer);
  }, [launchHoldDone, onboardingRequired, profileLoaded]);

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
      setFoodLogError('Choose a valid quantity before adding.');
      return;
    }

    setIsSavingLogEntry(true);
    setFoodLogError(null);

    try {
      if (!foodSessionToken) {
        throw new Error('Create a local session before saving food log entries.');
      }
      // The server works out calories from the food (quantity = number of servings).
      await logFood({ food_id: food.id, log_date: localDateKey(), servings: quantity }, foodSessionToken);
      setFoodLog(await fetchTodaysFoodLog(foodSessionToken));
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.add'));
    } finally {
      setIsSavingLogEntry(false);
    }
  }

  async function completeOnboardingSetup() {
    const age_years = Number(onboardingAgeDraft);
    const measurements = bodyMeasurementsFromDrafts(onboardingUnitsDraft, onboardingBodyDrafts());

    if (!Number.isFinite(age_years) || age_years <= 0 || measurements === null) {
      setOnboardingError('Enter a valid age, height, and weight before continuing.');
      return;
    }

    if (!foodSessionToken) {
      setOnboardingError('Create a live local session before continuing to the app.');
      return;
    }

    const allergy_notes = formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft);

    setOnboardingSaving(true);
    setOnboardingError(null);

    if (!onboardingSexDraft || !onboardingGoalTypeDraft || !onboardingDietaryPatternDraft || !onboardingNutritionStyleDraft) {
      setOnboardingSaving(false);
      setOnboardingError('Choose your sex, goal, how you eat, and nutrition style before creating your profile.');
      return;
    }

    try {
      const completed = await completeOnboarding(
        {
          sex: onboardingSexDraft,
          age_years: Math.round(age_years),
          height_cm: measurements.height_cm,
          current_weight_lbs: measurements.weight_lbs,
          goal_type: onboardingGoalTypeDraft,
          goal_pace: onboardingGoalPaceDraft,
          target_weight_lbs: onboardingGoalTypeDraft === 'maintain' ? null : onboardingTargetWeightLbs(),
          units: onboardingUnitsDraft,
          ...(deviceTimeZone() ? { timezone: deviceTimeZone() as string } : {}),
          activity_level: onboardingActivityLevelDraft,
          dietary_pattern: onboardingDietaryPatternDraft,
          nutrition_style: onboardingNutritionStyleDraft,
          allergy_notes,
          meal_split: mealStyleSplit(onboardingMealStyleDraft),
          calorie_floor: onboardingCalorieFloorDraft,
          display_name: profileDisplayNameDraft.trim() || null
        },
        foodSessionToken
      );
      setProfile(completed);

      const [loadedProfile, goals, , weights] = await Promise.all([
        fetchProfile(foodSessionToken),
        fetchUserGoals(foodSessionToken),
        fetchProfileProgress(foodSessionToken),
        fetchWeightEntries(foodSessionToken)
      ]);

      setProfile(loadedProfile);
      setProfileGoals(goals);
      setWeightEntries(weights);
      applyProfileDrafts(loadedProfile, goals);

      setProfileLoaded(true);
      setProfileTone('live');
      setProfileStatus('Onboarding completed');
      setOnboardingStep('review');
      setSection('dashboard');
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      setOnboardingSaving(false);
    }
  }

  function unmarkMealPlanSlot(slotId: string) {
    setMealPlanDays((days) =>
      days.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => (slot.id === slotId ? { ...slot, eaten_at: null } : slot))
      }))
    );
    setMealPlanEatenSlots((current) =>
      Object.fromEntries(
        Object.entries(current).map(([dayId, slots]) => [
          dayId,
          Object.fromEntries(Object.entries(slots).filter(([id]) => id !== slotId))
        ])
      )
    );
  }

  async function saveFoodEntryEdit(entry: FoodLogEntry) {
    const grams = Number(editingFoodGramsDraft);
    const payload = scaleEntryToGrams(entry, grams);
    if (!foodSessionToken || !foodLog.log_id) {
      setFoodLogError(t('today.errors.signInToEdit'));
      return;
    }
    if (!payload) {
      setFoodLogError(t('today.errors.gramsAboveZero'));
      return;
    }
    const key = `food:${entry.id}`;
    setEntryActionBusyKey(key);
    setFoodLogError(null);
    try {
      const updated = await updateFoodLogEntry(foodLog.log_id, entry.id, payload, foodSessionToken);
      setFoodLog(updated);
      setEditingFoodEntryId(null);
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.update'));
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  async function removeFoodEntry(entry: FoodLogEntry) {
    const key = `food:${entry.id}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    if (!foodSessionToken || !foodLog.log_id) {
      return;
    }
    setConfirmDeleteKey(null);
    setEntryActionBusyKey(key);
    setFoodLogError(null);
    try {
      const updated = await deleteFoodLogEntry(foodLog.log_id, entry.id, foodSessionToken);
      setFoodLog(updated);
      if (entry.meal_plan_slot_id) {
        unmarkMealPlanSlot(entry.meal_plan_slot_id);
      }
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.delete'));
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  // Only the latest request may set the logs (switching ranges quickly fires several).
  const trendRequestRef = useRef(0);

  async function loadTrendLogs() {
    const token = foodSessionToken;
    const request = ++trendRequestRef.current;
    if (!token) {
      setTrendLogs([]); // signed out: never show the previous account's history
      return;
    }
    try {
      const logs = await fetchFoodLogsBetween(rangeStart(todayKey, trendRange), todayKey, token);
      if (request === trendRequestRef.current) {
        setTrendLogs(logs);
        setTrendsError(null);
      }
    } catch (error) {
      if (request === trendRequestRef.current) {
        setTrendsError(error instanceof Error ? error.message : 'Unable to load your history.');
      }
    }
  }

  async function deleteTrendFood(log: FoodLogSummary, entry: FoodLogEntry) {
    const token = foodSessionToken;
    if (!token || !log.log_id) {
      return;
    }
    try {
      const updated = await deleteFoodLogEntry(log.log_id, entry.id, token);
      setTrendLogs((current) => current.map((item) => (item.date === log.date ? updated : item)));
      if (log.date === todayKey) {
        setFoodLog(updated);
      } else if (log.date === selectedHomeDate) {
        setHomeFoodLog(updated);
      }
      if (entry.meal_plan_slot_id) {
        unmarkMealPlanSlot(entry.meal_plan_slot_id);
      }
    } catch (error) {
      setTrendsError(error instanceof Error ? error.message : 'Unable to delete this entry.');
    }
  }

  /** The tab bar's scale: save today's weight, refresh progress, and say so briefly. */
  async function saveQuickWeighIn(weightLbs: number) {
    const token = foodSessionToken;
    if (!token) {
      return;
    }
    const units = profile?.units === 'metric' ? 'metric' : 'imperial';
    const value = units === 'metric' ? Math.round(weightLbs * 0.45359237 * 10) / 10 : weightLbs;
    const shown = `${formatNumber(value, { maximumFractionDigits: 1, useGrouping: false }, t.locale)} ${units === 'metric' ? 'kg' : 'lb'}`;
    try {
      await createWeightEntry({ recorded_at: todayKey, weight_lbs: weightLbs }, token);
      const [, weights] = await Promise.all([fetchProfileProgress(token), fetchWeightEntries(token)]);
      setWeightEntries(weights);
      setToast(t('weighIn.saved', { weight: shown }));
    } catch (error) {
      setToast(error instanceof Error ? t('weighIn.saveFailed', { message: error.message }) : t('weighIn.saveFailedGeneric'));
    }
    setTimeout(() => setToast(null), 3000);
  }

  /** Reload the chosen day's food after adding to it (today's log feeds the rest of the app). */
  async function refreshHomeFoodLog() {
    const token = foodSessionToken;
    if (!token) {
      return;
    }
    try {
      if (selectedHomeDate === todayKey) {
        setFoodLog(await fetchTodaysFoodLog(token));
      } else {
        setHomeFoodLog(await fetchFoodLogForDate(selectedHomeDate, token));
      }
    } catch {
      // The Meals list catches up on the next load.
    }
  }

  /** Food bank: take a food out of your bank (tap ✕, then again). Logged days keep it. */
  async function removeFromBank(food: FoodItem) {
    const key = `bank:${food.id}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    setConfirmDeleteKey(null);
    if (!foodSessionToken) {
      return;
    }
    try {
      await removeFoodFromBank(food.id, foodSessionToken);
      setFoodResults((current) => current.filter((item) => item.id !== food.id));
      setBankFoods((current) => current.filter((item) => item.id !== food.id));
    } catch (error) {
      setFoodError(error instanceof Error ? error.message : 'Unable to remove this food.');
    }
  }

  /** Today page: delete a food from the chosen day (tap ✕, then tap again to confirm). */
  /** Today page: change a logged food's amount (grams) on the day shown. */
  async function saveHomeFoodEntryEdit(entry: FoodLogEntry) {
    if (selectedHomeDate === todayKey) {
      await saveFoodEntryEdit(entry);
      return;
    }
    const payload = scaleEntryToGrams(entry, Number(editingFoodGramsDraft));
    if (!foodSessionToken || !homeFoodLog.log_id) {
      setFoodLogError(t('today.errors.signInToEdit'));
      return;
    }
    if (!payload) {
      setFoodLogError(t('today.errors.gramsAboveZero'));
      return;
    }
    const key = `food:${entry.id}`;
    setEntryActionBusyKey(key);
    setFoodLogError(null);
    try {
      setHomeFoodLog(await updateFoodLogEntry(homeFoodLog.log_id, entry.id, payload, foodSessionToken));
      setEditingFoodEntryId(null);
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.update'));
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  async function removeHomeFoodEntry(entry: FoodLogEntry) {
    if (selectedHomeDate === todayKey) {
      await removeFoodEntry(entry);
      return;
    }
    const key = `food:${entry.id}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    if (!foodSessionToken || !homeFoodLog.log_id) {
      return;
    }
    setConfirmDeleteKey(null);
    setEntryActionBusyKey(key);
    try {
      setHomeFoodLog(await deleteFoodLogEntry(homeFoodLog.log_id, entry.id, foodSessionToken));
      if (entry.meal_plan_slot_id) {
        unmarkMealPlanSlot(entry.meal_plan_slot_id);
      }
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.delete'));
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  /** Today page: plans changed, drop one planned meal (tap ✕, then tap again to confirm). */
  async function removeMealPlanSlot(slotId: string) {
    const key = `slot:${slotId}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    if (!foodSessionToken) {
      return;
    }
    setConfirmDeleteKey(null);
    setEntryActionBusyKey(key);
    try {
      const day = await deleteMealPlanSlot(slotId, foodSessionToken);
      setMealPlanDays((days) => days.map((item) => (item.id === day.id ? day : item)));
    } catch (error) {
      setMealPlanError(error instanceof Error ? error.message : 'Unable to remove this meal.');
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  async function removeExerciseEntry(entry: ExerciseEntry) {
    const key = `exercise:${entry.id}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    if (!foodSessionToken) {
      return;
    }
    setConfirmDeleteKey(null);
    setEntryActionBusyKey(key);
    try {
      await deleteExerciseEntry(entry.id, foodSessionToken);
      setExerciseEntries((current) => current.filter((item) => item.id !== entry.id));
      // A workout completed through this entry is back to "planned" on the server.
      const reopened = (session: PlannedWorkoutSession): PlannedWorkoutSession =>
        session.completed_exercise_entry_id === entry.id
          ? { ...session, status: 'planned', completed_at: null, completed_exercise_entry_id: null }
          : session;
      setPlannedWorkoutSessions((current) => {
        const next = current.map(reopened);
        setPlannedExerciseEntries(sortPlannedExerciseEntries(next.map(mapPlannedWorkoutSessionToEntry)));
        return next;
      });
    } catch {
      // The entry stays listed when the delete fails.
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  async function addPlannedExerciseEntry() {
    const duration_minutes = Number(plannedExerciseMinutesDraft);
    const warmup_minutes = Number(plannedExerciseWarmupMinutesDraft);
    const cooldown_minutes = Number(plannedExerciseCooldownMinutesDraft);
    const title = plannedExerciseTitleDraft.trim();

    if (!title || !Number.isFinite(duration_minutes) || duration_minutes <= 0) {
      return;
    }

    const estimatedCaloriesBurned = estimatePlannedExerciseCalories(duration_minutes, activePlannedExercisePreset);
    if (!Number.isFinite(estimatedCaloriesBurned) || estimatedCaloriesBurned <= 0) {
      return;
    }

    if (plannedExerciseWarmupEnabled && (!Number.isFinite(warmup_minutes) || warmup_minutes <= 0)) {
      return;
    }

    if (plannedExerciseCooldownEnabled && (!Number.isFinite(cooldown_minutes) || cooldown_minutes <= 0)) {
      return;
    }

    const payload = buildPlannedWorkoutPayload({
      title,
      workoutType: activePlannedExercisePreset.id,
      mainMinutes: Math.round(duration_minutes),
      warmupMinutes: plannedExerciseWarmupEnabled ? Math.round(warmup_minutes) : 0,
      cooldownMinutes: plannedExerciseCooldownEnabled ? Math.round(cooldown_minutes) : 0,
      plannedOn: selectedHomeDate,
      plannedAt: '06:30',
      estimatedCaloriesBurned: Math.round(estimatedCaloriesBurned),
      intensity: deriveExerciseIntensity(Math.round(duration_minutes), Math.round(estimatedCaloriesBurned))
    });

    setPlannedExerciseSaving(true);
    let previousSessions: PlannedWorkoutSession[] = [];
    const optimisticSessionId = plannedExerciseEditingId ?? `planned-workout-${Date.now()}`;
    const optimisticSession = buildOptimisticPlannedWorkoutSession(optimisticSessionId, payload);

    setPlannedWorkoutSessions((current) => {
      previousSessions = current;
      if (plannedExerciseEditingId) {
        return sortPlannedWorkoutSessions(
          current.map((session) => (session.id === plannedExerciseEditingId ? optimisticSession : session))
        );
      }
      return sortPlannedWorkoutSessions([...current, optimisticSession]);
    });
    setPlannedExerciseEntries((current) => {
      const optimisticEntry = mapPlannedWorkoutSessionToEntry(optimisticSession);
      if (plannedExerciseEditingId) {
        return sortPlannedExerciseEntries(
          current.map((entry) => (entry.id === plannedExerciseEditingId ? optimisticEntry : entry))
        );
      }
      return sortPlannedExerciseEntries([...current, optimisticEntry]);
    });

    try {
      if (!foodSessionToken) {
        throw new Error(`Create a live local session before ${plannedExerciseEditingId ? 'updating' : 'saving'} planned exercise.`);
      }

      const saved = plannedExerciseEditingId
        ? await updatePlannedWorkoutSession(plannedExerciseEditingId, payload, foodSessionToken)
        : await createPlannedWorkoutSession(payload, foodSessionToken);
      setPlannedWorkoutSessions((current) =>
        sortPlannedWorkoutSessions([
          ...current.filter((session) => session.id !== optimisticSessionId),
          saved
        ])
      );
      setPlannedExerciseEntries((current) =>
        sortPlannedExerciseEntries([
          ...current.filter((entry) => entry.id !== optimisticSessionId),
          mapPlannedWorkoutSessionToEntry(saved)
        ])
      );
      resetPlannedExerciseDrafts();
    } catch (error) {
      setPlannedWorkoutSessions(previousSessions);
      setPlannedExerciseEntries(sortPlannedExerciseEntries(previousSessions.map(mapPlannedWorkoutSessionToEntry)));
    } finally {
      setPlannedExerciseSaving(false);
    }
  }

  function beginPlannedExerciseEdit(entry: PlannedExerciseEntry) {
    const session = plannedWorkoutSessions.find((item) => item.id === entry.id);
    const draft = buildPlannedWorkoutEditDraft(entry, session);
    setPlannedExerciseEditingId(entry.id);
    setSelectedHomeDate(entry.planned_on);
    setPlannedExerciseTitleDraft(draft.title);
    setPlannedExerciseMinutesDraft(String(draft.mainMinutes));
    setPlannedExerciseWarmupEnabled(draft.warmupEnabled);
    setPlannedExerciseWarmupMinutesDraft(String(draft.warmupMinutes));
    setPlannedExerciseCooldownEnabled(draft.cooldownEnabled);
    setPlannedExerciseCooldownMinutesDraft(String(draft.cooldownMinutes));
  }

  function resetPlannedExerciseDrafts() {
    setPlannedExerciseEditingId(null);
    setPlannedExerciseTitleDraft('Walk');
    setPlannedExerciseMinutesDraft('25');
    setPlannedExerciseWarmupEnabled(false);
    setPlannedExerciseWarmupMinutesDraft('10');
    setPlannedExerciseCooldownEnabled(false);
    setPlannedExerciseCooldownMinutesDraft('8');
  }

  async function removePlannedExerciseEntry(entry: PlannedExerciseEntry) {
    let previousSessions: PlannedWorkoutSession[] = [];
    setPlannedExerciseDeletingId(entry.id);
    setPlannedWorkoutSessions((current) => {
      previousSessions = current;
      return current.filter((item) => item.id !== entry.id);
    });
    setPlannedExerciseEntries((current) => current.filter((item) => item.id !== entry.id));

    try {
      if (!foodSessionToken) {
        throw new Error('Create a live local session before deleting planned exercise.');
      }
      await deletePlannedWorkoutSession(entry.id, foodSessionToken);
      if (entry.completed_exercise_entry_id) {
        setExerciseEntries(await fetchExerciseEntries(foodSessionToken));
      }
      if (plannedExerciseEditingId === entry.id) {
        resetPlannedExerciseDrafts();
      }
    } catch (error) {
      setPlannedWorkoutSessions(previousSessions);
      setPlannedExerciseEntries(sortPlannedExerciseEntries(previousSessions.map(mapPlannedWorkoutSessionToEntry)));
    } finally {
      setPlannedExerciseDeletingId(null);
    }
  }

  async function togglePlannedExerciseCompletion(entry: PlannedExerciseEntry) {
    const nextCompletedAt = entry.completed_at ? null : new Date().toISOString();
    const session = plannedWorkoutSessions.find((item) => item.id === entry.id);
    if (!session) {
      return;
    }
    const optimisticSession: PlannedWorkoutSession = {
      ...session,
      status: nextCompletedAt ? 'completed' : 'planned',
      completed_at: nextCompletedAt,
      completed_exercise_entry_id: nextCompletedAt ? session.completed_exercise_entry_id ?? `exercise-${Date.now()}` : null
    };
    const optimisticEntry = mapPlannedWorkoutSessionToEntry(optimisticSession);

    setPlannedExerciseUpdatingId(entry.id);
    setPlannedWorkoutSessions((current) => current.map((item) => (item.id === entry.id ? optimisticSession : item)));
    setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? optimisticEntry : item)));

    try {
      if (!foodSessionToken) {
        throw new Error('Create a live local session before updating planned exercise.');
      }
      const saved = await updatePlannedWorkoutSessionCompletion(entry.id, nextCompletedAt, foodSessionToken);
      setPlannedWorkoutSessions((current) => current.map((item) => (item.id === entry.id ? saved : item)));
      setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? mapPlannedWorkoutSessionToEntry(saved) : item)));
      setExerciseEntries(await fetchExerciseEntries(foodSessionToken));
    } catch (error) {
      setPlannedWorkoutSessions((current) => current.map((item) => (item.id === entry.id ? session : item)));
      setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
    } finally {
      setPlannedExerciseUpdatingId(null);
    }
  }

  async function resetProfile() {
    if (confirmDeleteKey !== 'profile-reset') {
      setConfirmDeleteKey('profile-reset');
      return;
    }
    setConfirmDeleteKey(null);
    if (!foodSessionToken) {
      return;
    }
    setProfileResetting(true);
    setSettingsError(null);
    setSettingsMessage(null);
    try {
      const reset = await resetProfileSetup(foodSessionToken);
      // A profile without setup sends the app back to the welcome card with empty fields.
      applyProfileDrafts(reset);
      setProfile(reset);
      setProfileGoals([]); // the server deleted them; setup seeds the new one
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to reset the profile.');
    } finally {
      setProfileResetting(false);
    }
  }

  /** Settings > Calorie floor. Changing it recalculates the daily targets right away. */
  async function applyCalorieFloor(choice: CalorieFloorChoice) {
    if (!profile || !foodSessionToken || settingsSaving) {
      return;
    }
    setSettingsSaving(true);
    setFloorMessage(null);
    try {
      const updated = await updateProfile(
        { display_name: profile.display_name ?? null, timezone: profile.timezone, units: profile.units, calorie_floor: choice },
        foodSessionToken
      );
      setProfile(updated);
      setOnboardingCalorieFloorDraft(choice);
      setProfileGoals(await fetchUserGoals(foodSessionToken));
      setFloorMessage(
        choice === 'off'
          ? 'Calorie floor turned off. Your daily targets were recalculated.'
          : 'Recommended minimum turned on. Your daily targets were recalculated.'
      );
    } catch (error) {
      setFloorMessage(error instanceof Error ? error.message : 'Unable to change the calorie floor.');
    } finally {
      setSettingsSaving(false);
    }
  }

  /** Reload workouts when a sync (this app's or the server's own) finished since the last look. */
  async function showGarminWorkoutsSince(token: string, lastSuccessAt: string | null) {
    const seen = garminSeenSyncRef.current;
    garminSeenSyncRef.current = lastSuccessAt;
    if (!lastSuccessAt || seen === null || seen === lastSuccessAt) {
      return; // first look: the tracker load already has the workouts
    }
    const entries = await fetchExerciseEntries(token);
    if (garminTokenRef.current === token) {
      setExerciseEntries(entries);
    }
  }

  /** Pull new Garmin activities; reloads workouts when any were added. One sync at a time. */
  async function runGarminSync(token: string, announce = false) {
    if (garminSyncingRef.current) {
      return;
    }
    garminSyncingRef.current = true;
    setGarminSyncing(true);
    if (announce) {
      setGarminNote(null);
    }
    try {
      const result = await syncGarmin(token);
      if (garminTokenRef.current !== token) {
        return; // signed out or switched sessions meanwhile
      }
      setGarminStatus(result);
      const added = result.imported ?? 0;
      garminSeenSyncRef.current = result.last_success_at;
      if (added > 0) {
        const entries = await fetchExerciseEntries(token);
        if (garminTokenRef.current === token) {
          setExerciseEntries(entries);
        }
      }
      if (announce) {
        const linked = result.matched ?? 0;
        const parts = [
          added > 0 ? `Added ${added} workout${added === 1 ? '' : 's'} from Garmin.` : '',
          linked > 0 ? `Linked ${linked} to workout${linked === 1 ? '' : 's'} you'd already logged.` : ''
        ].filter(Boolean);
        setGarminNote(parts.length > 0 ? parts.join(' ') : 'No new workouts.');
      }
    } catch (error) {
      if (garminTokenRef.current !== token) {
        return;
      }
      try {
        const status = await fetchGarminStatus(token);
        if (garminTokenRef.current === token) {
          setGarminStatus(status);
        }
      } catch {
        // Keep the last known status.
      }
      if (announce) {
        setGarminNote(error instanceof Error ? error.message : 'Garmin sync failed.');
      }
    } finally {
      garminSyncingRef.current = false;
      setGarminSyncing(false);
    }
  }

  /** Gus's single-meal suggestion: help filling what's left today (Today → Meals). */
  function openSuggest() {
    if (profile && foodSessionToken) {
      setSuggestOpen(true);
    }
  }

  // The day Gus suggests for: the day showing on Today.
  const suggestDate = selectedHomeDate;

  /** The meal to suggest for by default: the next meal for this time of day (snacks come later). */
  function defaultSuggestBlock(): MealBlockKey {
    const slot = defaultMealSlot();
    return slot === 'snack' ? 'dinner' : slot;
  }



  /** Settings > Water goal. */
  async function applyWaterGoal(goalMl: number) {
    if (!profile || !foodSessionToken || settingsSaving) {
      return;
    }
    setSettingsSaving(true);
    setFloorMessage(null);
    try {
      setProfile(
        await updateProfile(
          { display_name: profile.display_name ?? null, timezone: profile.timezone, units: profile.units, water_goal_ml: goalMl },
          foodSessionToken
        )
      );
    } catch (error) {
      setFloorMessage(error instanceof Error ? error.message : 'Unable to change the water goal.');
    } finally {
      setSettingsSaving(false);
    }
  }

  /** Settings > Language: switches at once, saves to the profile, and switches back if saving fails. */
  async function applyLanguage(next: Language) {
    if (!profile || !foodSessionToken || settingsSaving || next === language) {
      return;
    }
    const previous = language;
    setLanguage(next);
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      setProfile(
        await updateProfile(
          { display_name: profile.display_name ?? null, timezone: profile.timezone, units: profile.units, language: next },
          foodSessionToken
        )
      );
    } catch (error) {
      setLanguage(previous);
      setSettingsError(error instanceof Error ? error.message : t('settings.language.error'));
    } finally {
      setSettingsSaving(false);
    }
  }

  /** Today: log a drink on the day shown. */
  async function addHomeWater(ml: number) {
    if (!foodSessionToken || waterBusy) {
      return;
    }
    setWaterBusy(true);
    try {
      const entry = await addWater(selectedHomeDate, ml, foodSessionToken);
      setWaterEntries((current) => [...current, entry]);
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.logWater'));
    } finally {
      setWaterBusy(false);
    }
  }

  /** Today: take back the day's last drink. */
  async function undoHomeWater() {
    const last = homeWaterToday.at(-1);
    if (!foodSessionToken || waterBusy || !last) {
      return;
    }
    setWaterBusy(true);
    try {
      await deleteWater(last.id, foodSessionToken);
      setWaterEntries((current) => current.filter((entry) => entry.id !== last.id));
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : t('today.errors.undo'));
    } finally {
      setWaterBusy(false);
    }
  }

  /** Settings > Workout calories. A preference only: targets are not recalculated. */
  async function applyWorkoutCaloriesShare(share: WorkoutCaloriesShare) {
    if (!profile || !foodSessionToken || settingsSaving) {
      return;
    }
    setSettingsSaving(true);
    setFloorMessage(null);
    try {
      const updated = await updateProfile(
        { display_name: profile.display_name ?? null, timezone: profile.timezone, units: profile.units, workout_calories_share: share },
        foodSessionToken
      );
      setProfile(updated);
      setFloorMessage(
        share === 0
          ? 'Workouts no longer add to your daily allowance.'
          : `${share}% of the calories from workouts you log now add to that day's allowance.`
      );
    } catch (error) {
      setFloorMessage(error instanceof Error ? error.message : 'Unable to change workout calories.');
    } finally {
      setSettingsSaving(false);
    }
  }

  /** Settings: name, time zone, and units only. These never recalculate targets. */
  async function saveSettings() {
    if (!profile || !foodSessionToken || settingsSaving) {
      return;
    }
    setSettingsSaving(true);
    setSettingsMessage(null);
    setSettingsError(null);
    try {
      const updated = await updateProfile(
        {
          display_name: profileDisplayNameDraft.trim() || null,
          timezone: profileTimezoneDraft.trim() || 'UTC',
          units: profileUnitsDraft
        },
        foodSessionToken
      );
      setProfile(updated);
      setProfileDisplayNameDraft(updated.display_name ?? '');
      setProfileTimezoneDraft(updated.timezone);
      setProfileUnitsDraft(updated.units);
      setSettingsMessage('Settings saved.');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  }

  async function saveProfileSettings() {
    if (!profile) {
      return;
    }

    if (missingOtherAllergy(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft)) {
      setProfileTone('checking');
      setProfileStatus('Could not save profile settings');
      setProfileError('Type the other food to avoid, or turn off Other.');
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
      // Name, time zone, and units are edited in Settings; keep the saved values here.
      display_name: profile.display_name ?? null,
      timezone: profile.timezone,
      units: profile.units,
      sex: onboardingSexDraft,
      age_years: Math.round(age_years),
      height_cm,
      current_weight_lbs: round1(current_weight_lbs),
      goal_type: onboardingGoalTypeDraft,
      goal_pace: onboardingGoalPaceDraft,
      target_weight_lbs: target_weight_lbs === null ? null : round1(target_weight_lbs),
      activity_level: onboardingActivityLevelDraft,
      dietary_pattern: onboardingDietaryPatternDraft,
      nutrition_style: onboardingNutritionStyleDraft,
      allergy_notes: formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft),
      // Only when the user picked a different meal balance: saving a weight change never
      // rewrites a pattern they didn't touch (e.g. an older 5-meal one).
      ...(onboardingMealStyleDraft !== savedMealStyleRef.current
        ? { meals_per_day: 3 as const, meal_split: mealStyleSplit(onboardingMealStyleDraft) }
        : {})
    } satisfies Parameters<typeof updateProfile>[0];

    setProfileSaving(true);
    setProfileTone('checking');
    setProfileStatus('Saving profile and recalculating targets');
    setProfileError(null);

    try {
      if (foodSessionToken) {
        const updated = await updateProfile(payload, foodSessionToken);
        const [goals, , weights] = await Promise.all([
          fetchUserGoals(foodSessionToken),
          fetchProfileProgress(foodSessionToken),
          fetchWeightEntries(foodSessionToken)
        ]);
        setProfile(updated);
        setProfileGoals(goals);
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

  function onboardingBodyDrafts(): BodyDrafts {
    return {
      heightFeet: onboardingHeightFeetDraft,
      heightInches: onboardingHeightInchesDraft,
      heightCm: onboardingHeightCmDraft,
      weight: onboardingCurrentWeightDraft
    };
  }

  /** The optional goal weight in lb (typed in the setup units), or null when empty or invalid. */
  function onboardingTargetWeightLbs(): number | null {
    const value = Number(onboardingTargetWeightDraft.trim());
    if (onboardingTargetWeightDraft.trim() === '' || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    return Math.round((onboardingUnitsDraft === 'metric' ? value * LB_PER_KG : value) * 10) / 10;
  }

  function onboardingWheelDrafts(): WheelDrafts {
    return { ...onboardingBodyDrafts(), age: onboardingAgeDraft, goalWeight: onboardingTargetWeightDraft };
  }

  function applyBodyPicker(field: BodyField, indexes: number[]) {
    const next = draftsFromWheel(field, onboardingUnitsDraft, indexes);
    if (next.heightFeet !== undefined) setOnboardingHeightFeetDraft(next.heightFeet);
    if (next.heightInches !== undefined) setOnboardingHeightInchesDraft(next.heightInches);
    if (next.heightCm !== undefined) setOnboardingHeightCmDraft(next.heightCm);
    if (next.weight !== undefined) setOnboardingCurrentWeightDraft(next.weight);
    if (next.goalWeight !== undefined) setOnboardingTargetWeightDraft(next.goalWeight);
    if (next.age !== undefined) setOnboardingAgeDraft(next.age);
    setBodyPicker(null);
  }

  function switchOnboardingUnits(next: UnitSystem) {
    if (next === onboardingUnitsDraft) {
      return;
    }
    const target = Number(onboardingTargetWeightDraft.trim());
    if (onboardingTargetWeightDraft.trim() !== '' && Number.isFinite(target) && target > 0) {
      const converted = next === 'metric' ? target / LB_PER_KG : target * LB_PER_KG;
      setOnboardingTargetWeightDraft(String(Math.round(converted * 10) / 10));
    }
    const converted = convertBodyDrafts(onboardingBodyDrafts(), onboardingUnitsDraft, next);
    setOnboardingHeightFeetDraft(converted.heightFeet);
    setOnboardingHeightInchesDraft(converted.heightInches);
    setOnboardingHeightCmDraft(converted.heightCm);
    setOnboardingCurrentWeightDraft(converted.weight);
    setOnboardingUnitsDraft(next);
  }

  function validateOnboardingStep(step: OnboardingStep): string | null {
    if (step === 'basics' && !onboardingSexDraft) {
      return 'Choose your sex. It changes how your calories are estimated.';
    }
    if (step === 'basics') {
      const age_years = Number(onboardingAgeDraft);
      if (bodyMeasurementsFromDrafts(onboardingUnitsDraft, onboardingBodyDrafts()) === null) {
        return onboardingUnitsDraft === 'metric'
          ? 'Enter your height in cm and weight in kg.'
          : 'Enter your height in feet and inches (0-11) and weight in lb.';
      }
      if (!Number.isFinite(age_years) || age_years <= 0 || age_years >= 120) {
        return 'Enter your age.';
      }
    }

    if (step === 'goal') {
      return onboardingGoalTypeDraft ? null : 'Choose a goal to continue.';
    }
    if (step === 'diet' && !onboardingDietaryPatternDraft) {
      return 'Choose how you eat to continue.';
    }
    if (step === 'style' && !onboardingNutritionStyleDraft) {
      return 'Choose a nutrition style to continue.';
    }

    if (step === 'pace' && onboardingGoalTypeDraft !== 'maintain' && onboardingTargetWeightDraft.trim() !== '') {
      const goalLbs = onboardingTargetWeightLbs();
      const current = bodyMeasurementsFromDrafts(onboardingUnitsDraft, onboardingBodyDrafts());
      if (goalLbs === null) {
        return 'Enter a goal weight as a number, or leave it empty.';
      }
      if (current && onboardingGoalTypeDraft === 'lose' && goalLbs >= current.weight_lbs) {
        return 'Goal weight should be below your current weight, or leave it empty.';
      }
      if (current && onboardingGoalTypeDraft === 'gain' && goalLbs <= current.weight_lbs) {
        return 'Goal weight should be above your current weight, or leave it empty.';
      }
    }

    if (step === 'diet' && !onboardingDietaryPatternDraft) {
      return 'Choose a dietary pattern before continuing.';
    }

    if (step === 'style' && !onboardingNutritionStyleDraft) {
      return 'Choose a nutrition style before continuing.';
    }

    if (step === 'allergies' && onboardingAllergySelectionsDraft.includes('other') && !onboardingAllergyOtherDraft.trim()) {
      return 'Add the custom allergy or exclusion before continuing.';
    }

    return null;
  }

  /** The selected pace as calculated (floor off), for the below-the-minimum checks. */
  function calculatedPaceOption(pace: GoalPace = onboardingGoalPaceDraft): TargetPreviewOption | null {
    return onboardingGoalTypeDraft ? findPreviewOption(targetPreview, onboardingGoalTypeDraft, pace) : null;
  }

  /** The pace as it will be saved, with the recommended minimum applied unless opted out. */
  function effectivePaceOption(goal = onboardingGoalTypeDraft, pace: GoalPace = onboardingGoalPaceDraft) {
    return goal ? withCalorieFloor(findPreviewOption(targetPreview, goal, pace), onboardingCalorieFloorDraft) : null;
  }

  function floorAnswered(pace: GoalPace): boolean {
    return floorAnsweredPaces.includes(`${onboardingGoalTypeDraft}|${pace}`);
  }

  /** What a pace card shows (honest number until the user decides), or null without a preview. */
  function displayedPace(goal = onboardingGoalTypeDraft, pace: GoalPace = onboardingGoalPaceDraft) {
    const calculated = goal ? findPreviewOption(targetPreview, goal, pace) : null;
    const answered = floorAnsweredPaces.includes(`${goal}|${pace}`);
    return calculated ? paceDisplay(calculated, onboardingCalorieFloorDraft, answered) : null;
  }

  function chooseOnboardingPace(pace: GoalPace) {
    const calculated = calculatedPaceOption(pace);
    const shown = displayedPace(onboardingGoalTypeDraft, pace);
    // At the minimum this pace would not move weight in the goal's direction.
    const useless =
      shown?.state === 'using_minimum' &&
      ((onboardingGoalTypeDraft === 'lose' && shown.weeklyChangeLbs >= 0) ||
        (onboardingGoalTypeDraft === 'gain' && shown.weeklyChangeLbs <= 0));
    // Tapping the chosen pace again, or a pace the minimum makes useless, reopens the warning,
    // so the minimum can still be opted out of.
    const reopen =
      (pace === onboardingGoalPaceDraft || useless) && needsFloorWarning(calculated, onboardingCalorieFloorDraft, false);
    if (reopen || needsFloorWarning(calculated, onboardingCalorieFloorDraft, floorAnswered(pace))) {
      setFloorWarning({ pace, thenNext: false });
      return;
    }
    setOnboardingGoalPaceDraft(pace);
  }

  function answerFloorWarning(choice: CalorieFloorChoice) {
    const pending = floorWarning;
    setFloorWarning(null);
    if (!pending) {
      return;
    }
    if (choice === 'recommended') {
      const key = `${onboardingGoalTypeDraft}|${pending.pace}`;
      setFloorAnsweredPaces((current) => (current.includes(key) ? current : [...current, key]));
    }
    setOnboardingCalorieFloorDraft(choice);
    setOnboardingGoalPaceDraft(pending.pace);
    if (pending.thenNext) {
      advanceOnboardingStep({ skipFloorCheck: true });
    }
  }

  function goToNextOnboardingStep() {
    advanceOnboardingStep({ skipFloorCheck: false });
  }

  function advanceOnboardingStep({ skipFloorCheck }: { skipFloorCheck: boolean }) {
    // A pace below the recommended minimum asks before moving on (unless answered already).
    if (
      onboardingStep === 'pace' &&
      !skipFloorCheck &&
      needsFloorWarning(calculatedPaceOption(), onboardingCalorieFloorDraft, floorAnswered(onboardingGoalPaceDraft))
    ) {
      setFloorWarning({ pace: onboardingGoalPaceDraft, thenNext: true });
      return;
    }
    const error = validateOnboardingStep(onboardingStep);
    if (error) {
      setOnboardingError(error);
      return;
    }

    const currentIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
    const nextStep = onboardingSteps[currentIndex + 1];
    if (nextStep) {
      setOnboardingError(null);
      setOnboardingStep(nextStep.id);
      // Daily activity and Your goal open with an explainer card, once per setup.
      const explainer = explainerBefore(nextStep.id, explainersSeen);
      if (explainer) {
        setActiveExplainer(explainer);
      }
    }
  }

  /** Back from an explainer card returns to the step before the one it introduces. */
  function leaveExplainerBack() {
    setActiveExplainer(null);
    goToPreviousOnboardingStep();
  }

  function goToPreviousOnboardingStep() {
    const currentIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
    if (currentIndex === 0) {
      setOnboardingError(null);
      setOnboardingStep('welcome');
      return;
    }
    const previousStep = onboardingSteps[currentIndex - 1];
    if (previousStep) {
      setOnboardingError(null);
      setOnboardingStep(previousStep.id);
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
      setGoalEffectiveAtDraft(localDateKey());
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

  async function toggleMealPlanMeal(day: MealPlanDay, slotId: string, slotLabel: string) {
    const currentlyLogged = mealPlanEatenSlots[day.id]?.[slotId] ?? null;
    const nextEatenAt = currentlyLogged ? null : new Date().toISOString();
    const isSelectedHomeDay = day.plan_date === selectedHomeDate;
    const isTodayPlan = day.plan_date === todayKey;

    setMealPlanEatenSlots((current) => {
      const nextDayState = { ...(current[day.id] ?? {}) };
      if (nextEatenAt) {
        nextDayState[slotId] = nextEatenAt;
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
    setMealPlanDays((current) =>
      current.map((mealDay) =>
        mealDay.id === day.id
          ? {
              ...mealDay,
              slots: mealDay.slots.map((slot) =>
                slot.id === slotId ? { ...slot, eaten_at: nextEatenAt } : slot
              ),
            }
          : mealDay
      )
    );
    setMealPlanTone('checking');
    setMealPlanStatus(`${slotLabel} ${currentlyLogged ? 'unchecked' : 'logged as eaten'} for ${day.label}`);

    try {
      if (foodSessionToken) {
        const updatedDay = await updateMealPlanSlotEatenAt(slotId, nextEatenAt, foodSessionToken);
        setMealPlanDays((current) => current.map((mealDay) => (mealDay.id === updatedDay.id ? updatedDay : mealDay)));
        setMealPlanEatenSlots((current) => ({
          ...current,
          [updatedDay.id]: Object.fromEntries(
            updatedDay.slots
              .filter((slot) => Boolean(slot.eaten_at))
              .map((slot) => [slot.id, slot.eaten_at as string])
          ),
        }));
        if (isTodayPlan) {
          const updatedLog = await fetchFoodLogForDate(todayKey, foodSessionToken);
          setFoodLog(updatedLog);
          setFoodLogError(null);
        }
        if (isSelectedHomeDay) {
          const updatedHomeLog = await fetchFoodLogForDate(selectedHomeDate, foodSessionToken);
          setHomeFoodLog(updatedHomeLog);
        }
      }
      setMealPlanTone('live');
      setMealPlanStatus(`${slotLabel} ${currentlyLogged ? 'unchecked' : 'logged as eaten'} for ${day.label}`);
    } catch (error) {
      setMealPlanDays((current) =>
        current.map((mealDay) =>
          mealDay.id === day.id
            ? {
                ...mealDay,
                slots: mealDay.slots.map((slot) =>
                  slot.id === slotId ? { ...slot, eaten_at: currentlyLogged } : slot
                ),
              }
            : mealDay
        )
      );
      setMealPlanEatenSlots((current) => {
        const nextDayState = { ...(current[day.id] ?? {}) };
        if (currentlyLogged) {
          nextDayState[slotId] = currentlyLogged;
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
      setMealPlanTone('checking');
      setMealPlanStatus(`Could not update ${slotLabel}`);
      setMealPlanError(error instanceof Error ? error.message : 'Unable to update meal plan slot.');
    }
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

  if (holdSplashForFonts({ fontLoaded: ribeyeLoaded, fontError: Boolean(ribeyeError), waitExpired: fontWaitExpired })) {
    // Show screens only once their display font is ready, so headings do not pop in late.
    return <LaunchSplash />;
  }

  if (entryMode === null && ownerAccess === 'checking') {
    // The same splash as the HTML page and profile loading, so launch shows one still image.
    return <LaunchSplash />;
  }

  if (entryMode === null) {
    return (
      <EntryScreen
        ribeyeLoaded={ribeyeLoaded}
        ownerAccess={ownerAccess}
        ownerAccessMessage={ownerAccessMessage}
        setOwnerCheckNonce={setOwnerCheckNonce}
        entryIntent={entryIntent}
        setEntryIntent={setEntryIntent}
        setEntryEmailError={setEntryEmailError}
        setEntryError={setEntryError}
        entryLoading={entryLoading}
        enterPreviewMode={enterPreviewMode}
        entryEmailDraft={entryEmailDraft}
        setEntryEmailDraft={setEntryEmailDraft}
        entryEmailError={entryEmailError}
        entryDisplayNameDraft={entryDisplayNameDraft}
        setEntryDisplayNameDraft={setEntryDisplayNameDraft}
        entryError={entryError}
        enterLiveMode={enterLiveMode}
        entryBackendTone={entryBackendTone}
        entryBackendStatus={entryBackendStatus}
        entryBackendDetail={entryBackendDetail}
      />
    );
  }

  if (!profileLoaded || !launchHoldDone) {
    // Returning users keep the splash for at least MIN_SPLASH_MS; first-time setup skips it.
    return <LaunchSplash />;
  }

  if (onboardingRequired && onboardingStep === 'welcome') {
    return (
      <OnboardingWelcome
        ribeyeLoaded={ribeyeLoaded}
        setOnboardingError={setOnboardingError}
        setOnboardingStep={setOnboardingStep}
      />
    );
  }

  if (onboardingRequired && activeExplainer) {
    return (
      <OnboardingExplainer
        activeExplainer={activeExplainer}
        ribeyeLoaded={ribeyeLoaded}
        leaveExplainerBack={leaveExplainerBack}
        setExplainersSeen={setExplainersSeen}
        setActiveExplainer={setActiveExplainer}
      />
    );
  }

  if (onboardingRequired) {
    return (
      <OnboardingWizard
        onboardingStep={onboardingStep}
        setOnboardingStep={setOnboardingStep}
        onboardingSaving={onboardingSaving}
        onboardingError={onboardingError}
        setOnboardingError={setOnboardingError}
        floorWarning={floorWarning}
        setFloorWarning={setFloorWarning}
        calculatedPaceOption={calculatedPaceOption}
        effectivePaceOption={effectivePaceOption}
        displayedPace={displayedPace}
        floorAnswered={floorAnswered}
        chooseOnboardingPace={chooseOnboardingPace}
        answerFloorWarning={answerFloorWarning}
        targetPreview={targetPreview}
        energyPreview={energyPreview}
        energyMaintenance={energyMaintenance}
        onboardingSexDraft={onboardingSexDraft}
        setOnboardingSexDraft={setOnboardingSexDraft}
        onboardingGoalTypeDraft={onboardingGoalTypeDraft}
        setOnboardingGoalTypeDraft={setOnboardingGoalTypeDraft}
        onboardingGoalPaceDraft={onboardingGoalPaceDraft}
        onboardingCalorieFloorDraft={onboardingCalorieFloorDraft}
        bodyPicker={bodyPicker}
        setBodyPicker={setBodyPicker}
        applyBodyPicker={applyBodyPicker}
        onboardingUnitsDraft={onboardingUnitsDraft}
        switchOnboardingUnits={switchOnboardingUnits}
        onboardingWheelDrafts={onboardingWheelDrafts}
        onboardingBodyDrafts={onboardingBodyDrafts}
        onboardingTargetWeightLbs={onboardingTargetWeightLbs}
        setOnboardingTargetWeightDraft={setOnboardingTargetWeightDraft}
        profileDisplayNameDraft={profileDisplayNameDraft}
        setProfileDisplayNameDraft={setProfileDisplayNameDraft}
        onboardingActivityLevelDraft={onboardingActivityLevelDraft}
        setOnboardingActivityLevelDraft={setOnboardingActivityLevelDraft}
        showBmrExplainer={showBmrExplainer}
        setShowBmrExplainer={setShowBmrExplainer}
        onboardingDietaryPatternDraft={onboardingDietaryPatternDraft}
        setOnboardingDietaryPatternDraft={setOnboardingDietaryPatternDraft}
        onboardingNutritionStyleDraft={onboardingNutritionStyleDraft}
        setOnboardingNutritionStyleDraft={setOnboardingNutritionStyleDraft}
        onboardingMealStyleDraft={onboardingMealStyleDraft}
        setOnboardingMealStyleDraft={setOnboardingMealStyleDraft}
        onboardingAllergySelectionsDraft={onboardingAllergySelectionsDraft}
        toggleOnboardingAllergy={toggleOnboardingAllergy}
        onboardingAllergyOtherDraft={onboardingAllergyOtherDraft}
        setOnboardingAllergyOtherDraft={setOnboardingAllergyOtherDraft}
        goToPreviousOnboardingStep={goToPreviousOnboardingStep}
        goToNextOnboardingStep={goToNextOnboardingStep}
        completeOnboardingSetup={completeOnboardingSetup}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView ref={mainScrollRef} style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.appHeader}>
          <View style={styles.appShellTopRow}>
            <View style={styles.appHeaderTitleWrap}>
              <Text style={[styles.appBrandTitle, ribeyeLoaded && styles.appBrandTitleDisplay]}>Relish</Text>
            </View>
            <View style={styles.appShellActions}>
              <Pressable
                style={styles.avatarButton}
                onPress={() => setOpenSheet('account')}
                accessibilityLabel={t('nav.account')}
              >
                <View style={styles.avatarBadge}>
                  <Image source={mascotAvatarImage} style={styles.avatarImage} resizeMode="cover" />
                </View>
              </Pressable>
            </View>
          </View>

          {subTabsForSection(section).length > 0 ? (
            <SubTabs
              items={subTabsForSection(section).map((item) => {
                const key = SECTION_LABEL_KEYS[item.id];
                return key ? { ...item, label: t(key) } : item;
              })}
              active={section}
              onSelect={handleSectionChange}
            />
          ) : null}
        </View>

        {section === 'dashboard' && (
          <TodayScreen
            selectedHomeDate={selectedHomeDate}
            todayKey={todayKey}
            setSelectedHomeDate={setSelectedHomeDate}
            dailyHomeTargets={dailyHomeTargets}
            homeCalorieBudget={homeCalorieBudget}
            profile={profile}
            handleSectionChange={handleSectionChange}
            homeConsumedMacros={homeConsumedMacros}
            homeWaterMl={homeWaterMl}
            waterBusy={waterBusy}
            homeWaterToday={homeWaterToday}
            addHomeWater={addHomeWater}
            undoHomeWater={undoHomeWater}
            setOpenSheet={setOpenSheet}
            homeOpenPlannedWorkouts={homeOpenPlannedWorkouts}
            homeCompletedExerciseEntries={homeCompletedExerciseEntries}
            togglePlannedExerciseCompletion={togglePlannedExerciseCompletion}
            plannedExerciseUpdatingId={plannedExerciseUpdatingId}
            confirmDeleteKey={confirmDeleteKey}
            setConfirmDeleteKey={setConfirmDeleteKey}
            removePlannedExerciseEntry={removePlannedExerciseEntry}
            setWorkoutDetailId={setWorkoutDetailId}
            removeExerciseEntry={removeExerciseEntry}
            entryActionBusyKey={entryActionBusyKey}
            foodSessionToken={foodSessionToken}
            homeOpenPlannedMeals={homeOpenPlannedMeals}
            homeFoodLog={homeFoodLog}
            homeMealPlanDay={homeMealPlanDay}
            toggleMealPlanMeal={toggleMealPlanMeal}
            removeMealPlanSlot={removeMealPlanSlot}
            foodLogError={foodLogError}
            setFoodLogError={setFoodLogError}
            homeMealGroups={homeMealGroups}
            editingFoodEntryId={editingFoodEntryId}
            setEditingFoodEntryId={setEditingFoodEntryId}
            editingFoodGramsDraft={editingFoodGramsDraft}
            setEditingFoodGramsDraft={setEditingFoodGramsDraft}
            saveHomeFoodEntryEdit={saveHomeFoodEntryEdit}
            removeHomeFoodEntry={removeHomeFoodEntry}
          />
        )}

        {section === 'trends' && (
          <TrendsScreen
            trendRange={trendRange}
            setTrendRange={setTrendRange}
            trendsError={trendsError}
            trendWeight={trendWeight}
            trendUnit={trendUnit}
            trendWeightPoints={trendWeightPoints}
            trendStart={trendStart}
            todayKey={todayKey}
            profile={profile}
            trendProjection={trendProjection}
            weightHorizon={weightHorizon}
            setWeightHorizon={setWeightHorizon}
            trendCalories={trendCalories}
            trendDays={trendDays}
            trendMacroDays={trendMacroDays}
            dailyHomeTargets={dailyHomeTargets}
            trendWaterDays={trendWaterDays}
            trendLogs={trendLogs}
            exerciseEntries={exerciseEntries}
            deleteTrendFood={deleteTrendFood}
            setWorkoutDetailId={setWorkoutDetailId}
          />
        )}

        {section === 'profile' && (
          <ProfileScreen
            profileTone={profileTone}
            profileStatus={profileStatus}
            profileError={profileError}
            profile={profile}
            onboardingSexDraft={onboardingSexDraft}
            setOnboardingSexDraft={setOnboardingSexDraft}
            onboardingAgeDraft={onboardingAgeDraft}
            setOnboardingAgeDraft={setOnboardingAgeDraft}
            onboardingCurrentWeightDraft={onboardingCurrentWeightDraft}
            setOnboardingCurrentWeightDraft={setOnboardingCurrentWeightDraft}
            onboardingHeightFeetDraft={onboardingHeightFeetDraft}
            setOnboardingHeightFeetDraft={setOnboardingHeightFeetDraft}
            onboardingHeightInchesDraft={onboardingHeightInchesDraft}
            setOnboardingHeightInchesDraft={setOnboardingHeightInchesDraft}
            onboardingGoalTypeDraft={onboardingGoalTypeDraft}
            setOnboardingGoalTypeDraft={setOnboardingGoalTypeDraft}
            onboardingGoalPaceDraft={onboardingGoalPaceDraft}
            setOnboardingGoalPaceDraft={setOnboardingGoalPaceDraft}
            onboardingTargetWeightDraft={onboardingTargetWeightDraft}
            setOnboardingTargetWeightDraft={setOnboardingTargetWeightDraft}
            onboardingActivityLevelDraft={onboardingActivityLevelDraft}
            setOnboardingActivityLevelDraft={setOnboardingActivityLevelDraft}
            onboardingDietaryPatternDraft={onboardingDietaryPatternDraft}
            setOnboardingDietaryPatternDraft={setOnboardingDietaryPatternDraft}
            onboardingNutritionStyleDraft={onboardingNutritionStyleDraft}
            setOnboardingNutritionStyleDraft={setOnboardingNutritionStyleDraft}
            onboardingMealStyleDraft={onboardingMealStyleDraft}
            setOnboardingMealStyleDraft={setOnboardingMealStyleDraft}
            onboardingAllergySelectionsDraft={onboardingAllergySelectionsDraft}
            toggleOnboardingAllergy={toggleOnboardingAllergy}
            onboardingAllergyOtherDraft={onboardingAllergyOtherDraft}
            setOnboardingAllergyOtherDraft={setOnboardingAllergyOtherDraft}
            saveProfileSettings={saveProfileSettings}
            profileSaving={profileSaving}
            latestProfileGoal={latestProfileGoal}
            profileGoals={profileGoals}
            goalEffectiveAtDraft={goalEffectiveAtDraft}
            setGoalEffectiveAtDraft={setGoalEffectiveAtDraft}
            goalCaloriesDraft={goalCaloriesDraft}
            setGoalCaloriesDraft={setGoalCaloriesDraft}
            goalProteinDraft={goalProteinDraft}
            setGoalProteinDraft={setGoalProteinDraft}
            goalCarbsDraft={goalCarbsDraft}
            setGoalCarbsDraft={setGoalCarbsDraft}
            goalFatDraft={goalFatDraft}
            setGoalFatDraft={setGoalFatDraft}
            goalWeightDraft={goalWeightDraft}
            setGoalWeightDraft={setGoalWeightDraft}
            addGoal={addGoal}
            goalSaving={goalSaving}
          />
        )}

        {section === 'workout-plan' && (
          <WorkoutPlanScreen
            selectedHomeDate={selectedHomeDate}
            todayKey={todayKey}
            plannedExerciseEditingId={plannedExerciseEditingId}
            activePlannedExercisePreset={activePlannedExercisePreset}
            plannedExerciseTitleDraft={plannedExerciseTitleDraft}
            setPlannedExerciseTitleDraft={setPlannedExerciseTitleDraft}
            plannedExerciseMinutesDraft={plannedExerciseMinutesDraft}
            setPlannedExerciseMinutesDraft={setPlannedExerciseMinutesDraft}
            plannedExerciseSaving={plannedExerciseSaving}
            estimatedPlannedExerciseCalories={estimatedPlannedExerciseCalories}
            plannedExerciseWarmupEnabled={plannedExerciseWarmupEnabled}
            setPlannedExerciseWarmupEnabled={setPlannedExerciseWarmupEnabled}
            plannedExerciseCooldownEnabled={plannedExerciseCooldownEnabled}
            setPlannedExerciseCooldownEnabled={setPlannedExerciseCooldownEnabled}
            plannedExerciseWarmupMinutesDraft={plannedExerciseWarmupMinutesDraft}
            setPlannedExerciseWarmupMinutesDraft={setPlannedExerciseWarmupMinutesDraft}
            plannedExerciseCooldownMinutesDraft={plannedExerciseCooldownMinutesDraft}
            setPlannedExerciseCooldownMinutesDraft={setPlannedExerciseCooldownMinutesDraft}
            plannedExerciseEntries={plannedExerciseEntries}
            plannedWorkoutSessions={plannedWorkoutSessions}
            plannedExerciseDeletingId={plannedExerciseDeletingId}
            plannedExerciseUpdatingId={plannedExerciseUpdatingId}
            resetPlannedExerciseDrafts={resetPlannedExerciseDrafts}
            addPlannedExerciseEntry={addPlannedExerciseEntry}
            beginPlannedExerciseEdit={beginPlannedExerciseEdit}
            removePlannedExerciseEntry={removePlannedExerciseEntry}
            togglePlannedExerciseCompletion={togglePlannedExerciseCompletion}
          />
        )}

        {section === 'foods' && (
          <FoodsScreen
            foodDraft={foodDraft}
            setFoodDraft={setFoodDraft}
            submitFoodSearch={submitFoodSearch}
            isSubmittingSearch={isSubmittingSearch}
            foodTone={foodTone}
            foodStatus={foodStatus}
            foodError={foodError}
            foodResults={foodResults}
            selectedFood={selectedFood}
            setSelectedFoodId={setSelectedFoodId}
            foodQuantityForId={foodQuantityForId}
            adjustFoodQuantity={adjustFoodQuantity}
            quickAddFoodToToday={quickAddFoodToToday}
            isSavingLogEntry={isSavingLogEntry}
            toggleFoodFavorite={toggleFoodFavorite}
            foodFavoriteSavingId={foodFavoriteSavingId}
            removeFromBank={removeFromBank}
            confirmDeleteKey={confirmDeleteKey}
          />
        )}

        {section === 'meal-plan' && (
          <MealPlanScreen
            foodSessionToken={foodSessionToken}
            setCreatePlanOpen={setCreatePlanOpen}
            profile={profile}
            mealPlanTone={mealPlanTone}
            setMealPlanTone={setMealPlanTone}
            mealPlanStatus={mealPlanStatus}
            setMealPlanStatus={setMealPlanStatus}
            mealPlanError={mealPlanError}
            sortedMealPlanDays={sortedMealPlanDays}
            selectedMealPlanDate={selectedMealPlanDate}
            setSelectedMealPlanDate={setSelectedMealPlanDate}
            todayKey={todayKey}
            selectedMealPlanDay={selectedMealPlanDay}
            mealPlanEatenSlots={mealPlanEatenSlots}
            toggleMealPlanMeal={toggleMealPlanMeal}
          />
        )}

        {section === 'settings' && (
          <SettingsScreen
            settingsMessage={settingsMessage}
            settingsError={settingsError}
            profileDisplayNameDraft={profileDisplayNameDraft}
            setProfileDisplayNameDraft={setProfileDisplayNameDraft}
            profile={profile}
            isOwnerSession={isOwnerSession}
            appearance={appearance}
            language={language}
            applyLanguage={applyLanguage}
            profileUnitsDraft={profileUnitsDraft}
            setProfileUnitsDraft={setProfileUnitsDraft}
            profileTimezoneDraft={profileTimezoneDraft}
            setProfileTimezoneDraft={setProfileTimezoneDraft}
            settingsSaving={settingsSaving}
            saveSettings={saveSettings}
            floorMessage={floorMessage}
            setSettingsFloorWarning={setSettingsFloorWarning}
            applyCalorieFloor={applyCalorieFloor}
            applyWaterGoal={applyWaterGoal}
            foodSessionToken={foodSessionToken}
            applyWorkoutCaloriesShare={applyWorkoutCaloriesShare}
            garminStatus={garminStatus}
            garminSyncing={garminSyncing}
            runGarminSync={runGarminSync}
            garminNote={garminNote}
            settingsFloorWarning={settingsFloorWarning}
            confirmDeleteKey={confirmDeleteKey}
            resetProfile={resetProfile}
            profileResetting={profileResetting}
          />
        )}

        {/* Prep sits under the week's meal plan: it serves those meals. */}
        {(section === 'meal-plan' || section === 'meal-prep') && (
          <MealPrepScreen
            mealPrepTone={mealPrepTone}
            mealPrepStatus={mealPrepStatus}
            mealPrepError={mealPrepError}
            mealPrepTasks={mealPrepTasks}
            cycleMealPrepStatus={cycleMealPrepStatus}
            mealPrepSavingId={mealPrepSavingId}
          />
        )}

        {section === 'meals' && (
          <MealsScreen
            mealDraft={mealDraft}
            updateMealName={updateMealName}
            updateMealServings={updateMealServings}
            mealScale={mealScale}
            setMealScale={setMealScale}
            resetMealDraft={resetMealDraft}
            updateMealIngredientGrams={updateMealIngredientGrams}
            mealPreview={mealPreview}
            mealTotalsPreview={mealTotalsPreview}
          />
        )}

        {section === 'recipes' && (
          <RecipesScreen
            recipeTone={recipeTone}
            recipeStatus={recipeStatus}
            recipeError={recipeError}
            recipeImportTone={recipeImportTone}
            recipeImportStatus={recipeImportStatus}
            recipeImportError={recipeImportError}
            recipeSearchTerm={recipeSearchTerm}
            setRecipeSearchTerm={setRecipeSearchTerm}
            recipeLoading={recipeLoading}
            filteredRecipeCatalog={filteredRecipeCatalog}
            selectedRecipeId={selectedRecipeId}
            setSelectedRecipeId={setSelectedRecipeId}
            recipeSavingId={recipeSavingId}
            selectedRecipe={selectedRecipe}
            selectedRecipePreview={selectedRecipePreview}
            selectedRecipeTotals={selectedRecipeTotals}
            toggleRecipeFavorite={toggleRecipeFavorite}
            recipeDetailLoading={recipeDetailLoading}
            recipeScale={recipeScale}
            setRecipeScale={setRecipeScale}
          />
        )}

        {section === 'ingestion' && (
          <IngestionScreen
            foodSessionToken={foodSessionToken}
            scanAutoStart={scanAutoStart}
            setScanAutoStart={setScanAutoStart}
            setFoodLog={setFoodLog}
          />
        )}

        {IS_DEVELOPMENT_BUILD ? (
          <Text style={styles.footer}>
            {Platform.OS === 'web'
              ? 'Browser preview runs with Expo web. For iPhone preview, run `npm start` in `frontend/` and scan the QR code with Expo Go.'
              : 'Running inside Expo. Use the same backend and switch devices without changing the frontend architecture.'}
          </Text>
        ) : null}
      </ScrollView>

      <TabBar
        activeTab={tabForSection(section)}
        onSelect={openTab}
        onWeighIn={() => {
          if (foodSessionToken) {
            setWeighInOpen(true);
          }
        }}
        onCamera={() => {
          if (foodSessionToken) {
            // From another tab, the camera logs to today; on Today, to the day showing.
            if (section !== 'dashboard') {
              setSelectedHomeDate(todayKey);
            }
            setQuickScanOpen(true);
          }
        }}
      />

      {(() => {
        const entry = workoutDetailId ? exerciseEntries.find((item) => item.id === workoutDetailId) : undefined;
        return entry ? (
          <WorkoutDetailSheet
            detail={buildWorkoutDetail(entry, profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE, profile?.units === 'metric', t)}
            onClose={() => setWorkoutDetailId(null)}
          />
        ) : null;
      })()}

      {weighInOpen ? (
        <PickerSheet
          title={t('weighIn.title')}
          note={weighInSummary(weightEntries, profile?.units === 'metric' ? 'metric' : 'imperial', todayKey, t)}
          columns={weighInColumns(profile?.units === 'metric' ? 'metric' : 'imperial', t)}
          initialIndexes={initialWeighInIndexes(
            profile?.units === 'metric' ? 'metric' : 'imperial',
            [...weightEntries].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).at(-1)?.weight_lbs ??
              profile?.current_weight_lbs ??
              null
          )}
          onCancel={() => setWeighInOpen(false)}
          onDone={(indexes) => {
            setWeighInOpen(false);
            void saveQuickWeighIn(weighInLbs(profile?.units === 'metric' ? 'metric' : 'imperial', indexes));
          }}
        />
      ) : null}

      {toast ? (
        <View style={styles.toast} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={styles.toastLabel}>{toast}</Text>
        </View>
      ) : null}

      {createPlanOpen && foodSessionToken ? (
        <CreateMealPlan
          accessToken={foodSessionToken}
          existingPlans={mealPlanDays}
          onClose={() => setCreatePlanOpen(false)}
          onShoppingList={(listId) => {
            setCreatePlanOpen(false);
            setShoppingListId(listId);
            setOpenSheet('shopping-lists');
          }}
          onCreated={() => {
            const token = foodSessionToken;
            void fetchMealPlanDays(token)
              .then(setMealPlanDays)
              .catch(() => undefined);
          }}
        />
      ) : null}

      {suggestOpen && foodSessionToken ? (
        <SuggestMealSheet
          accessToken={foodSessionToken}
          logDate={suggestDate}
          dayName={
            suggestDate === todayKey ? 'today' : formatDate(new Date(`${suggestDate}T00:00:00`), { weekday: 'long' }, t.locale)
          }
          blocks={['breakfast', 'lunch', 'dinner']}
          defaultBlock={defaultSuggestBlock()}
          onClose={() => setSuggestOpen(false)}
          onLogged={() => {
            void refreshHomeFoodLog();
            // A replaced planned meal disappears from Today.
            const token = foodSessionToken;
            if (token) {
              void fetchMealPlanDays(token)
                .then(setMealPlanDays)
                .catch(() => undefined);
            }
          }}
        />
      ) : null}

      {quickScanOpen && foodSessionToken ? (
        <QuickScanAdd
          accessToken={foodSessionToken}
          logDate={selectedHomeDate}
          dayName={homeDayName}
          onClose={() => setQuickScanOpen(false)}
          onSearch={() => {
            setQuickScanOpen(false);
            setOpenSheet('food-search');
          }}
          onQuickCalories={() => {
            setQuickScanOpen(false);
            setOpenSheet('quick-calories');
          }}
          onAdded={() => {
            setQuickScanOpen(false);
            void refreshHomeFoodLog();
          }}
        />
      ) : null}

      {openSheet === 'food-search' && foodSessionToken ? (
        <FoodSearchSheet
          accessToken={foodSessionToken}
          logDate={selectedHomeDate}
          dayName={homeDayName}
          onClose={() => setOpenSheet(null)}
          onAdded={() => {
            setOpenSheet(null);
            void refreshHomeFoodLog();
          }}
        />
      ) : null}

      {openSheet === 'add-workout' && foodSessionToken ? (
        <AddWorkoutSheet
          accessToken={foodSessionToken}
          logDate={selectedHomeDate}
          dayName={homeDayName}
          metric={profile?.units === 'metric'}
          onClose={() => setOpenSheet(null)}
          onAdded={() => {
            setOpenSheet(null);
            const token = foodSessionToken;
            void fetchExerciseEntries(token)
              .then((entries) => setExerciseEntries(entries))
              .catch(() => undefined);
          }}
        />
      ) : null}

      {openSheet === 'shopping-lists' && foodSessionToken ? (
        <ShoppingListsSheet accessToken={foodSessionToken} initialListId={shoppingListId} onClose={() => setOpenSheet(null)} />
      ) : null}

      {openSheet === 'quick-calories' && foodSessionToken ? (
        <QuickCaloriesSheet
          accessToken={foodSessionToken}
          logDate={selectedHomeDate}
          dayName={homeDayName}
          onClose={() => setOpenSheet(null)}
          onAdded={() => {
            setOpenSheet(null);
            void refreshHomeFoodLog();
          }}
        />
      ) : null}

      {openSheet === 'add-food' ? (
        <ActionSheet
          title={selectedHomeDate === todayKey ? t('addFood.titleToday') : t('addFood.title')}
          actions={[
            {
              id: 'search',
              label: t('addFood.search'),
              detail: t('addFood.searchDetail'),
              icon: '🔎',
              onPress: () => setOpenSheet('food-search')
            },
            {
              id: 'scan',
              label: t('addFood.scan'),
              detail: t('addFood.scanDetail'),
              icon: '📷',
              onPress: () => setQuickScanOpen(true)
            },
            {
              id: 'quick-calories',
              label: t('addFood.quickCalories'),
              detail: t('addFood.quickCaloriesDetail'),
              icon: '✏️',
              onPress: () => setOpenSheet('quick-calories')
            },
            {
              id: 'suggest',
              label: t('addFood.suggest'),
              detail: t('addFood.suggestDetail'),
              icon: '✨',
              onPress: openSuggest
            }
          ]}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}

      {openSheet === 'account' ? (
        <ActionSheet
          title={profile?.display_name || t('account.title')}
          actions={[
            {
              id: 'profile',
              label: t('account.profile'),
              detail: t('account.profileDetail'),
              icon: '🥒',
              onPress: () => handleSectionChange('profile')
            },
            {
              id: 'food-bank',
              label: t('account.foodBank'),
              detail: t('account.foodBankDetail'),
              icon: '🥫',
              onPress: () => handleSectionChange('foods')
            },
            {
              id: 'shopping-lists',
              label: t('account.shoppingLists'),
              detail: t('account.shoppingListsDetail'),
              icon: '🛒',
              onPress: () => {
                setShoppingListId(null);
                setOpenSheet('shopping-lists');
              }
            },
            {
              id: 'settings',
              label: t('account.settings'),
              detail: t('account.settingsDetail'),
              icon: '⚙️',
              onPress: () => handleSectionChange('settings')
            },
            // Development sessions only: the owner never sees these.
            ...(isOwnerSession
              ? []
              : entryMode === 'live'
                ? [
                    { id: 'preview', label: t('account.switchToPreview'), onPress: enterPreviewMode },
                    { id: 'logout', label: t('account.logOut'), onPress: logoutToEntryScreen }
                  ]
                : [{ id: 'entry', label: t('account.changeEntryMode'), onPress: returnToEntryScreen }])
          ]}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
