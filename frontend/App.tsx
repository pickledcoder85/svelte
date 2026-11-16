import { MASCOT_OUTLINE, resolveColor, tc } from './src/theme/palette';
import { APPEARANCE_OPTIONS, setAppearance, startAppearance, useAppearance, usePalette } from './src/theme/appearance';
import { StatusBar } from 'expo-status-bar';
import { Ribeye_400Regular, useFonts as useRibeyeFonts } from '@expo-google-fonts/ribeye';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import {
  ActivityIndicator,
  AppState,
  type DimensionValue,
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';

import {
  addFavoriteFood,
  createExerciseEntry,
  createPlannedWorkoutSession,
  createLocalSession,
  deleteExerciseEntry,
  deleteFoodLogEntry,
  updateExerciseEntry,
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
import { buildTrendChartGeometry, remainingCalories, selectRangeSeries } from './src/lib/dashboard';
import {
  buildDailyMealPlanSummary,
  buildDailyTargetSummary,
  DEFAULT_WORKOUT_CALORIES_SHARE,
  WORKOUT_CALORIE_SHARES,
  type WorkoutCaloriesShare
} from './src/lib/daily-home';
import { buildCalorieBudget } from './src/lib/calorie-budget';
import { CalorieBudgetCard } from './src/components/CalorieBudgetCard';
import { WorkoutDetailSheet } from './src/components/WorkoutDetailSheet';
import { DayHeader } from './src/components/DayHeader';
import { MacroRing } from './src/components/MacroRing';
import {
  blockBudgets,
  DEFAULT_SPLITS,
  isValidSplit,
  MEAL_STYLES,
  RECOMMENDED_MEALS_PER_DAY,
  styleForSplit,
  type MealsPerDay
} from './src/lib/meal-split';
import { CalorieBars } from './src/components/trends/CalorieBars';
import { DayHistory } from './src/components/trends/DayHistory';
import { WeightTrendChart } from './src/components/trends/WeightTrendChart';
import {
  averageMacros,
  buildDaySeries,
  calorieSummary,
  rangeStart,
  TREND_RANGES,
  weeklyRate,
  weightTrend,
  type TrendRange
} from './src/lib/trends';
import { initialWeighInIndexes, weighInColumns, weighInLbs, weighInSummary } from './src/lib/weigh-in';
import { QuickScanAdd } from './src/components/QuickScanAdd';
import { FoodSearchSheet } from './src/components/FoodSearchSheet';
import { QuickCaloriesSheet } from './src/components/QuickCaloriesSheet';
import { groupByMeal } from './src/lib/meal-slots';
import { buildWorkoutDetail } from './src/lib/workout-detail';
import { garminStatusText, garminSyncIsStale, workoutSourceLabel } from './src/lib/garmin';
import { APP_TABS, subTabsForSection, tabForSection, type AppTabId } from './src/lib/app-shell';
import { ActionSheet } from './src/components/ActionSheet';
import { SubTabs } from './src/components/SubTabs';
import { TabBar } from './src/components/TabBar';
import { DashboardTimeRangeTabs } from './src/components/dashboard/DashboardTimeRangeTabs';
import { DashboardHeroChart } from './src/components/dashboard/DashboardHeroChart';
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
  sortFoodsForPicker,
  formatFoodAmount
} from './src/lib/foods';
import { mealTotals, progressPercent, recipeScaleLabel, round1, scaleMealIngredients } from './src/lib/nutrition';
import { IngestionReviewPanel } from './src/components/IngestionReviewPanel';
import { CogIcon } from './src/components/CogIcon';
import { ChoiceSheet } from './src/components/ChoiceSheet';
import { ActivityCaption, ActivityEnergyBars, ActivitySlider } from './src/components/ActivityLevel';
import { formatAllergySelection, missingOtherAllergy, parseAllergySelection, type AllergyChoice } from './src/lib/allergies';
import { ACTIVITY_LEVELS, maintenanceForLevel } from './src/lib/activity-level';
import appConfig from './app.json';
import { FIELD_BOX, FIELD_HEIGHT, FieldGroup, PickerField } from './src/components/FormField';
import { PickerSheet } from './src/components/PickerSheet';
import {
  draftsFromWheel,
  formatBodyField,
  initialWheelIndexes,
  wheelColumns,
  type BodyField,
  type WheelDrafts
} from './src/lib/wheel-picker';
import {
  buildDemoPlannedWorkoutSessions,
  buildPlannedWorkoutPayload,
  buildOptimisticPlannedWorkoutSession,
  mapPlannedWorkoutSessionToEntry,
  sortPlannedWorkoutSessions,
  defaultWarmupTitle,
  defaultCooldownTitle,
  buildPlannedWorkoutEditDraft
} from './src/lib/planned-workouts';
import { fallbackForMode, liveLoadErrorMessage, type EntryMode } from './src/lib/live-fallback';
import { isTailnetHost, resolveOwnerAccess } from './src/lib/owner-access';
import { addDaysToDateKey, localDateKey } from './src/lib/dates';
import { registerServiceWorker } from './src/lib/service-worker';
import {
  FONT_WAIT_MS,
  holdSplashForFonts,
  launchSplashSize,
  msSinceLaunch,
  splashHoldRemaining
} from './src/lib/launch-splash';
import { ONBOARDING_WELCOME } from './src/lib/onboarding-welcome';
import { explainerBefore, ONBOARDING_EXPLAINERS, type ExplainerStep } from './src/lib/onboarding-explainers';
import {
  DEFAULT_PACE,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  estimateGoalDate,
  findPreviewOption,
  formatApproximateDate,
  formatCalories,
  formatWeeklyRate,
  goalLabel,
  isPaceForGoal,
  caloriesToMoveMore,
  needsFloorWarning,
  paceDisplay,
  paceLabel,
  VERY_LOW_CALORIE_LIMIT,
  withCalorieFloor,
  type CalorieFloorChoice,
  type GoalPace,
  type TargetPreview,
  type TargetPreviewOption
} from './src/lib/setup-goals';
import { dismissLaunchSplash } from './src/lib/launch-splash-dom';
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
import { parseNonNegativeInt, parsePositiveInt, scaleEntryToGrams } from './src/lib/entry-edits';
import {
  clearStoredSessionToken,
  loadStoredSessionToken,
  storeSessionToken
} from './src/lib/session-store';
import type {
  AppSection,
  GarminStatus,
  DashboardRange,
  DashboardSnapshot,
  DashboardMetricKey,
  DashboardRangeSeries,
  ExerciseEntry,
  FoodItem,
  FoodLogEntry,
  FoodLogSummary,
  MealInput,
  MealTotals,
  MealPlanDay,
  MealPrepTask,
  PlannedExerciseEntry,
  PlannedWorkoutSession,
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
  demoPlannedExerciseEntries,
  demoProfileProgress,
  demoWeightEntries
} from './src/mock-data';
const rangeTabs: DashboardRange[] = ['1D', '1W', '1M', '3M'];
const scaleStops = [0.5, 1, 1.25, 1.5, 2] as const;
type ScaleStop = (typeof scaleStops)[number];
const chartHeight = 160;
const mascotDefaultImage = require('./assets/mascot.png');
const mascotAvatarImage = require('./assets/mascot-avatar.png');
const mascotWeightsImage = require('./assets/weights.png');
const mascotBikeImage = require('./assets/bike.png');
const mascotRunImage = require('./assets/run.png');
const mascotSwimImage = require('./assets/swim.png');
const RELISH_COLORS = {
  canvas: tc.bg_f6f1e7,
  surface: tc.bg_fffdf8,
  text: tc.fg_163127,
  muted: tc.fg_63776a,
  primary: tc.brand_primary,
  primaryDeep: tc.brand_primaryDeep,
  primarySoft: tc.brand_primarySoft,
  accent: tc.brand_accent,
  accentSoft: tc.brand_accentSoft,
  stroke: tc.brand_stroke
} as const;
const exercisePresets: Array<{
  id: 'weights' | 'bike' | 'run' | 'swim';
  label: string;
  title: string;
  minutes: string;
  calories: string;
  image: ImageSourcePropType;
}> = [
  {
    id: 'weights',
    label: 'Weights',
    title: 'Strength session',
    minutes: '45',
    calories: '280',
    image: mascotWeightsImage
  },
  {
    id: 'bike',
    label: 'Bike',
    title: 'Bike ride',
    minutes: '30',
    calories: '220',
    image: mascotBikeImage
  },
  {
    id: 'run',
    label: 'Run',
    title: 'Run',
    minutes: '35',
    calories: '320',
    image: mascotRunImage
  },
  {
    id: 'swim',
    label: 'Swim',
    title: 'Swim laps',
    minutes: '40',
    calories: '340',
    image: mascotSwimImage
  }
];
type DietaryPattern = 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'carnivore';
type NutritionStyle = 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'mediterranean' | 'paleo';
// 'welcome' is the intro card before the numbered steps; it is not in onboardingSteps.
type OnboardingStep = 'welcome' | 'basics' | 'goal' | 'pace' | 'activity' | 'diet' | 'style' | 'allergies' | 'review';

// Activity comes before the goal so the goal screens can show real calorie numbers.
const onboardingSteps: Array<{ id: OnboardingStep; label: string }> = [
  { id: 'basics', label: 'About you' },
  { id: 'activity', label: 'Activity' },
  { id: 'goal', label: 'Your goal' },
  { id: 'pace', label: 'Pace or focus' },
  { id: 'diet', label: 'Diet' },
  { id: 'style', label: 'Nutrition style' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'review', label: 'Review' }
];

const dietaryPatternOptions: Array<{
  id: DietaryPattern;
  /** Emoji, drawn by the phone's own emoji font (no images to ship). */
  icon: string;
  title: string;
  subtitle: string;
}> = [
  { id: 'vegan', icon: '🥦', title: 'Vegan', subtitle: 'Plants only' },
  { id: 'vegetarian', icon: '🥗', title: 'Vegetarian', subtitle: 'No meat or fish' },
  { id: 'pescatarian', icon: '🐟', title: 'Pescatarian', subtitle: 'Fish, dairy, and plants' },
  { id: 'omnivore', icon: '🍗', title: 'Omnivore', subtitle: 'Balanced mixed diet' },
  { id: 'carnivore', icon: '🥩', title: 'Carnivore', subtitle: 'Animal-based focus' }
];

const nutritionStyleOptions: Array<{
  id: NutritionStyle;
  /** Emoji, drawn by the phone's own emoji font (no images to ship). */
  icon: string;
  title: string;
  subtitle: string;
}> = [
  { id: 'balanced', icon: '🍽️', title: 'Balanced', subtitle: 'Flexible mixed approach' },
  { id: 'high_protein', icon: '🍳', title: 'High protein', subtitle: 'Protein at every meal, for strength and keeping muscle' },
  { id: 'low_carb', icon: '🥬', title: 'Low carb', subtitle: 'Fewer carbs: about 50–130 g a day' },
  { id: 'keto', icon: '🥑', title: 'Keto', subtitle: 'Very low carb: under about 50 g a day, higher fat' },
  { id: 'mediterranean', icon: '🫒', title: 'Mediterranean', subtitle: 'Whole foods, olive oil, fish, plants' },
  { id: 'paleo', icon: '🍖', title: 'Paleo', subtitle: 'Meat, fish, vegetables, fruit, and nuts; no grains or dairy' }
];

const allergyOptions: Array<{
  id: AllergyChoice;
  /** Emoji, drawn by the phone's own emoji font (no images to ship). */
  icon: string;
  title: string;
  subtitle: string;
}> = [
  { id: 'none', icon: '✅', title: 'None', subtitle: 'No major food allergies' },
  { id: 'milk', icon: '🥛', title: 'Milk', subtitle: 'Avoid dairy milk proteins' },
  { id: 'egg', icon: '🥚', title: 'Egg', subtitle: 'Avoid eggs and egg ingredients' },
  { id: 'peanut', icon: '🥜', title: 'Peanut', subtitle: 'Avoid peanuts' },
  { id: 'tree_nuts', icon: '🌰', title: 'Tree nuts', subtitle: 'Avoid almonds, cashews, walnuts' },
  { id: 'wheat', icon: '🌾', title: 'Wheat', subtitle: 'Avoid wheat-based foods' },
  { id: 'shellfish', icon: '🦐', title: 'Shellfish', subtitle: 'Avoid shrimp, crab, lobster' },
  { id: 'other', icon: '✏️', title: 'Other', subtitle: 'Add a custom restriction' }
];

// Titles and descriptions live with the setup step (src/lib/activity-level.ts).
const activityLevelCards = ACTIVITY_LEVELS.map((level) => ({
  id: level.id,
  title: level.title,
  subtitle: `${level.description} · ${level.steps}`
}));

function toneColor(tone: 'checking' | 'live'): string {
  if (tone === 'live') {
    return tc.line_0f766e;
  }
  return tc.line_1d4ed8;
}

function formatGoalTypeLabel(goalType: 'lose' | 'maintain' | 'gain' | null | undefined): string {
  return goalLabel(goalType);
}

/** The first word of a name, for greetings ("Brian Miner" → "Brian"). */
function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

function formatGoalPaceLabel(goalType: 'lose' | 'maintain' | 'gain', goalPace: GoalPace | null): string {
  return paceLabel(goalType, goalPace);
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

function selectExercisePreset(title: string): (typeof exercisePresets)[number] {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes('bike') || normalized.includes('cycle')) {
    return exercisePresets[1];
  }
  if (normalized.includes('run') || normalized.includes('jog')) {
    return exercisePresets[2];
  }
  if (normalized.includes('swim')) {
    return exercisePresets[3];
  }
  return exercisePresets[0];
}

// Colour variables and the light/dark choice, before the first render.
if (Platform.OS === 'web') {
  startAppearance();
}

export default function App(): ReactElement {
  const palette = usePalette();
  const appearance = useAppearance();
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
  const [openSheet, setOpenSheet] = useState<'account' | 'add-food' | 'food-search' | 'quick-calories' | null>(null);
  const [workoutDetailId, setWorkoutDetailId] = useState<string | null>(null);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [scanAutoStart, setScanAutoStart] = useState(false);
  const [weighInOpen, setWeighInOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>('1M');
  const [trendLogs, setTrendLogs] = useState<FoodLogSummary[]>([]);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  // Where the weigh-in card sits on Trends, and whether ＋ → Weigh-in should scroll to it.
  const weighInY = useRef(0);
  const trendsPanelY = useRef(0);
  const [scrollToWeighIn, setScrollToWeighIn] = useState(false);
  const [activeRange, setActiveRange] = useState<DashboardRange>('1D');
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
  const [profileGoals, setProfileGoals] = useState<UserGoal[]>([]);
  const [profileTone, setProfileTone] = useState<'checking' | 'live'>('checking');
  const [profileStatus, setProfileStatus] = useState('Loading profile settings');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [profileProgress, setProfileProgress] = useState<ProfileProgress | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightRecordedAtDraft, setWeightRecordedAtDraft] = useState(() => localDateKey());
  const [weightValueDraft, setWeightValueDraft] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
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
  const [onboardingAllergySelectionsDraft, setOnboardingAllergySelectionsDraft] = useState<AllergyChoice[]>(['none']);
  const [onboardingAllergyOtherDraft, setOnboardingAllergyOtherDraft] = useState('');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState('Loading first-run setup');

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

  const [logFoodDraft, setLogFoodDraft] = useState('chicken');
  const [logFoodSearchTerm, setLogFoodSearchTerm] = useState('chicken');
  const [logFoodResults, setLogFoodResults] = useState<FoodItem[]>([]);
  const [selectedLogFoodId, setSelectedLogFoodId] = useState('');
  const [logGrams, setLogGrams] = useState('100');
  // Re-read when the app returns to the foreground so an app left open overnight rolls over.
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const [selectedHomeDate, setSelectedHomeDate] = useState(todayKey);
  const [foodLog, setFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog());
  const [homeFoodLog, setHomeFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog(todayKey));
  const [foodLogTone, setFoodLogTone] = useState<'checking' | 'live'>('checking');
  const [foodLogStatus, setFoodLogStatus] = useState("Loading today's log");
  const [foodLogError, setFoodLogError] = useState<string | null>(null);
  const [foodLogLoading, setFoodLogLoading] = useState(true);
  const [isSavingLogEntry, setIsSavingLogEntry] = useState(false);
  const [logSearchTone, setLogSearchTone] = useState<'checking' | 'live'>('checking');
  const [logSearchStatus, setLogSearchStatus] = useState('Ready to search');
  const [logSearchError, setLogSearchError] = useState<string | null>(null);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [plannedExerciseEntries, setPlannedExerciseEntries] = useState<PlannedExerciseEntry[]>([]);
  const [plannedWorkoutSessions, setPlannedWorkoutSessions] = useState<PlannedWorkoutSession[]>([]);
  const [exerciseTitleDraft, setExerciseTitleDraft] = useState('Bike ride');
  const [exerciseMinutesDraft, setExerciseMinutesDraft] = useState('30');
  const [exerciseCaloriesDraft, setExerciseCaloriesDraft] = useState('220');
  const [plannedExerciseTitleDraft, setPlannedExerciseTitleDraft] = useState('Swim');
  const [plannedExerciseMinutesDraft, setPlannedExerciseMinutesDraft] = useState('55');
  const [plannedExerciseWarmupEnabled, setPlannedExerciseWarmupEnabled] = useState(false);
  const [plannedExerciseWarmupMinutesDraft, setPlannedExerciseWarmupMinutesDraft] = useState('10');
  const [plannedExerciseCooldownEnabled, setPlannedExerciseCooldownEnabled] = useState(false);
  const [plannedExerciseCooldownMinutesDraft, setPlannedExerciseCooldownMinutesDraft] = useState('8');
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
  const [mealPlanEatenSlots, setMealPlanEatenSlots] = useState<Record<string, Record<string, string>>>({});
  // Inline edit/delete of logged food and exercise. Delete asks for a second tap.
  const [editingFoodEntryId, setEditingFoodEntryId] = useState<string | null>(null);
  const [editingFoodGramsDraft, setEditingFoodGramsDraft] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseMinutesDraft, setEditingExerciseMinutesDraft] = useState('');
  const [editingExerciseCaloriesDraft, setEditingExerciseCaloriesDraft] = useState('');
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
  const activeExercisePreset = useMemo(() => selectExercisePreset(exerciseTitleDraft), [exerciseTitleDraft]);
  const activePlannedExercisePreset = useMemo(() => selectExercisePreset(plannedExerciseTitleDraft), [plannedExerciseTitleDraft]);
  const plannedExerciseDurationValue = Number(plannedExerciseMinutesDraft);
  const estimatedPlannedExerciseCalories = useMemo(
    () =>
      Number.isFinite(plannedExerciseDurationValue) && plannedExerciseDurationValue > 0
        ? estimatePlannedExerciseCalories(plannedExerciseDurationValue, activePlannedExercisePreset)
        : 0,
    [activePlannedExercisePreset, plannedExerciseDurationValue]
  );
  const [exerciseSaving, setExerciseSaving] = useState(false);
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
          fetchWeeklyMetrics(foodSessionToken)
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
        setSnapshot(createEmptyDashboardSnapshot());
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
        setProfileProgress(fallbackForMode(entryMode, demoProfileProgress, null));
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
        setProfileProgress(null);
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
        setTrackerTone('checking');
        setTrackerStatus(isPreview ? 'Preview tracker loaded' : 'Tracker unavailable');
        setTrackerError(
          isPreview ? 'No active tracker session. Showing preview tracker data.' : 'No active tracker session. Sign in again.'
        );
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
        setTrackerTone('live');
        setTrackerStatus(
          exercise.length > 0
            ? `${exercise.length} tracked exercise entr${exercise.length === 1 ? 'y' : 'ies'} loaded`
            : 'No saved exercise yet'
        );

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
        setTrackerTone('checking');
        setTrackerStatus('Tracker unavailable');
        setTrackerError(liveLoadErrorMessage(error, 'Tracker data'));
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
      setFoodLogLoading(true);
      setFoodLogTone('checking');
      setFoodLogStatus("Loading today's log");
      setFoodLogError(null);

      if (!foodSessionToken) {
        const isPreview = entryMode === 'preview';
        setFoodLog(fallbackForMode(entryMode, demoFoodLog, createEmptyFoodLog()));
        setFoodLogTone('checking');
        setFoodLogStatus(isPreview ? 'Preview daily log loaded' : 'Daily log unavailable');
        setFoodLogError(
          isPreview ? 'No active food session. Showing preview daily log.' : 'No active food session. Sign in again.'
        );
        setFoodLogLoading(false);
        return;
      }

      try {
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
        setFoodLogTone('checking');
        setFoodLogStatus('Daily log unavailable');
        setFoodLogError(liveLoadErrorMessage(error, 'Daily log'));
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
        const results = await searchFoods(query, foodSessionToken);

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
  }, [entryMode, foodSessionToken, logFoodSearchTerm]);

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
  const homeDayName =
    selectedHomeDate === todayKey
      ? 'today'
      : new Date(`${selectedHomeDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
  const homeMealGroups = useMemo(() => groupByMeal(homeFoodLog.entries), [homeFoodLog.entries]);
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
        sharePercent: profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE
      }),
    [trendStart, todayKey, trendLogs, exerciseEntries, dailyHomeTargets.calorieTarget, profile?.workout_calories_share]
  );
  const trendCalories = useMemo(() => calorieSummary(trendDays), [trendDays]);
  const trendMacros = useMemo(() => averageMacros(trendDays), [trendDays]);
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
  const homeOpenPlannedMeals = useMemo(
    () => (homeMealPlanDay ? homeMealPlanDay.slots.filter((slot) => !homeMealPlanEatenSlots[slot.id]) : []),
    [homeMealPlanDay, homeMealPlanEatenSlots]
  );
  const dailyMealPlanSummary = useMemo(
    () => buildDailyMealPlanSummary(homeMealPlanDay, homeMealPlanEatenSlots),
    [homeMealPlanDay, homeMealPlanEatenSlots]
  );
  const homeCalorieBudget = useMemo(
    () =>
      buildCalorieBudget({
        summary: dailyHomeTargets,
        sharePercent: profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE,
        bmrCalories: profile?.bmr_calories,
        maintenanceCalories: profile?.tdee_calories,
        workouts: homeCompletedExerciseEntries
      }),
    [dailyHomeTargets, homeCompletedExerciseEntries, profile]
  );
  const homeConsumedMacros = homeFoodLog.totals.macros;
  const homeConsumedCalories = dailyHomeTargets.intakeCalories;
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
    // Nutrition is per serving; a weight needs the serving's weight to convert.
    if (!selectedLogFood || !selectedLogFood.serving_grams) {
      return null;
    }

    const grams = Number(logGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      return null;
    }

    const multiplier = grams / selectedLogFood.serving_grams;
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
      accentColor: tc.fg_0f766e,
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
      accentColor: tc.fg_ea580c,
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
      accentColor: tc.fg_2563eb,
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
      accentColor: tc.fg_7c3aed,
      ringPercentage: fiberConsumed > 0 && fiberGoal > 0 ? (fiberConsumed / fiberGoal) * 100 : 0,
      ringText: fiberConsumed > 0 && fiberGoal > 0 ? `${Math.round((fiberConsumed / fiberGoal) * 100)}%` : '—',
      chartTitle: `Fiber tracked across ${activeRange}`,
      legendLabel: 'Daily fiber'
    }
  };
  const activeMetricConfig = dashboardMetricConfig.net_calories;
  const homeChartPoints = useMemo(() => {
    if (activeRange === '1D') {
      const checkpoints = [
        { label: '12a', hour: 0 },
        { label: '6a', hour: 6 },
        { label: '12p', hour: 12 },
        { label: '6p', hour: 18 },
        { label: '12a', hour: 24 },
      ];
      const sortedLoggedEntries = [...homeFoodLog.entries]
        .map((entry) => ({ entry, parsed: new Date(entry.logged_at) }))
        .filter((item) => item.parsed && !Number.isNaN(item.parsed.getTime()))
        .sort((left, right) => left.parsed!.getTime() - right.parsed!.getTime());

      return [
        ...checkpoints.map((checkpoint) => {
          const cumulative = sortedLoggedEntries.reduce((sum, item) => {
            const parsed = item.parsed!;
            const hour = parsed.getHours() + parsed.getMinutes() / 60;
            const normalizedHour = checkpoint.hour === 24 ? 24 : hour;
            if (normalizedHour <= checkpoint.hour) {
              return sum + item.entry.calories;
            }
            return sum;
          }, 0);
          return { label: checkpoint.label, calories: cumulative };
        })
      ];
    }

    if (activeMetricConfig.points.length === 0) {
      return activeMetricConfig.points;
    }

    const adjustedLastCalories = Math.max(0, homeConsumedCalories);

    return activeMetricConfig.points.map((point, index) =>
      index === activeMetricConfig.points.length - 1 ? { ...point, calories: adjustedLastCalories } : point
    );
  }, [activeMetricConfig.points, activeRange, homeConsumedCalories, homeFoodLog.entries]);
  const homeChartTargetValue =
    activeRange === '1D' ? dailyHomeTargets.allowanceCalories : activeMetricConfig.targetValue;
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
      // The server works out calories from the food (quantity = number of servings).
      await logFood({ food_id: food.id, log_date: localDateKey(), servings: quantity }, foodSessionToken);
      setFoodLog(await fetchTodaysFoodLog(foodSessionToken));
      setFoodLogTone('live');
      setFoodLogStatus(`Added ${formatFoodAmount(food, quantity)} of ${food.name} to today`);
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
    const measurements = bodyMeasurementsFromDrafts(onboardingUnitsDraft, onboardingBodyDrafts());

    if (!Number.isFinite(age_years) || age_years <= 0 || measurements === null) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError('Enter a valid age, height, and weight before continuing.');
      return;
    }

    if (!foodSessionToken) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError('Create a live local session before continuing to the app.');
      return;
    }

    const allergy_notes = formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft);

    setOnboardingSaving(true);
    setOnboardingStatus('Saving your first-run setup');
    setOnboardingError(null);

    if (!onboardingSexDraft || !onboardingGoalTypeDraft || !onboardingDietaryPatternDraft || !onboardingNutritionStyleDraft) {
      setOnboardingSaving(false);
      setOnboardingStatus('Finish setup before saving');
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
          calorie_floor: onboardingCalorieFloorDraft,
          display_name: profileDisplayNameDraft.trim() || null
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
      setOnboardingStep('review');
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
    if (!selectedLogFood.serving_grams) {
      setFoodLogTone('checking');
      setFoodLogStatus(`No serving weight for ${selectedLogFood.name} yet`);
      setFoodLogError('This food has no serving weight yet, so it can only be added by servings (Food Search).');
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
      // By weight; the server converts grams to servings with the food's serving weight.
      await logFood({ food_id: selectedLogFood.id, log_date: localDateKey(), grams: round1(grams) }, foodSessionToken);
      setFoodLog(await fetchTodaysFoodLog(foodSessionToken));
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
      setFoodLogError('Sign in again to edit this entry.');
      return;
    }
    if (!payload) {
      setFoodLogError('Enter an amount in grams greater than 0.');
      return;
    }
    const key = `food:${entry.id}`;
    setEntryActionBusyKey(key);
    setFoodLogError(null);
    try {
      const updated = await updateFoodLogEntry(foodLog.log_id, entry.id, payload, foodSessionToken);
      setFoodLog(updated);
      setFoodLogTone('live');
      setFoodLogStatus(`${entry.food_name} updated to ${payload.grams} g`);
      setEditingFoodEntryId(null);
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : 'Unable to update this entry.');
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
      setFoodLogTone('live');
      setFoodLogStatus(`${entry.food_name} removed`);
    } catch (error) {
      setFoodLogError(error instanceof Error ? error.message : 'Unable to delete this entry.');
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
    }
  }

  async function saveExerciseEdit(entry: ExerciseEntry) {
    const minutes = parsePositiveInt(editingExerciseMinutesDraft);
    const calories = parseNonNegativeInt(editingExerciseCaloriesDraft);
    if (!foodSessionToken) {
      setTrackerError('Sign in again to edit exercise.');
      return;
    }
    if (minutes === null || calories === null) {
      setTrackerError('Enter at least 1 minute and 0 or more calories.');
      return;
    }
    const key = `exercise:${entry.id}`;
    setEntryActionBusyKey(key);
    setTrackerError(null);
    try {
      const updated = await updateExerciseEntry(
        entry.id,
        {
          title: entry.title,
          duration_minutes: minutes,
          calories_burned: calories,
          logged_on: entry.logged_on,
          logged_at: entry.logged_at,
          intensity: entry.intensity
        },
        foodSessionToken
      );
      setExerciseEntries((current) => current.map((item) => (item.id === entry.id ? updated : item)));
      setTrackerTone('live');
      setTrackerStatus(`${entry.title} updated`);
      setEditingExerciseId(null);
    } catch (error) {
      setTrackerError(error instanceof Error ? error.message : 'Unable to update this exercise.');
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
    const shown = units === 'metric' ? `${Math.round(weightLbs * 0.45359237 * 10) / 10} kg` : `${weightLbs} lb`;
    try {
      await createWeightEntry({ recorded_at: todayKey, weight_lbs: weightLbs }, token);
      const [progress, weights] = await Promise.all([fetchProfileProgress(token), fetchWeightEntries(token)]);
      setProfileProgress(progress);
      setWeightEntries(weights);
      setToast(`Saved ${shown} for today`);
    } catch (error) {
      setToast(error instanceof Error ? `Couldn't save: ${error.message}` : "Couldn't save the weigh-in");
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
      setFoodLogError(error instanceof Error ? error.message : 'Unable to delete this entry.');
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
    setTrackerError(null);
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
      setTrackerTone('live');
      setTrackerStatus(`${entry.title} removed`);
    } catch (error) {
      setTrackerError(error instanceof Error ? error.message : 'Unable to delete this exercise.');
    } finally {
      setEntryActionBusyKey((current) => (current === key ? null : current));
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
      logged_on: todayKey,
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

  async function addPlannedExerciseEntry() {
    const duration_minutes = Number(plannedExerciseMinutesDraft);
    const warmup_minutes = Number(plannedExerciseWarmupMinutesDraft);
    const cooldown_minutes = Number(plannedExerciseCooldownMinutesDraft);
    const title = plannedExerciseTitleDraft.trim();

    if (!title || !Number.isFinite(duration_minutes) || duration_minutes <= 0) {
      setTrackerTone('checking');
      setTrackerStatus(`Could not ${plannedExerciseEditingId ? 'update' : 'plan'} ${title || 'workout'}`);
      setTrackerError('Enter a workout title and a valid duration before saving planned exercise.');
      return;
    }

    const estimatedCaloriesBurned = estimatePlannedExerciseCalories(duration_minutes, activePlannedExercisePreset);
    if (!Number.isFinite(estimatedCaloriesBurned) || estimatedCaloriesBurned <= 0) {
      setTrackerTone('checking');
      setTrackerStatus(`Could not ${plannedExerciseEditingId ? 'update' : 'plan'} ${title}`);
      setTrackerError('Enter a valid duration so the planned calorie estimate can be generated.');
      return;
    }

    if (plannedExerciseWarmupEnabled && (!Number.isFinite(warmup_minutes) || warmup_minutes <= 0)) {
      setTrackerTone('checking');
      setTrackerStatus(`Could not ${plannedExerciseEditingId ? 'update' : 'plan'} ${title}`);
      setTrackerError('Enter valid warmup minutes or turn warmup off.');
      return;
    }

    if (plannedExerciseCooldownEnabled && (!Number.isFinite(cooldown_minutes) || cooldown_minutes <= 0)) {
      setTrackerTone('checking');
      setTrackerStatus(`Could not ${plannedExerciseEditingId ? 'update' : 'plan'} ${title}`);
      setTrackerError('Enter valid cooldown minutes or turn cooldown off.');
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
    setTrackerTone('checking');
    setTrackerStatus(`${plannedExerciseEditingId ? 'Updating' : 'Planning'} ${title}`);
    setTrackerError(null);
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
      setTrackerTone('live');
      setTrackerStatus(
        `${title} ${plannedExerciseEditingId ? 'updated for' : 'planned for'} ${formatHomeDateLabel(selectedHomeDate, todayKey)}`
      );
      resetPlannedExerciseDrafts();
    } catch (error) {
      setPlannedWorkoutSessions(previousSessions);
      setPlannedExerciseEntries(sortPlannedExerciseEntries(previousSessions.map(mapPlannedWorkoutSessionToEntry)));
      setTrackerTone('checking');
      setTrackerStatus(`Could not ${plannedExerciseEditingId ? 'update' : 'plan'} ${title}`);
      setTrackerError(error instanceof Error ? error.message : `Unable to ${plannedExerciseEditingId ? 'update' : 'save'} planned exercise.`);
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
    setTrackerTone('live');
    setTrackerStatus(`Editing ${entry.title}`);
    setTrackerError(null);
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
    setTrackerTone('checking');
    setTrackerStatus(`Deleting ${entry.title}`);
    setTrackerError(null);
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
      setTrackerTone('live');
      setTrackerStatus(`${entry.title} deleted`);
    } catch (error) {
      setPlannedWorkoutSessions(previousSessions);
      setPlannedExerciseEntries(sortPlannedExerciseEntries(previousSessions.map(mapPlannedWorkoutSessionToEntry)));
      setTrackerTone('checking');
      setTrackerStatus(`Could not delete ${entry.title}`);
      setTrackerError(error instanceof Error ? error.message : 'Unable to delete planned exercise.');
    } finally {
      setPlannedExerciseDeletingId(null);
    }
  }

  async function togglePlannedExerciseCompletion(entry: PlannedExerciseEntry) {
    const nextCompletedAt = entry.completed_at ? null : new Date().toISOString();
    const session = plannedWorkoutSessions.find((item) => item.id === entry.id);
    if (!session) {
      setTrackerTone('checking');
      setTrackerStatus(`Could not update ${entry.title}`);
      setTrackerError('Planned workout session is missing from local state.');
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
    setTrackerTone('checking');
    setTrackerStatus(
      `${entry.title} ${nextCompletedAt ? 'completed' : 'marked incomplete'}`
    );
    setTrackerError(null);
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
      setTrackerTone('live');
      setTrackerStatus(
        `${entry.title} ${nextCompletedAt ? 'completed' : 'marked incomplete'}`
      );
    } catch (error) {
      setPlannedWorkoutSessions((current) => current.map((item) => (item.id === entry.id ? session : item)));
      setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
      setTrackerTone('checking');
      setTrackerStatus(`Could not update ${entry.title}`);
      setTrackerError(error instanceof Error ? error.message : 'Unable to update planned exercise completion.');
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

  /** The meal-planning guide's choice (meals per day and balance). Targets are not recalculated. */
  async function applyMealSplit(count: MealsPerDay, split: number[]) {
    // One settings save at a time: a split save resends the name, time zone, and units, so it
    // must never race (and undo) another settings save.
    if (!profile || !foodSessionToken || !isValidSplit(count, split) || settingsSaving) {
      return;
    }
    setSettingsSaving(true);
    setFloorMessage(null);
    try {
      const updated = await updateProfile(
        { display_name: profile.display_name ?? null, timezone: profile.timezone, units: profile.units, meals_per_day: count, meal_split: split },
        foodSessionToken
      );
      setProfile(updated);
    } catch (error) {
      setFloorMessage(error instanceof Error ? error.message : 'Unable to save the meal pattern.');
    } finally {
      setSettingsSaving(false);
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
      allergy_notes: formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft)
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
      setOnboardingStatus('Finish this step before continuing');
      return;
    }

    const currentIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
    const nextStep = onboardingSteps[currentIndex + 1];
    if (nextStep) {
      setOnboardingError(null);
      setOnboardingStatus(`${nextStep.label} step ready`);
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
      setOnboardingStatus(`${previousStep.label} step ready`);
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
          setFoodLogTone('live');
          setFoodLogError(null);
          setFoodLogStatus(
            updatedLog.entries.length === 0
              ? 'No foods logged yet'
              : `${updatedLog.entries.length} persisted entr${updatedLog.entries.length === 1 ? 'y' : 'ies'} loaded`
          );
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.welcomeShell}>
              <Text style={[styles.welcomeAppName, ribeyeLoaded && styles.welcomeAppNameDisplay]}>Relish</Text>
              <Text style={styles.welcomeSubtitle}>Fitness & Nutrition</Text>
              <View style={styles.welcomeMascotWrap}>
                <Image source={mascotDefaultImage} style={styles.welcomeMascotImage} resizeMode="contain" />
              </View>

              {ownerAccess === 'blocked' ? (
                <View style={styles.entryCard}>
                  <View style={styles.entryCardHeader}>
                    <Text style={styles.entryCardEyebrow}>Private app</Text>
                    <Text style={styles.panelTitle}>Connect Tailscale to open Relish</Text>
                  </View>
                  <Text style={styles.welcomeStatusDetail}>{ownerAccessMessage}</Text>
                  <Pressable
                    style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                    onPress={() => setOwnerCheckNonce((nonce) => nonce + 1)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.setupActionButtonLabelPrimary}>Try again</Text>
                  </Pressable>
                </View>
              ) : ownerAccess === 'checking' ? (
                <View style={styles.entryCard}>
                  <Text style={styles.welcomeStatusDetail}>Checking sign-in…</Text>
                </View>
              ) : entryIntent === null ? (
                <View style={styles.welcomeActions}>
                  <Pressable
                    style={styles.welcomePrimaryButton}
                    onPress={() => {
                      setEntryEmailError(null);
                      setEntryError(null);
                      setEntryIntent('signup');
                    }}
                    disabled={entryLoading}
                  >
                    <Text style={styles.welcomePrimaryButtonLabel}>Sign up</Text>
                  </Pressable>
                  <Pressable
                    style={styles.welcomeSecondaryButton}
                    onPress={() => {
                      setEntryEmailError(null);
                      setEntryError(null);
                      setEntryIntent('signin');
                    }}
                    disabled={entryLoading}
                  >
                    <Text style={styles.welcomeSecondaryButtonLabel}>Sign in</Text>
                  </Pressable>
                  <Pressable style={styles.welcomeLinkButton} onPress={enterPreviewMode} disabled={entryLoading}>
                    <Text style={styles.welcomeLinkLabel}>Preview the app</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.entryCard}>
                  <View style={styles.entryCardHeader}>
                    <Text style={styles.entryCardEyebrow}>
                      {entryIntent === 'signup' ? 'Sign up' : 'Sign in'}
                    </Text>
                    <Text style={styles.panelTitle}>
                      {entryIntent === 'signup' ? 'Create your profile' : 'Continue to your profile'}
                    </Text>
                  </View>

                  <View style={styles.profileFieldStack}>
                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Email</Text>
                      <TextInput
                        value={entryEmailDraft}
                        onChangeText={(value) => {
                          setEntryEmailDraft(value);
                          setEntryEmailError(null);
                        }}
                        placeholder="dev@example.com"
                        placeholderTextColor={tc.fg_7c8aa5}
                        style={[styles.profileFieldInput, entryEmailError && styles.profileFieldInputError]}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {entryEmailError ? <Text style={styles.profileFieldError}>{entryEmailError}</Text> : null}
                    </View>

                    {entryIntent === 'signup' ? (
                      <View style={styles.profileField}>
                        <Text style={styles.profileFieldLabel}>Display name</Text>
                        <TextInput
                          value={entryDisplayNameDraft}
                          onChangeText={setEntryDisplayNameDraft}
                          placeholder="Local Dev User"
                          placeholderTextColor={tc.fg_7c8aa5}
                          style={styles.profileFieldInput}
                        />
                      </View>
                    ) : null}
                  </View>

                  {entryError ? (
                    <View style={[styles.inlineStatus, { borderColor: toneColor('checking') }]}>
                      <Text style={styles.inlineStatusLabel}>Could not create local profile session</Text>
                      <Text style={styles.inlineStatusDetail}>{entryError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.entryAuthActions}>
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                      onPress={() => {
                        setEntryEmailError(null);
                        setEntryError(null);
                        setEntryIntent(null);
                      }}
                      disabled={entryLoading}
                    >
                      <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                      onPress={() => void enterLiveMode()}
                      disabled={entryLoading}
                    >
                      <Text style={styles.setupActionButtonLabelPrimary}>
                        {entryLoading
                          ? 'Creating session...'
                          : entryIntent === 'signup'
                            ? 'Get started'
                            : 'Continue'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={[styles.welcomeStatusStrip, { borderColor: toneColor(entryBackendTone) }]}>
                <Text style={styles.welcomeStatusLabel}>{entryBackendStatus}</Text>
                <Text style={styles.welcomeStatusDetail}>{entryBackendDetail}</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (!profileLoaded || !launchHoldDone) {
    // Returning users keep the splash for at least MIN_SPLASH_MS; first-time setup skips it.
    return <LaunchSplash />;
  }

  if (onboardingRequired && onboardingStep === 'welcome') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={styles.setupBackdrop}>
            <View style={[styles.setupCard, styles.onboardingWelcomeCard]}>
              <Image source={mascotDefaultImage} style={styles.onboardingWelcomeImage} resizeMode="contain" />
              <Text style={[styles.onboardingWelcomeTitle, ribeyeLoaded && styles.onboardingWelcomeTitleDisplay]}>
                {ONBOARDING_WELCOME.title}
              </Text>
              <Text style={styles.onboardingWelcomeIntro}>{ONBOARDING_WELCOME.intro}</Text>
              <View style={styles.onboardingWelcomeList}>
                {ONBOARDING_WELCOME.sections.map((section) => (
                  <View key={section.number} style={styles.onboardingWelcomeRow}>
                    <View style={styles.onboardingWelcomeBadge}>
                      <Text style={styles.onboardingWelcomeBadgeLabel}>{section.number}</Text>
                    </View>
                    <View style={styles.onboardingWelcomeRowCopy}>
                      <Text style={styles.onboardingWelcomeRowTitle}>{section.title}</Text>
                      <Text style={styles.onboardingWelcomeRowDetail}>{section.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.onboardingWelcomeFootnote}>{ONBOARDING_WELCOME.footnote}</Text>
              <Pressable
                style={[styles.setupActionButton, styles.setupActionButtonPrimary, styles.onboardingWelcomeAction]}
                onPress={() => {
                  setOnboardingError(null);
                  setOnboardingStatus('Basics step ready');
                  setOnboardingStep('basics');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.setupActionButtonLabelPrimary}>{ONBOARDING_WELCOME.action} →</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (onboardingRequired && activeExplainer) {
    const explainer = ONBOARDING_EXPLAINERS[activeExplainer];
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={styles.setupBackdrop}>
            <View style={[styles.setupCard, styles.onboardingWelcomeCard]}>
              <Image
                source={activeExplainer === 'activity' ? mascotBikeImage : mascotDefaultImage}
                style={styles.onboardingWelcomeImage}
                resizeMode="contain"
              />
              <Text
                style={[styles.onboardingWelcomeTitle, ribeyeLoaded && styles.onboardingWelcomeTitleDisplay]}
                accessibilityRole="header"
              >
                {explainer.title}
              </Text>
              <Text style={styles.onboardingWelcomeIntro}>{explainer.intro}</Text>
              <View style={styles.onboardingWelcomeList}>
                {explainer.points.map((point) => (
                  <View key={point} style={styles.onboardingWelcomeRow}>
                    <View style={styles.onboardingWelcomeBadge}>
                      <Text style={styles.onboardingWelcomeBadgeLabel}>✓</Text>
                    </View>
                    <View style={styles.onboardingWelcomeRowCopy}>
                      <Text style={styles.onboardingWelcomeRowDetail}>{point}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={[styles.setupNavRow, styles.explainerActions]}>
                <Pressable
                  style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                  onPress={leaveExplainerBack}
                  accessibilityRole="button"
                >
                  <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                  onPress={() => {
                    // Counts as seen only once acknowledged; Back shows it again next time.
                    const seen = activeExplainer;
                    setExplainersSeen((current) => (current.includes(seen) ? current : [...current, seen]));
                    setActiveExplainer(null);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.setupActionButtonLabelPrimary}>{explainer.action} →</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (onboardingRequired) {
    const activeStepIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
    const currentStepLabel = onboardingSteps[activeStepIndex]?.label ?? 'Basics';
    const showOnboardingStatus = onboardingSaving || Boolean(onboardingError);
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.setupBackdrop}>
              <View style={styles.setupCard}>
                <View
                  style={styles.setupProgress}
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Step ${activeStepIndex + 1} of ${onboardingSteps.length}: ${currentStepLabel}`}
                >
                  <View style={styles.setupProgressTrack}>
                    {onboardingSteps.map((step, index) => (
                      <View
                        key={step.id}
                        style={[styles.setupProgressSegment, index <= activeStepIndex && styles.setupProgressSegmentDone]}
                      />
                    ))}
                  </View>
                  <Text style={styles.setupProgressCount}>
                    {activeStepIndex + 1} of {onboardingSteps.length}
                  </Text>
                </View>

                {showOnboardingStatus ? (
                  <View
                    style={[
                      styles.inlineStatus,
                      { borderColor: onboardingSaving ? toneColor('checking') : tc.line_d97706 }
                    ]}
                  >
                    <Text style={styles.inlineStatusLabel}>
                      {onboardingSaving ? 'Saving profile...' : 'There is a setup issue to fix'}
                    </Text>
                    {onboardingError ? <Text style={styles.inlineStatusDetail}>{onboardingError}</Text> : null}
                  </View>
                ) : null}

              {floorWarning ? (
                (() => {
                  const pending = calculatedPaceOption(floorWarning.pace);
                  const minimum = targetPreview?.recommended_minimum_calories ?? 1200;
                  const calculatedCalories = Math.round(pending?.calorie_target ?? 0);
                  const who = onboardingSexDraft === 'male' ? 'men' : 'women';
                  return (
                    <ChoiceSheet
                      title="Below the recommended minimum"
                      primaryLabel={`Use ${minimum.toLocaleString('en-US')} kcal`}
                      primaryDetail="Recommended"
                      secondaryLabel={`Keep ${calculatedCalories.toLocaleString('en-US')} kcal`}
                      secondaryDetail="Opt out of the minimum"
                      onPrimary={() => answerFloorWarning('recommended')}
                      onSecondary={() => answerFloorWarning('off')}
                      onDismiss={() => setFloorWarning(null)}
                    >
                      <View style={styles.floorCompare}>
                        <View style={styles.floorCompareTile}>
                          <Text style={styles.floorCompareLabel}>
                            {onboardingGoalTypeDraft === 'maintain' ? 'Maintaining' : 'This pace'}
                          </Text>
                          <Text style={[styles.floorCompareValue, styles.paceRowCaloriesBelow]}>
                            {calculatedCalories.toLocaleString('en-US')} kcal
                          </Text>
                        </View>
                        <View style={styles.floorCompareTile}>
                          <Text style={styles.floorCompareLabel}>Recommended minimum</Text>
                          <Text style={styles.floorCompareValue}>{minimum.toLocaleString('en-US')} kcal</Text>
                          <Text style={styles.floorCompareNote}>for {who}</Text>
                        </View>
                      </View>
                      <Text style={styles.floorWarningText}>
                        Going lower without a doctor makes it hard to get enough protein and nutrients, and raises the risk
                        of muscle loss, fatigue, and regaining the weight.
                      </Text>
                      {pending && caloriesToMoveMore(pending, minimum) > 0 ? (
                        <View style={styles.floorTip}>
                          <Text style={styles.floorWarningText}>
                            <Text style={styles.floorWarningStrong}>Better:</Text> eat {minimum.toLocaleString('en-US')} kcal and burn
                            the other {caloriesToMoveMore(pending, minimum).toLocaleString('en-US')} kcal by moving more, like a longer
                            daily walk.
                          </Text>
                        </View>
                      ) : null}
                      {calculatedCalories < VERY_LOW_CALORIE_LIMIT ? (
                        <Text style={styles.floorWarningText}>
                          Under {VERY_LOW_CALORIE_LIMIT} kcal a day is a very-low-calorie diet, normally done only with medical
                          supervision.
                        </Text>
                      ) : null}
                      <Text style={styles.floorWarningHint}>Opting out turns off the minimum. You can change it in Settings.</Text>
                    </ChoiceSheet>
                  );
                })()
              ) : null}

              {bodyPicker ? (
                <PickerSheet
                  key={`${bodyPicker}-${onboardingUnitsDraft}`}
                  title={{ height: 'Height', weight: 'Weight', goalWeight: 'Goal weight', age: 'Age' }[bodyPicker]}
                  columns={wheelColumns(bodyPicker, onboardingUnitsDraft)}
                  initialIndexes={initialWheelIndexes(
                    bodyPicker,
                    onboardingUnitsDraft,
                    onboardingWheelDrafts(),
                    onboardingGoalTypeDraft ?? 'maintain'
                  )}
                  onDone={(indexes) => applyBodyPicker(bodyPicker, indexes)}
                  onCancel={() => setBodyPicker(null)}
                  {...(bodyPicker === 'goalWeight'
                    ? {
                        clearLabel: 'No goal weight',
                        onClear: () => {
                          setOnboardingTargetWeightDraft('');
                          setBodyPicker(null);
                        }
                      }
                    : {})}
                />
              ) : null}

              {onboardingStep === 'basics' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>About you</Text>
                  <Text style={styles.setupIntroText}>
                    We use these to estimate how many calories your body uses each day.
                  </Text>

                  <View style={styles.unitToggle} accessibilityRole="radiogroup" accessibilityLabel="Units">
                    {(
                      [
                        { id: 'imperial' as const, label: 'lb · ft/in' },
                        { id: 'metric' as const, label: 'kg · cm' }
                      ]
                    ).map((option) => {
                      const active = onboardingUnitsDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.unitToggleOption, active && styles.unitToggleOptionActive]}
                          onPress={() => switchOnboardingUnits(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Text style={[styles.unitToggleLabel, active && styles.unitToggleLabelActive]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <FieldGroup label="Your name">
                    <TextInput
                      value={profileDisplayNameDraft}
                      onChangeText={setProfileDisplayNameDraft}
                      placeholder="What should I call you?"
                      placeholderTextColor={tc.fg_9aa6b8}
                      style={styles.settingsInput}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="name"
                      maxLength={60}
                      accessibilityLabel="Your name"
                    />
                  </FieldGroup>

                  <FieldGroup label="Sex">
                    <View style={styles.setupSegmentRow} accessibilityRole="radiogroup">
                      {(['female', 'male'] as const).map((option) => {
                        const active = onboardingSexDraft === option;
                        return (
                          <Pressable
                            key={option}
                            style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                            onPress={() => setOnboardingSexDraft(option)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                          >
                            <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>
                              {option === 'male' ? 'Male' : 'Female'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </FieldGroup>

                  <PickerField
                    label="Height"
                    value={formatBodyField('height', onboardingUnitsDraft, onboardingWheelDrafts())}
                    placeholder="Choose"
                    onPress={() => setBodyPicker('height')}
                    accessibilityLabel="Height"
                  />

                  <View style={styles.profileFieldRow}>
                    <PickerField
                      style={styles.profileFieldHalf}
                      label="Weight"
                      value={formatBodyField('weight', onboardingUnitsDraft, onboardingWheelDrafts())}
                      placeholder="Choose"
                      onPress={() => setBodyPicker('weight')}
                      accessibilityLabel="Weight"
                    />
                    <PickerField
                      style={styles.profileFieldHalf}
                      label="Age"
                      value={formatBodyField('age', onboardingUnitsDraft, onboardingWheelDrafts())}
                      placeholder="Choose"
                      onPress={() => setBodyPicker('age')}
                      accessibilityLabel="Age"
                    />
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'activity' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Daily activity</Text>
                  <Text style={styles.setupIntroText}>
                    Count everyday movement like walking, chores, and your job. Workouts are tracked separately.
                  </Text>

                  <ActivityEnergyBars
                    bmr={energyPreview?.bmr_calories ?? null}
                    maintenance={energyMaintenance}
                    maintenanceByLevel={energyPreview?.maintenance_by_activity}
                  />

                  <ActivityCaption value={onboardingActivityLevelDraft} />

                  {/* The control sits under what it changes, by the thumb. */}
                  <ActivitySlider value={onboardingActivityLevelDraft} onChange={setOnboardingActivityLevelDraft} />

                  <Pressable
                    onPress={() => setShowBmrExplainer((current) => !current)}
                    accessibilityRole="button"
                    accessibilityLabel="What's BMR?"
                    accessibilityState={{ expanded: showBmrExplainer }}
                    hitSlop={12}
                    style={styles.bmrLinkButton}
                  >
                    <Text style={styles.bmrLink}>{showBmrExplainer ? 'Hide BMR info' : "What's BMR?"}</Text>
                  </Pressable>
                  {showBmrExplainer ? (
                    <Text style={styles.bmrExplainer}>
                      BMR (basal metabolic rate) is the energy your body needs at complete rest: breathing, circulation, staying
                      warm. Relish estimates it from your height, weight, age, and sex with the Mifflin-St Jeor formula. With
                      your activity added, that is about what you burn in a day: eat that much and your weight stays put.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {onboardingStep === 'goal' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Your goal</Text>
                  {targetPreview ? (
                    <Text style={styles.setupIntroText}>
                      You burn about {formatCalories(targetPreview.maintenance_calories)}.
                    </Text>
                  ) : null}

                  <View style={styles.setupGoalGrid}>
                    {GOAL_OPTIONS.map((option) => {
                      const active = onboardingGoalTypeDraft === option.id;
                      const preview = displayedPace(option.id, DEFAULT_PACE[option.id]);
                      const image =
                        option.id === 'lose' ? mascotRunImage : option.id === 'gain' ? mascotWeightsImage : mascotDefaultImage;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupGoalCard, active && styles.setupGoalCardActive]}
                          onPress={() => setOnboardingGoalTypeDraft(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Image source={image} style={styles.setupGoalImage} resizeMode="contain" />
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{option.title}</Text>
                          <Text style={styles.setupChoiceDetail}>{option.detail}</Text>
                          {preview ? (
                            <Text
                              style={[
                                styles.setupGoalCalories,
                                (preview.state === 'below' || preview.state === 'opted_out') && styles.paceRowCaloriesBelow
                              ]}
                            >
                              About {formatCalories(preview.calories)}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'pace' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>
                    {onboardingGoalTypeDraft === 'maintain' ? 'Your focus' : 'How fast?'}
                  </Text>
                  <Text style={styles.setupIntroText}>
                    {onboardingGoalTypeDraft === 'maintain'
                      ? 'Same calories either way. Your focus changes how they split between protein, carbs, and fat.'
                      : 'A slower pace is easier to keep up. You can change it any time.'}
                  </Text>

                  <View style={styles.setupOptionStack}>
                    {(onboardingGoalTypeDraft ? PACE_OPTIONS[onboardingGoalTypeDraft] : []).map((option) => {
                      const active = onboardingGoalPaceDraft === option.id;
                      const calculated = calculatedPaceOption(option.id);
                      const preview = effectivePaceOption(onboardingGoalTypeDraft, option.id);
                      const minimum = targetPreview?.recommended_minimum_calories ?? 1200;
                      // The honest number until the user decides; red when below the minimum.
                      const display = calculated
                        ? paceDisplay(calculated, onboardingCalorieFloorDraft, floorAnswered(option.id))
                        : null;
                      const rate =
                        display && onboardingGoalTypeDraft !== 'maintain'
                          ? formatWeeklyRate(display.weeklyChangeLbs, onboardingUnitsDraft)
                          : '';
                      // The recommended minimum can turn a loss pace into a small surplus.
                      const wrongDirection =
                        display !== null &&
                        ((onboardingGoalTypeDraft === 'lose' && display.weeklyChangeLbs >= 0) ||
                          (onboardingGoalTypeDraft === 'gain' && display.weeklyChangeLbs <= 0));
                      const belowShown = display?.state === 'below' || display?.state === 'opted_out';
                      const kcal = (value: number) => `${Math.round(value).toLocaleString('en-US')} kcal`;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupOptionRow, active && styles.setupOptionRowActive]}
                          onPress={() => chooseOnboardingPace(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <View style={styles.paceRowHeader}>
                            <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                              {option.title}
                            </Text>
                            {display ? (
                              <Text style={[styles.paceRowCalories, belowShown && styles.paceRowCaloriesBelow]}>
                                {formatCalories(display.calories)}
                              </Text>
                            ) : null}
                          </View>
                          {rate && !wrongDirection ? (
                            <Text style={styles.setupChoiceDetail}>
                              {display && display.weeklyChangeLbs < 0 ? 'Lose ' : 'Gain '}
                              {rate}
                            </Text>
                          ) : null}
                          {option.note ? <Text style={styles.setupGoalNote}>{option.note}</Text> : null}
                          {display?.state === 'below' ? (
                            <Text style={styles.paceRowWarning}>Below the {kcal(minimum)} recommended minimum</Text>
                          ) : display?.state === 'opted_out' ? (
                            <Text style={styles.paceRowWarning}>Below the {kcal(minimum)} recommended minimum (floor off)</Text>
                          ) : display?.state === 'using_minimum' ? (
                            <Text style={styles.setupChoiceDetail}>
                              Calculated {kcal(display.calculatedCalories)} · using the recommended minimum
                            </Text>
                          ) : null}
                          {wrongDirection ? (
                            <Text style={styles.paceRowWarning}>
                              At the {kcal(minimum)} minimum you would not lose weight, because it is above what you burn. Move
                              more to keep this pace, or tap this pace to opt out of the minimum.
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  {onboardingGoalTypeDraft !== 'maintain' ? (
                    <View style={styles.goalWeightBlock}>
                      <PickerField
                        label="Goal weight (optional)"
                        value={formatBodyField('goalWeight', onboardingUnitsDraft, onboardingWheelDrafts())}
                        placeholder="Choose"
                        onPress={() => setBodyPicker('goalWeight')}
                        accessibilityLabel="Goal weight"
                      />
                      {(() => {
                        const goalLbs = onboardingTargetWeightLbs();
                        const current = bodyMeasurementsFromDrafts(onboardingUnitsDraft, onboardingBodyDrafts());
                        // The same rate the selected card shows.
                        const preview = displayedPace();
                        if (goalLbs === null || !current || !preview) {
                          return null;
                        }
                        const goalOnRightSide =
                          onboardingGoalTypeDraft === 'lose' ? goalLbs < current.weight_lbs : goalLbs > current.weight_lbs;
                        const estimate = estimateGoalDate(current.weight_lbs, goalLbs, preview.weeklyChangeLbs);
                        if (goalOnRightSide && !estimate) {
                          return null;
                        }
                        return estimate ? (
                          <Text style={styles.goalWeightEstimate}>
                            At this pace: about {estimate.weeks} {estimate.weeks === 1 ? 'week' : 'weeks'}, around{' '}
                            {formatApproximateDate(estimate.date)}.
                          </Text>
                        ) : (
                          <Text style={styles.paceRowWarning}>
                            {onboardingGoalTypeDraft === 'lose'
                              ? 'Goal weight should be below your current weight.'
                              : 'Goal weight should be above your current weight.'}
                          </Text>
                        );
                      })()}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {onboardingStep === 'diet' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>How you eat</Text>
                  <Text style={styles.setupIntroText}>
                    Helps Relish suggest foods and meals that fit. It doesn't change your calories.
                  </Text>
                  <View style={styles.setupOptionStack} accessibilityRole="radiogroup">
                    {dietaryPatternOptions.map((option) => {
                      const active = onboardingDietaryPatternDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupOptionRow, styles.setupIconRow, active && styles.setupOptionRowActive]}
                          onPress={() => setOnboardingDietaryPatternDraft(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Text style={styles.setupIcon} accessibilityElementsHidden importantForAccessibility="no">
                            {option.icon}
                          </Text>
                          <View style={styles.setupIconRowCopy}>
                            <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{option.title}</Text>
                            <Text style={styles.setupChoiceDetail}>{option.subtitle}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'style' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Nutrition style</Text>
                  <Text style={styles.setupIntroText}>The kind of eating you prefer. You can change it any time in Profile.</Text>
                  <View style={styles.setupOptionStack} accessibilityRole="radiogroup">
                    {nutritionStyleOptions.map((option) => {
                      const active = onboardingNutritionStyleDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupOptionRow, styles.setupIconRow, active && styles.setupOptionRowActive]}
                          onPress={() => setOnboardingNutritionStyleDraft(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Text style={styles.setupIcon} accessibilityElementsHidden importantForAccessibility="no">
                            {option.icon}
                          </Text>
                          <View style={styles.setupIconRowCopy}>
                            <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{option.title}</Text>
                            <Text style={styles.setupChoiceDetail}>{option.subtitle}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'allergies' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Allergies and foods to avoid</Text>
                  <Text style={styles.setupIntroText}>Pick all that apply, or None. Saved to your profile.</Text>
                  {/* Two columns of compact tiles, so all eight fit on a phone screen. */}
                  <View style={styles.allergyGrid}>
                    {allergyOptions.map((option) => {
                      const active = onboardingAllergySelectionsDraft.includes(option.id);
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.allergyTile, active && styles.setupOptionRowActive]}
                          onPress={() => toggleOnboardingAllergy(option.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                          accessibilityLabel={option.title}
                        >
                          <Text style={styles.allergyIcon} accessibilityElementsHidden importantForAccessibility="no">
                            {option.icon}
                          </Text>
                          <Text
                            style={[styles.allergyLabel, active && styles.setupChoiceTitleActive]}
                            numberOfLines={1}
                          >
                            {option.title}
                          </Text>
                          <View style={[styles.setupCheckBox, styles.allergyCheck, active && styles.setupCheckBoxActive]}>
                            {active ? <Text style={styles.setupCheckMark}>✓</Text> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  {onboardingAllergySelectionsDraft.includes('other') ? (
                    <FieldGroup label="Other">
                      <TextInput
                        value={onboardingAllergyOtherDraft}
                        onChangeText={setOnboardingAllergyOtherDraft}
                        placeholder="For example sesame or soy"
                        placeholderTextColor={tc.fg_9aa6b8}
                        style={styles.settingsInput}
                      />
                    </FieldGroup>
                  ) : null}
                </View>
              ) : null}

              {onboardingStep === 'review' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>
                    {firstName(profileDisplayNameDraft) ? `Looking good, ${firstName(profileDisplayNameDraft)}!` : 'Looking good!'}
                  </Text>
                  <Text style={styles.setupIntroText}>
                    Check everything, then create your profile. You can change any of this later.
                  </Text>

                  {effectivePaceOption() ? (
                    <View style={styles.reviewTarget}>
                      <Text style={styles.reviewTargetLabel}>Your daily target</Text>
                      <Text style={styles.reviewTargetValue}>{formatCalories(effectivePaceOption()?.calorie_target ?? 0)}</Text>
                      <Text style={styles.reviewTargetMacros}>
                        Protein {Math.round(effectivePaceOption()?.protein_target_g ?? 0)} g · Carbs{' '}
                        {Math.round(effectivePaceOption()?.carbs_target_g ?? 0)} g · Fat {Math.round(effectivePaceOption()?.fat_target_g ?? 0)} g
                      </Text>
                      {onboardingCalorieFloorDraft === 'off' ? (
                        <Text style={styles.paceRowWarning}>
                          {calculatedPaceOption()?.below_recommended_minimum
                            ? 'Below the recommended minimum (calorie floor off)'
                            : 'Calorie floor off: future targets can go below the recommended minimum'}
                        </Text>
                      ) : calculatedPaceOption()?.below_recommended_minimum ? (
                        <Text style={styles.setupChoiceDetail}>Set to the recommended minimum</Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.reviewList}>
                    {(
                      [
                        {
                          step: 'basics' as const,
                          label: 'About you',
                          value: [
                            profileDisplayNameDraft.trim(),
                            onboardingSexDraft === 'male' ? 'Male' : 'Female',
                            formatBodyField('age', onboardingUnitsDraft, onboardingWheelDrafts()),
                            formatBodyField('height', onboardingUnitsDraft, onboardingWheelDrafts()),
                            formatBodyField('weight', onboardingUnitsDraft, onboardingWheelDrafts())
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        },
                        {
                          step: 'activity' as const,
                          label: 'Daily activity',
                          value: activityLevelCards.find((option) => option.id === onboardingActivityLevelDraft)?.title ?? 'Sedentary'
                        },
                        {
                          step: 'goal' as const,
                          label: 'Goal',
                          value: [
                            formatGoalTypeLabel(onboardingGoalTypeDraft),
                            onboardingGoalTypeDraft ? formatGoalPaceLabel(onboardingGoalTypeDraft, onboardingGoalPaceDraft) : '',
                            onboardingGoalTypeDraft !== 'maintain'
                              ? formatBodyField('goalWeight', onboardingUnitsDraft, onboardingWheelDrafts())
                                ? `goal ${formatBodyField('goalWeight', onboardingUnitsDraft, onboardingWheelDrafts())}`
                                : ''
                              : ''
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        },
                        {
                          step: 'diet' as const,
                          label: 'How you eat',
                          value: dietaryPatternOptions.find((option) => option.id === onboardingDietaryPatternDraft)?.title ?? 'Not chosen'
                        },
                        {
                          step: 'style' as const,
                          label: 'Nutrition style',
                          value: nutritionStyleOptions.find((option) => option.id === onboardingNutritionStyleDraft)?.title ?? 'Not chosen'
                        },
                        {
                          step: 'allergies' as const,
                          label: 'Avoid',
                          value: formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft) || 'Nothing'
                        }
                      ]
                    ).map((row) => (
                      <View key={row.step} style={styles.reviewRow}>
                        <View style={styles.reviewRowCopy}>
                          <Text style={styles.reviewRowLabel}>{row.label}</Text>
                          <Text style={styles.reviewRowValue}>{row.value}</Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setOnboardingError(null);
                            setOnboardingStep(row.step);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${row.label}`}
                          hitSlop={10}
                        >
                          <Text style={styles.reviewEdit}>Edit</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

                <View style={styles.setupFooter}>
                  <View style={styles.setupNavRow}>
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                      onPress={goToPreviousOnboardingStep}
                      disabled={onboardingSaving}
                    >
                      <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
                    </Pressable>

                    {onboardingStep === 'review' ? (
                      <Pressable
                        style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                        onPress={() => void completeOnboardingSetup()}
                        disabled={onboardingSaving}
                      >
                        <Text style={styles.setupActionButtonLabelPrimary}>
                          {onboardingSaving ? 'Saving...' : 'Create profile'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                        onPress={goToNextOnboardingStep}
                        disabled={onboardingSaving}
                      >
                        <Text style={styles.setupActionButtonLabelPrimary}>Next</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
                accessibilityLabel="Account: profile and settings"
              >
                <View style={styles.avatarBadge}>
                  <Image source={mascotAvatarImage} style={styles.avatarImage} resizeMode="cover" />
                </View>
              </Pressable>
            </View>
          </View>

          {subTabsForSection(section).length > 0 ? (
            <SubTabs items={subTabsForSection(section)} active={section} onSelect={handleSectionChange} />
          ) : null}
        </View>

        {section === 'dashboard' && (
          <View style={styles.dashboardStack}>
            <View style={styles.homeSection}>
              <DayHeader selected={selectedHomeDate} today={todayKey} onSelect={setSelectedHomeDate} />
            </View>

            {/* Overview: calories left, the eaten bar, then the three macros. */}
            <View style={styles.homeSection}>
              {dailyHomeTargets.calorieTarget > 0 ? (
                <CalorieBudgetCard
                  budget={homeCalorieBudget}
                  sharePercent={profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE}
                  onOpenDiary={() => handleSectionChange('tracker')}
                />
              ) : (
                <Text style={styles.dailyHomeEmptyState}>Finish setup to see your daily calories.</Text>
              )}
              <View style={styles.dailyHomeMacroRingRow}>
                <MacroRing
                  label="Protein"
                  consumed={homeConsumedMacros.protein}
                  target={dailyHomeTargets.macroTargets.protein}
                  color={tc.fg_0f766e}
                />
                <MacroRing
                  label="Carbs"
                  consumed={homeConsumedMacros.carbs}
                  target={dailyHomeTargets.macroTargets.carbs}
                  color={tc.fg_ea580c}
                />
                <MacroRing
                  label="Fat"
                  consumed={homeConsumedMacros.fat}
                  target={dailyHomeTargets.macroTargets.fat}
                  color={tc.fg_2563eb}
                />
              </View>
            </View>

            {/* Workouts: planned first (done or skip), then what was recorded. */}
            <View style={styles.homeSection}>
              <View style={styles.todaySectionHeader}>
                <Text style={styles.detailTitle}>Workouts</Text>
                <Pressable
                  style={styles.todayAddButton}
                  onPress={() => handleSectionChange('tracker')}
                  accessibilityRole="button"
                  accessibilityLabel="Add a workout"
                >
                  <Text style={styles.todayAddButtonLabel}>+</Text>
                </Pressable>
              </View>
              {homeOpenPlannedWorkouts.length === 0 && homeCompletedExerciseEntries.length === 0 ? (
                <View style={styles.todayEmpty}>
                  <Text style={styles.dailyHomeEmptyState}>No workouts {selectedHomeDate === todayKey ? 'today' : 'this day'}.</Text>
                  <Text style={styles.todayHint}>Garmin workouts show up here on their own, or tap + to add one.</Text>
                </View>
              ) : null}
              {homeOpenPlannedWorkouts.map((entry) => {
                const deleteKey = `planned:${entry.id}`;
                return (
                  <View key={entry.id} style={styles.todayRow}>
                    <View style={styles.listRowCopyFlex}>
                      <Text style={styles.todayRowTag}>Planned</Text>
                      <Text style={styles.listTitle}>{entry.title}</Text>
                      <Text style={styles.listCaption}>
                        {entry.planned_at} · {entry.duration_minutes} min · {entry.calories_burned} kcal
                      </Text>
                    </View>
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => void togglePlannedExerciseCompletion(entry)}
                      disabled={plannedExerciseUpdatingId === entry.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${entry.title} done`}
                    >
                      <Text style={styles.inlinePillButtonLabel}>{plannedExerciseUpdatingId === entry.id ? 'Saving…' : '✓ Done'}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                      onPress={() => {
                        if (confirmDeleteKey === deleteKey) {
                          setConfirmDeleteKey(null);
                          void removePlannedExerciseEntry(entry);
                        } else {
                          setConfirmDeleteKey(deleteKey);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm skipping ${entry.title}` : `Skip ${entry.title}`}
                    >
                      <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                        {confirmDeleteKey === deleteKey ? 'Skip?' : '✕'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              {homeCompletedExerciseEntries.map((entry) => {
                const deleteKey = `exercise:${entry.id}`;
                return (
                  <View key={entry.id} style={styles.todayRow}>
                    <Pressable
                      style={styles.todayRowMain}
                      onPress={() => setWorkoutDetailId(entry.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.title}: show how its calories are counted`}
                    >
                      <View style={styles.listRowCopyFlex}>
                        <Text style={styles.listTitle}>{entry.title}</Text>
                        <Text style={styles.listCaption}>
                          {entry.logged_at} · {entry.duration_minutes} min
                          {workoutSourceLabel(entry.source) ? ` · ${workoutSourceLabel(entry.source)}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.listMetric}>{entry.calories_burned} kcal ›</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                      onPress={() => void removeExerciseEntry(entry)}
                      disabled={entryActionBusyKey === deleteKey}
                      accessibilityRole="button"
                      accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm deleting ${entry.title}` : `Delete ${entry.title}`}
                    >
                      <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                        {confirmDeleteKey === deleteKey ? 'Delete?' : '✕'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* Meals: planned meals first (ate it or skip), then what was eaten. */}
            <View style={styles.homeSection}>
              <View style={styles.todaySectionHeader}>
                <Text style={styles.detailTitle}>Meals</Text>
                <Pressable
                  style={styles.todayAddButton}
                  onPress={() => setOpenSheet('add-food')}
                  disabled={!foodSessionToken}
                  accessibilityRole="button"
                  accessibilityLabel="Add a food"
                >
                  <Text style={styles.todayAddButtonLabel}>+</Text>
                </Pressable>
              </View>
              {homeOpenPlannedMeals.length === 0 && homeFoodLog.entries.length === 0 ? (
                <View style={styles.todayEmpty}>
                  <Text style={styles.dailyHomeEmptyState}>Nothing eaten yet.</Text>
                  <Text style={styles.todayHint}>Tap + to search, scan, or add quick calories.</Text>
                </View>
              ) : null}
              {homeMealPlanDay
                ? homeOpenPlannedMeals.map((slot) => {
                    const deleteKey = `slot:${slot.id}`;
                    return (
                      <View key={slot.id} style={styles.todayRow}>
                        <View style={styles.listRowCopyFlex}>
                          <Text style={styles.todayRowTag}>Planned · {slot.meal_label}</Text>
                          <Text style={styles.listTitle}>{slot.title}</Text>
                          <Text style={styles.listCaption}>{slot.calories} kcal</Text>
                        </View>
                        <Pressable
                          style={styles.inlinePillButton}
                          onPress={() => void toggleMealPlanMeal(homeMealPlanDay, slot.id, slot.meal_label)}
                          accessibilityRole="button"
                          accessibilityLabel={`I ate ${slot.title}`}
                        >
                          <Text style={styles.inlinePillButtonLabel}>✓ Ate it</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                          onPress={() => void removeMealPlanSlot(slot.id)}
                          disabled={entryActionBusyKey === deleteKey}
                          accessibilityRole="button"
                          accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm skipping ${slot.title}` : `Skip ${slot.title}`}
                        >
                          <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                            {confirmDeleteKey === deleteKey ? 'Skip?' : '✕'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })
                : null}
              {homeMealGroups.map((group) => (
                <View key={group.slot} style={styles.todayMealGroup}>
                  <View style={styles.todayMealGroupHeader}>
                    <Text style={styles.todayMealGroupLabel}>{group.label}</Text>
                    <Text style={styles.todayMealGroupCalories}>{group.calories.toLocaleString('en-US')} kcal</Text>
                  </View>
                  {group.entries.map((entry) => {
                    const deleteKey = `food:${entry.id}`;
                    return (
                      <View key={entry.id} style={styles.todayRow}>
                        <View style={styles.listRowCopyFlex}>
                          <Text style={styles.listTitle}>{entry.food_name}</Text>
                          <Text style={styles.listCaption}>
                            P {Math.round(entry.macros.protein)}g · C {Math.round(entry.macros.carbs)}g · F {Math.round(entry.macros.fat)}g
                          </Text>
                        </View>
                        <Text style={styles.listMetric}>{Math.round(entry.calories)} kcal</Text>
                        <Pressable
                          style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                          onPress={() => void removeHomeFoodEntry(entry)}
                          disabled={entryActionBusyKey === deleteKey}
                          accessibilityRole="button"
                          accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm deleting ${entry.food_name}` : `Delete ${entry.food_name}`}
                        >
                          <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                            {confirmDeleteKey === deleteKey ? 'Delete?' : '✕'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {section === 'trends' && (
          <View style={styles.dashboardStack}>
            <View style={styles.homeSection}>
              <View style={styles.todaySectionHeader}>
                <Text style={styles.detailTitle}>Trends</Text>
                <View style={styles.trendRangeRow} accessibilityRole="tablist">
                  {TREND_RANGES.map((range) => (
                    <Pressable
                      key={range}
                      style={[styles.trendRange, trendRange === range && styles.trendRangeActive]}
                      onPress={() => setTrendRange(range)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: trendRange === range }}
                    >
                      <Text style={[styles.trendRangeLabel, trendRange === range && styles.trendRangeLabelActive]}>{range}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {trendsError ? <Text style={styles.settingsError}>{trendsError}</Text> : null}
            </View>

            {/* Weight: weigh-ins and the smoothed trend, with the goal. */}
            <View style={styles.homeSection}>
              <View style={styles.todaySectionHeader}>
                <Text style={styles.detailTitle}>Weight</Text>
                <Text style={styles.trendHeadline}>
                  {trendWeight.latest !== null ? `${trendWeight.latest} ${trendUnit}` : '—'}
                </Text>
              </View>
              <Text style={styles.todayHint}>
                {[
                  trendWeight.rate !== null
                    ? `Trend ${trendWeight.rate > 0 ? '+' : trendWeight.rate < 0 ? '−' : '±'}${Math.abs(trendWeight.rate)} ${trendUnit} a week`
                    : 'Weigh in a few more days to see your weekly trend',
                  trendWeight.toGoal !== null ? `${trendWeight.toGoal} ${trendUnit} to goal` : null
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <WeightTrendChart
                points={trendWeightPoints}
                start={trendStart}
                end={todayKey}
                goal={profile?.target_weight_lbs ?? null}
                unit={trendUnit}
                toUnit={(lbs) => (trendUnit === 'kg' ? Math.round(lbs * 0.45359237 * 10) / 10 : lbs)}
              />
            </View>

            {/* Calories: each day against its allowance. */}
            <View style={styles.homeSection}>
              <View style={styles.todaySectionHeader}>
                <Text style={styles.detailTitle}>Calories</Text>
                <Text style={styles.trendHeadline}>
                  {trendCalories.loggedDays > 0 ? `${trendCalories.averageEaten.toLocaleString('en-US')} avg` : '—'}
                </Text>
              </View>
              <Text style={styles.todayHint}>
                {trendCalories.loggedDays > 0
                  ? `${trendCalories.loggedDays} of ${trendDays.length} days logged · allowance avg ${trendCalories.averageAllowance.toLocaleString('en-US')} · ${trendCalories.daysOnTarget} on target${trendCalories.daysOver ? ` · ${trendCalories.daysOver} over` : ''}`
                  : 'Nothing logged in this range yet.'}
              </Text>
              <CalorieBars days={trendDays} average={trendCalories.averageEaten} />
            </View>

            {/* Macros: averages on logged days against the targets. */}
            <View style={styles.homeSection}>
              <Text style={styles.detailTitle}>Macros (daily average)</Text>
              {(['protein', 'carbs', 'fat'] as const).map((macro) => {
                const average = trendMacros[macro];
                const target = Math.round(dailyHomeTargets.macroTargets[macro]);
                const share = target > 0 ? Math.min(1, average / target) : 0;
                return (
                  <View key={macro} style={styles.trendMacro}>
                    <View style={styles.todaySectionHeader}>
                      <Text style={styles.trendMacroLabel}>{macro[0].toUpperCase() + macro.slice(1)}</Text>
                      <Text style={styles.trendMacroValue}>
                        {average} g{target > 0 ? ` of ${target} g` : ''}
                      </Text>
                    </View>
                    <View style={styles.trendMacroTrack}>
                      <View
                        style={[
                          styles.trendMacroFill,
                          { width: `${Math.round(share * 100)}%`, backgroundColor: macro === 'protein' ? tc.fg_0f766e : macro === 'carbs' ? tc.fg_ea580c : tc.fg_2563eb }
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* History: every day in the range, newest first. */}
            <View style={styles.homeSection}>
              <Text style={styles.detailTitle}>History</Text>
              <DayHistory
                days={[...trendDays].reverse()}
                logs={trendLogs}
                exercise={exerciseEntries}
                today={todayKey}
                onDeleteFood={deleteTrendFood}
                onOpenWorkout={setWorkoutDetailId}
              />
            </View>
          </View>
        )}

        {section === 'profile' && (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Profile</Text>
                  <Text style={styles.panelTitle}>Your body and goals</Text>
                </View>
                <Text style={styles.panelDetail}>Update your weight, body stats, and goal here; your daily targets recalculate when you save. Units, time zone, and your name are in Settings.</Text>
              </View>

              <View style={[styles.inlineStatus, { borderColor: toneColor(profileTone) }]}>
                <Text style={styles.inlineStatusLabel}>{profileStatus}</Text>
                {profileError ? <Text style={styles.inlineStatusDetail}>{profileError}</Text> : null}
              </View>

              {profile ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>Body and goal</Text>

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
                          placeholderTextColor={tc.fg_7c8aa5}
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
                          placeholderTextColor={tc.fg_7c8aa5}
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
                          placeholderTextColor={tc.fg_7c8aa5}
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
                          placeholderTextColor={tc.fg_7c8aa5}
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
                                {goalLabel(option)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>{onboardingGoalTypeDraft === 'maintain' ? 'Focus' : 'Pace'}</Text>
                      <View style={styles.profileToggleRow}>
                        {(onboardingGoalTypeDraft ? PACE_OPTIONS[onboardingGoalTypeDraft] : []).map((option) => {
                          const active = onboardingGoalPaceDraft === option.id;
                          return (
                            <Pressable
                              key={option.id}
                              style={[styles.profileToggle, active && styles.profileToggleActive]}
                              onPress={() => setOnboardingGoalPaceDraft(option.id)}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: active }}
                            >
                              <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                                {option.title}
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
                          placeholderTextColor={tc.fg_7c8aa5}
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

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>How you eat</Text>
                      <View style={styles.profileToggleRow}>
                        {dietaryPatternOptions.map((option) => {
                          const active = onboardingDietaryPatternDraft === option.id;
                          return (
                            <Pressable
                              key={option.id}
                              style={[styles.profileToggle, active && styles.profileToggleActive]}
                              onPress={() => setOnboardingDietaryPatternDraft(option.id)}
                            >
                              <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.title}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Nutrition style</Text>
                      <View style={styles.profileToggleRow}>
                        {nutritionStyleOptions.map((option) => {
                          const active = onboardingNutritionStyleDraft === option.id;
                          return (
                            <Pressable
                              key={option.id}
                              style={[styles.profileToggle, active && styles.profileToggleActive]}
                              onPress={() => setOnboardingNutritionStyleDraft(option.id)}
                            >
                              <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.title}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Avoid</Text>
                      <View style={styles.profileToggleRow}>
                        {allergyOptions.map((option) => {
                          const active = onboardingAllergySelectionsDraft.includes(option.id);
                          return (
                            <Pressable
                              key={option.id}
                              style={[styles.profileToggle, active && styles.profileToggleActive]}
                              onPress={() => toggleOnboardingAllergy(option.id)}
                            >
                              <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.title}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {onboardingAllergySelectionsDraft.includes('other') ? (
                        <TextInput
                          value={onboardingAllergyOtherDraft}
                          onChangeText={setOnboardingAllergyOtherDraft}
                          placeholder="For example sesame or soy"
                          placeholderTextColor={tc.fg_9aa6b8}
                          style={styles.settingsInput}
                        />
                      ) : null}
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
                    placeholderTextColor={tc.fg_7c8aa5}
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
                      placeholderTextColor={tc.fg_7c8aa5}
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
                      placeholderTextColor={tc.fg_7c8aa5}
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
                      placeholderTextColor={tc.fg_7c8aa5}
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
                      placeholderTextColor={tc.fg_7c8aa5}
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
                    placeholderTextColor={tc.fg_7c8aa5}
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

        {section === 'workout-plan' && (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Planned exercise</Text>
              <Text style={styles.panelTitle}>Plan a workout for the selected Home date</Text>
              <Text style={styles.panelDetail}>
                Save a future or same-day training session so Home can show planned movement separately from completed tracker logs.
              </Text>

              <View style={styles.inlinePillRow}>
                <Text style={styles.inlinePillText}>Planning for {formatHomeDateLabel(selectedHomeDate, todayKey)}</Text>
              </View>

              {plannedExerciseEditingId ? (
                <View style={styles.searchRow}>
                  <View style={styles.inlinePillRow}>
                    <Text style={styles.inlinePillText}>Editing planned session</Text>
                  </View>
                  <Pressable style={styles.inlinePillButton} onPress={resetPlannedExerciseDrafts}>
                    <Text style={styles.inlinePillButtonLabel}>Cancel edit</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.exercisePresetGrid}>
                {exercisePresets.map((preset) => {
                  const active = preset.id === activePlannedExercisePreset.id;
                  return (
                    <Pressable
                      key={`planned-${preset.id}`}
                      style={[styles.exercisePresetCard, active && styles.exercisePresetCardActive]}
                      onPress={() => {
                        setPlannedExerciseTitleDraft(preset.title);
                        setPlannedExerciseMinutesDraft(preset.minutes);
                      }}
                    >
                      <Image source={preset.image} style={styles.exercisePresetImage} resizeMode="contain" />
                      <Text style={styles.exercisePresetLabel}>{preset.label}</Text>
                      <Text style={styles.exercisePresetMeta}>
                        {preset.minutes} min · est. {preset.calories} kcal
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  value={plannedExerciseTitleDraft}
                  onChangeText={setPlannedExerciseTitleDraft}
                  placeholder="Swim, walk, lift..."
                  placeholderTextColor={tc.fg_7c8aa5}
                  style={styles.searchInput}
                  autoCorrect={false}
                />
                <Pressable style={styles.primaryButton} onPress={() => void addPlannedExerciseEntry()}>
                  <Text style={styles.primaryButtonLabel}>
                    {plannedExerciseSaving ? 'Saving...' : plannedExerciseEditingId ? 'Update plan' : 'Plan exercise'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  value={plannedExerciseMinutesDraft}
                  onChangeText={setPlannedExerciseMinutesDraft}
                  placeholder="Main set minutes"
                  placeholderTextColor={tc.fg_7c8aa5}
                  style={styles.searchInput}
                  keyboardType="numeric"
                  autoCorrect={false}
                />
                <View style={styles.metricTileCompact}>
                  <Text style={styles.metricLabel}>Estimated burn</Text>
                  <Text style={styles.metricValue}>{estimatedPlannedExerciseCalories} kcal</Text>
                </View>
              </View>

              <View style={styles.listActionRow}>
                <Pressable
                  style={[styles.inlinePillButton, plannedExerciseWarmupEnabled ? styles.inlinePillButtonComplete : null]}
                  onPress={() => setPlannedExerciseWarmupEnabled((current) => !current)}
                >
                  <Text style={[styles.inlinePillButtonLabel, plannedExerciseWarmupEnabled ? styles.inlinePillButtonLabelComplete : null]}>
                    {plannedExerciseWarmupEnabled ? 'Remove warmup' : 'Add warmup'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.inlinePillButton, plannedExerciseCooldownEnabled ? styles.inlinePillButtonComplete : null]}
                  onPress={() => setPlannedExerciseCooldownEnabled((current) => !current)}
                >
                  <Text style={[styles.inlinePillButtonLabel, plannedExerciseCooldownEnabled ? styles.inlinePillButtonLabelComplete : null]}>
                    {plannedExerciseCooldownEnabled ? 'Remove cooldown' : 'Add cooldown'}
                  </Text>
                </Pressable>
              </View>

              {plannedExerciseWarmupEnabled ? (
                <View style={styles.searchRow}>
                  <TextInput
                    value={plannedExerciseWarmupMinutesDraft}
                    onChangeText={setPlannedExerciseWarmupMinutesDraft}
                    placeholder="Warmup minutes"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.searchInput}
                    keyboardType="numeric"
                    autoCorrect={false}
                  />
                  <View style={styles.inlinePillRow}>
                    <Text style={styles.inlinePillText}>{defaultWarmupTitle(activePlannedExercisePreset.id)}</Text>
                  </View>
                </View>
              ) : null}

              {plannedExerciseCooldownEnabled ? (
                <View style={styles.searchRow}>
                  <TextInput
                    value={plannedExerciseCooldownMinutesDraft}
                    onChangeText={setPlannedExerciseCooldownMinutesDraft}
                    placeholder="Cooldown minutes"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.searchInput}
                    keyboardType="numeric"
                    autoCorrect={false}
                  />
                  <View style={styles.inlinePillRow}>
                    <Text style={styles.inlinePillText}>{defaultCooldownTitle(activePlannedExercisePreset.id)}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.metricRow}>
                <MetricTile label="Minutes" value={`${plannedExerciseMinutesDraft} min`} compact />
                <MetricTile label="Estimated burn" value={`${estimatedPlannedExerciseCalories} kcal`} compact />
              </View>

              <View style={styles.foodList}>
                {plannedExerciseEntries.length > 0 ? (
                  plannedExerciseEntries.map((entry) => (
                    <View key={entry.id} style={styles.foodRow}>
                      <View style={styles.foodRowCopy}>
                        <Text style={styles.listTitle}>{entry.title}</Text>
                        <Text style={styles.listCaption}>
                          {formatHomeDateLabel(entry.planned_on, todayKey)} · {entry.duration_minutes} min · {entry.intensity} · {entry.completed_at ? `Completed ${formatCompletionTimeLabel(entry.completed_at)}` : entry.planned_at}
                        </Text>
                        {plannedWorkoutSessions.find((session) => session.id === entry.id)?.blocks.length ? (
                          <Text style={styles.listCaption}>
                            {plannedWorkoutSessions
                              .find((session) => session.id === entry.id)
                              ?.blocks.map((block) => `${block.title}: ${block.segments.map((segment) => segment.title).join(', ')}`)
                              .join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.listRowActions}>
                        <Text style={styles.listMetric}>{entry.calories_burned} kcal</Text>
                        <View style={styles.listActionRow}>
                          <Pressable
                            style={styles.inlinePillButton}
                            onPress={() => beginPlannedExerciseEdit(entry)}
                            disabled={plannedExerciseDeletingId === entry.id || plannedExerciseUpdatingId === entry.id}
                          >
                            <Text style={styles.inlinePillButtonLabel}>Edit</Text>
                          </Pressable>
                          <Pressable
                            style={styles.inlinePillButton}
                            onPress={() => void removePlannedExerciseEntry(entry)}
                            disabled={plannedExerciseDeletingId === entry.id || plannedExerciseUpdatingId === entry.id}
                          >
                            <Text style={styles.inlinePillButtonLabel}>
                              {plannedExerciseDeletingId === entry.id ? 'Deleting...' : 'Delete'}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.inlinePillButton, entry.completed_at ? styles.inlinePillButtonComplete : null]}
                            onPress={() => void togglePlannedExerciseCompletion(entry)}
                            disabled={plannedExerciseUpdatingId === entry.id || plannedExerciseDeletingId === entry.id}
                          >
                            <Text style={[styles.inlinePillButtonLabel, entry.completed_at ? styles.inlinePillButtonLabelComplete : null]}>
                              {plannedExerciseUpdatingId === entry.id
                                ? 'Saving...'
                                : entry.completed_at
                                  ? 'Undo'
                                  : 'Complete'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>No planned sessions yet</Text>
                    <Text style={styles.detailSubtitle}>
                      Add a workout above to populate Home with future planned exercise.
                    </Text>
                  </View>
                )}
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
                  placeholderTextColor={tc.fg_7c8aa5}
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
                      placeholderTextColor={tc.fg_7c8aa5}
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
                Capture completed exercise separately so tracker history reflects performed movement rather than planned sessions.
              </Text>

              <View style={styles.exercisePresetGrid}>
                {exercisePresets.map((preset) => {
                  const active = preset.id === activeExercisePreset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[styles.exercisePresetCard, active && styles.exercisePresetCardActive]}
                      onPress={() => {
                        setExerciseTitleDraft(preset.title);
                        setExerciseMinutesDraft(preset.minutes);
                        setExerciseCaloriesDraft(preset.calories);
                      }}
                    >
                      <Image source={preset.image} style={styles.exercisePresetImage} resizeMode="contain" />
                      <Text style={styles.exercisePresetLabel}>{preset.label}</Text>
                      <Text style={styles.exercisePresetMeta}>
                        {preset.minutes} min · {preset.calories} kcal
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  value={exerciseTitleDraft}
                  onChangeText={setExerciseTitleDraft}
                  placeholder="Walk, bike, lift..."
                  placeholderTextColor={tc.fg_7c8aa5}
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
                  placeholderTextColor={tc.fg_7c8aa5}
                  style={styles.searchInput}
                  keyboardType="numeric"
                  autoCorrect={false}
                />
                <TextInput
                  value={exerciseCaloriesDraft}
                  onChangeText={setExerciseCaloriesDraft}
                  placeholder="Calories burned"
                  placeholderTextColor={tc.fg_7c8aa5}
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
                  exerciseEntries.map((entry) => {
                    const key = `exercise:${entry.id}`;
                    const editing = editingExerciseId === entry.id;
                    const busy = entryActionBusyKey !== null;
                    // Optimistic rows (not saved yet) have client ids; plan-made rows are edited via the plan.
                    const savedOnServer = !entry.id.startsWith('exercise-');
                    const fromPlan = plannedWorkoutSessions.some((session) => session.completed_exercise_entry_id === entry.id);
                    return (
                      <View key={entry.id} style={styles.logEntryCard}>
                        <Pressable
                          style={styles.foodRow}
                          onPress={() => setWorkoutDetailId(entry.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${entry.title}: show how its calories are counted`}
                        >
                          <View style={styles.foodRowCopy}>
                            <Text style={styles.listTitle}>{entry.title}</Text>
                            <Text style={styles.listCaption}>
                              {entry.duration_minutes} min · {entry.intensity} · {entry.logged_at}
                              {workoutSourceLabel(entry.source) ? ` · ${workoutSourceLabel(entry.source)}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.listMetric}>{entry.calories_burned} kcal ›</Text>
                        </Pressable>
                        {editing ? (
                          <View style={styles.entryEditRow}>
                            <TextInput
                              value={editingExerciseMinutesDraft}
                              onChangeText={setEditingExerciseMinutesDraft}
                              keyboardType="number-pad"
                              style={styles.entryEditInput}
                              accessibilityLabel="Minutes"
                            />
                            <Text style={styles.listCaption}>min</Text>
                            <TextInput
                              value={editingExerciseCaloriesDraft}
                              onChangeText={setEditingExerciseCaloriesDraft}
                              keyboardType="number-pad"
                              style={styles.entryEditInput}
                              accessibilityLabel="Calories burned"
                            />
                            <Text style={styles.listCaption}>kcal</Text>
                          </View>
                        ) : null}
                        {entryMode === 'live' && foodSessionToken && savedOnServer ? (
                          <View style={styles.entryActionRow}>
                            {fromPlan ? (
                              <Text style={styles.listCaption}>From a planned workout</Text>
                            ) : editing ? (
                              <>
                                <Pressable style={styles.inlinePillButton} disabled={busy} onPress={() => void saveExerciseEdit(entry)}>
                                  <Text style={styles.inlinePillButtonLabel}>{busy ? 'Saving…' : 'Save'}</Text>
                                </Pressable>
                                <Pressable style={styles.inlinePillButton} onPress={() => setEditingExerciseId(null)}>
                                  <Text style={styles.inlinePillButtonLabel}>Cancel</Text>
                                </Pressable>
                              </>
                            ) : (
                              <Pressable
                                style={styles.inlinePillButton}
                                onPress={() => {
                                  setEditingExerciseId(entry.id);
                                  setEditingExerciseMinutesDraft(String(entry.duration_minutes));
                                  setEditingExerciseCaloriesDraft(String(entry.calories_burned));
                                  setConfirmDeleteKey(null);
                                }}
                              >
                                <Text style={styles.inlinePillButtonLabel}>Edit</Text>
                              </Pressable>
                            )}
                            <Pressable style={styles.inlinePillButton} disabled={busy} onPress={() => void removeExerciseEntry(entry)}>
                              <Text style={[styles.inlinePillButtonLabel, confirmDeleteKey === key && styles.entryDeleteConfirmLabel]}>
                                {confirmDeleteKey === key ? 'Tap again to delete' : 'Delete'}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
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
                  <ActivityIndicator size="small" color={tc.fg_17324d} />
                  <Text style={styles.detailSubtitle}>Fetching today’s persisted log...</Text>
                </View>
              ) : foodLog.entries.length === 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>No entries yet</Text>
                  <Text style={styles.detailSubtitle}>Add a searched food above to start today’s log.</Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {foodLog.entries.map((entry) => {
                    const key = `food:${entry.id}`;
                    const editing = editingFoodEntryId === entry.id;
                    const busy = entryActionBusyKey !== null;
                    return (
                      <View key={entry.id} style={styles.logEntryCard}>
                        <View style={styles.foodRow}>
                          <View style={styles.foodRowCopy}>
                            <Text style={styles.listTitle}>{entry.food_name}</Text>
                            <Text style={styles.listCaption}>
                              {Math.round(entry.grams * 10) / 10} g · {entry.logged_at} · {(entry.brand ?? 'Unbranded')} · {entry.source}
                            </Text>
                          </View>
                          <Text style={styles.listMetric}>{Math.round(entry.calories)} kcal</Text>
                        </View>
                        {editing ? (
                          <View style={styles.entryEditRow}>
                            <TextInput
                              value={editingFoodGramsDraft}
                              onChangeText={setEditingFoodGramsDraft}
                              keyboardType="decimal-pad"
                              style={styles.entryEditInput}
                              accessibilityLabel="Amount in grams"
                            />
                            <Text style={styles.listCaption}>grams</Text>
                          </View>
                        ) : null}
                        {entryMode === 'live' && foodSessionToken && foodLog.log_id ? (
                          <View style={styles.entryActionRow}>
                            {editing ? (
                              <>
                                <Pressable style={styles.inlinePillButton} disabled={busy} onPress={() => void saveFoodEntryEdit(entry)}>
                                  <Text style={styles.inlinePillButtonLabel}>{busy ? 'Saving…' : 'Save'}</Text>
                                </Pressable>
                                <Pressable style={styles.inlinePillButton} onPress={() => setEditingFoodEntryId(null)}>
                                  <Text style={styles.inlinePillButtonLabel}>Cancel</Text>
                                </Pressable>
                              </>
                            ) : entry.grams > 0 ? (
                              <Pressable
                                style={styles.inlinePillButton}
                                onPress={() => {
                                  setEditingFoodEntryId(entry.id);
                                  setEditingFoodGramsDraft(String(entry.grams));
                                  setConfirmDeleteKey(null);
                                }}
                              >
                                <Text style={styles.inlinePillButtonLabel}>Edit</Text>
                              </Pressable>
                            ) : null}
                            <Pressable style={styles.inlinePillButton} disabled={busy} onPress={() => void removeFoodEntry(entry)}>
                              <Text style={[styles.inlinePillButtonLabel, confirmDeleteKey === key && styles.entryDeleteConfirmLabel]}>
                                {confirmDeleteKey === key ? 'Tap again to delete' : 'Delete'}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {section === 'foods' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Your foods</Text>
            <Text style={styles.panelDetail}>Your food bank and favorites first; searching also finds USDA foods. ✕ removes a food from your bank.</Text>
            <View style={styles.searchRow}>
              <TextInput
                value={foodDraft}
                onChangeText={setFoodDraft}
                placeholder="Search yogurt, oats, blueberries..."
                placeholderTextColor={tc.fg_7c8aa5}
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
                            {isSavingLogEntry ? 'Saving...' : `Add ${formatFoodAmount(food, foodQuantityForId(food.id))} to today`}
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
                        {food.in_bank ? (
                          <Pressable
                            style={[styles.todayRemoveButton, confirmDeleteKey === `bank:${food.id}` && styles.todayRemoveConfirm]}
                            onPress={(event) => {
                              event.stopPropagation();
                              void removeFromBank(food);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={confirmDeleteKey === `bank:${food.id}` ? `Confirm removing ${food.name}` : `Remove ${food.name} from your food bank`}
                          >
                            <Text style={[styles.todayRemoveLabel, confirmDeleteKey === `bank:${food.id}` && styles.todayRemoveConfirmLabel]}>
                              {confirmDeleteKey === `bank:${food.id}` ? 'Remove?' : '✕'}
                            </Text>
                          </Pressable>
                        ) : null}
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
                      {isSavingLogEntry ? 'Saving...' : `Add ${formatFoodAmount(selectedFood, foodQuantityForId(selectedFood.id))} to today`}
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
                const isToday = day.plan_date === todayKey;

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
                    const slotItems = slot.items ?? [];

                    return (
                      <Pressable
                        key={slot.id}
                        style={[styles.mealPlanSlotCard, logged && styles.mealPlanLoggedRow]}
                        onPress={() => toggleMealPlanMeal(selectedMealPlanDay, slot.id, slot.meal_label)}
                      >
                        <View style={styles.mealPlanSlotHeader}>
                          <View style={styles.foodRowCopy}>
                            <View style={styles.mealPlanSlotTitleRow}>
                              <Text style={styles.listTitle}>{slot.meal_label}</Text>
                              <Text style={styles.mealPlanSlotTotal}>{slot.calories} kcal</Text>
                            </View>
                            <Text style={styles.listCaption}>{slot.title}</Text>
                          </View>
                          <View style={[styles.mealPlanCheck, logged && styles.mealPlanCheckActive]}>
                            <Text style={[styles.mealPlanCheckLabel, logged && styles.mealPlanCheckLabelActive]}>
                              {logged ? '☑' : '☐'}
                            </Text>
                          </View>
                        </View>
                        {slotItems.length > 0 ? (
                          <View style={styles.mealPlanItemList}>
                              {slotItems.map((item, index) => (
                                <View key={`${slot.id}-plan-item-${index}`} style={styles.mealPlanItemRow}>
                                  <View style={styles.mealPlanItemCopy}>
                                    <Text style={styles.mealPlanItemName}>
                                      {item.name}
                                      <Text style={styles.mealPlanItemQuantityInline}> · {item.quantity_label}</Text>
                                    </Text>
                                  </View>
                                  <View style={styles.mealPlanItemInlineMeta}>
                                  <Text style={styles.mealPlanItemMacroLine}>
                                    P {Math.round(item.macros.protein)}g · C {Math.round(item.macros.carbs)}g · F {Math.round(item.macros.fat)}g
                                  </Text>
                                  <Text style={styles.mealPlanItemCalories}>{item.calories} kcal</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : null}
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

        {section === 'settings' && (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Settings</Text>
              <Text style={styles.panelTitle}>Account</Text>
              {settingsMessage ? <Text style={styles.settingsMessage}>{settingsMessage}</Text> : null}
              {settingsError ? <Text style={styles.settingsError}>{settingsError}</Text> : null}
              <FieldGroup label="Name">
                <TextInput
                  value={profileDisplayNameDraft}
                  onChangeText={setProfileDisplayNameDraft}
                  placeholder="Your name"
                  placeholderTextColor={tc.fg_9aa6b8}
                  style={styles.settingsInput}
                  autoCorrect={false}
                />
              </FieldGroup>
              <FieldGroup label="Signed in as">
                <View style={styles.settingsReadOnly}>
                  <Text style={styles.settingsValue}>{profile?.email ?? '—'}</Text>
                  <Text style={styles.settingsHint}>
                    {isOwnerSession ? 'Through Tailscale on this device. No password needed.' : 'Local session'}
                  </Text>
                </View>
              </FieldGroup>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Settings</Text>
              <Text style={styles.panelTitle}>Preferences</Text>
              <FieldGroup label="Appearance">
                <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
                  {APPEARANCE_OPTIONS.map((option) => {
                    const active = appearance.preference === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                        onPress={() => setAppearance(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.settingsHint}>
                  {appearance.preference === 'system'
                    ? `Follows your iPhone (${appearance.scheme === 'dark' ? 'dark' : 'light'} right now). Saved on this device.`
                    : 'Saved on this device. Applies right away.'}
                </Text>
              </FieldGroup>
              <FieldGroup label="Units">
                <View style={styles.setupSegmentRow} accessibilityRole="radiogroup">
                  {(
                    [
                      { id: 'imperial' as const, label: 'lb · ft/in' },
                      { id: 'metric' as const, label: 'kg · cm' }
                    ]
                  ).map((option) => {
                    const active = profileUnitsDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                        onPress={() => setProfileUnitsDraft(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldGroup>
              <FieldGroup label="Time zone">
                <TextInput
                  value={profileTimezoneDraft}
                  onChangeText={setProfileTimezoneDraft}
                  placeholder="America/New_York"
                  placeholderTextColor={tc.fg_9aa6b8}
                  style={styles.settingsInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {deviceTimeZone() && deviceTimeZone() !== profileTimezoneDraft ? (
                  <Pressable onPress={() => setProfileTimezoneDraft(deviceTimeZone() as string)} accessibilityRole="button">
                    <Text style={styles.settingsLink}>Use this iPhone's time zone ({deviceTimeZone()})</Text>
                  </Pressable>
                ) : null}
              </FieldGroup>
              <Pressable
                style={[styles.primaryButton, (settingsSaving || !profile) && styles.buttonDisabled]}
                onPress={() => void saveSettings()}
                disabled={settingsSaving || !profile}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonLabel}>{settingsSaving ? 'Saving…' : 'Save settings'}</Text>
              </Pressable>
            </View>

            {profile?.setup_complete ? (
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Settings</Text>
                <Text style={styles.panelTitle}>Nutrition</Text>
                {floorMessage ? <Text style={styles.settingsMessage}>{floorMessage}</Text> : null}
                <FieldGroup label="Calorie floor">
                  <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Calorie floor">
                    {(
                      [
                        { id: 'recommended' as const, label: 'Recommended' },
                        { id: 'off' as const, label: 'Off' }
                      ]
                    ).map((option) => {
                      const active = (profile.calorie_floor ?? 'recommended') === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                          onPress={() => {
                            if (active || settingsSaving) {
                              return;
                            }
                            if (option.id === 'off') {
                              setSettingsFloorWarning(true);
                            } else {
                              void applyCalorieFloor('recommended');
                            }
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.settingsHint}>
                    {(profile.calorie_floor ?? 'recommended') === 'off'
                      ? 'Off: your daily target is used as calculated, even below the recommended minimum.'
                      : `Your daily target never goes below ${profile.sex === 'male' ? '1,500' : '1,200'} kcal, the minimum dietitians recommend for ${profile.sex === 'male' ? 'men' : 'women'}.`}
                  </Text>
                </FieldGroup>
                <FieldGroup label="Workout calories">
                  <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Workout calories">
                    {WORKOUT_CALORIE_SHARES.map((share) => {
                      const active = (profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE) === share;
                      return (
                        <Pressable
                          key={share}
                          style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                          onPress={() => {
                            if (!active && !settingsSaving) {
                              void applyWorkoutCaloriesShare(share);
                            }
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>
                            {share === 0 ? 'Off' : `${share}%`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.settingsHint}>
                    {(profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE) === 0
                      ? "Off: workouts you log don't change your daily allowance."
                      : `${profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE}% of the calories from each workout you log is added to that day's allowance, so you can eat a bit more and stay on pace. 75% is recommended: watch and app estimates tend to run high, and research suggests a workout raises your day's burn by less than the workout itself.`}
                  </Text>
                </FieldGroup>
                <FieldGroup label="Garmin">
                  <Text style={styles.settingsHint}>{garminStatusText(garminStatus, new Date())}</Text>
                  {garminStatus?.configured ? (
                    <Pressable
                      style={[styles.secondaryButton, garminSyncing && styles.buttonDisabled]}
                      onPress={() => {
                        if (foodSessionToken) {
                          void runGarminSync(foodSessionToken, true);
                        }
                      }}
                      disabled={garminSyncing}
                      accessibilityRole="button"
                    >
                      <Text style={styles.secondaryButtonLabel}>{garminSyncing ? 'Syncing…' : 'Sync now'}</Text>
                    </Pressable>
                  ) : null}
                  {garminNote ? <Text style={styles.settingsHint}>{garminNote}</Text> : null}
                  <Text style={styles.settingsHint}>
                    Workouts sync every 30 minutes and when you open Relish. Garmin's numbers are kept as recorded. Relish counts the active part: the
                    watch's total minus your own resting calories for those minutes, so resting calories aren't counted twice.
                  </Text>
                </FieldGroup>
              </View>
            ) : null}

            {settingsFloorWarning ? (
              <ChoiceSheet
                title="Turn off the calorie floor?"
                primaryLabel="Keep the minimum"
                primaryDetail="Recommended"
                secondaryLabel="Turn it off"
                onPrimary={() => setSettingsFloorWarning(false)}
                onSecondary={() => {
                  setSettingsFloorWarning(false);
                  void applyCalorieFloor('off');
                }}
                onDismiss={() => setSettingsFloorWarning(false)}
              >
                <Text style={styles.floorWarningText}>
                  Dietitians generally recommend at least {profile?.sex === 'male' ? '1,500 kcal a day for men' : '1,200 kcal a day for women'}{' '}
                  unless a doctor is supervising. With the floor off, your target can go below that.
                </Text>
                <Text style={styles.floorWarningText}>
                  Eating less makes it hard to get enough protein, vitamins, and minerals, speeds up muscle loss, and often brings
                  fatigue and rebound weight gain. Proceed with care.
                </Text>
              </ChoiceSheet>
            ) : null}

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Start over</Text>
              <Text style={styles.panelTitle}>Reset profile</Text>
              <Text style={styles.panelDetail}>
                Runs setup again from the welcome screen and clears your goals, so the new setup's goal is the only one. Your
                foods, food and exercise logs, and weigh-ins are kept. To change your weight or goal, edit the profile above
                instead.
              </Text>
              <Pressable
                style={[styles.secondaryButton, confirmDeleteKey === 'profile-reset' && styles.resetConfirmButton]}
                onPress={() => void resetProfile()}
                disabled={profileResetting}
                accessibilityRole="button"
              >
                <Text
                  style={[styles.secondaryButtonLabel, confirmDeleteKey === 'profile-reset' && styles.entryDeleteConfirmLabel]}
                >
                  {profileResetting
                    ? 'Resetting…'
                    : confirmDeleteKey === 'profile-reset'
                      ? 'Tap again to reset and start setup'
                      : 'Reset profile'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>About</Text>
              <Text style={styles.panelTitle}>Relish {appConfig.expo.version}</Text>
              <Text style={styles.panelDetail}>
                Packaged food data from Open Food Facts (openfoodfacts.org), available under the Open Database License (ODbL).
                Food data from USDA FoodData Central.
              </Text>
            </View>
          </>
        )}

        {/* Prep sits under the week's meal plan: it serves those meals. */}
        {(section === 'meal-plan' || section === 'meal-prep') && (
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
              placeholderTextColor={tc.fg_7c8aa5}
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
                  placeholderTextColor={tc.fg_7c8aa5}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {recipeLoading ? (
                <View style={styles.detailCard}>
                  <ActivityIndicator size="small" color={tc.fg_17324d} />
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
                                <ActivityIndicator size="small" color={tc.fg_17324d} />
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
                                    <Text style={styles.recipeMetaLabel}>Ingredients</Text>
                                    {scaledRecipe.ingredients.map((ingredient) => (
                                      <Text key={`${detailRecipe.id}-${ingredient.id}`} style={styles.recipeMetaItem}>
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

        {section === 'ingestion' && (
          <IngestionReviewPanel
            accessToken={foodSessionToken}
            autoStartScan={scanAutoStart}
            onAutoStartHandled={() => setScanAutoStart(false)}
            onFoodLogged={() => {
              const token = foodSessionToken;
              if (token) {
                void fetchTodaysFoodLog(token)
                  .then(setFoodLog)
                  .catch(() => undefined);
              }
            }}
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
            detail={buildWorkoutDetail(entry, profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE)}
            onClose={() => setWorkoutDetailId(null)}
          />
        ) : null;
      })()}

      {weighInOpen ? (
        <PickerSheet
          title="Weigh in · today"
          note={weighInSummary(weightEntries, profile?.units === 'metric' ? 'metric' : 'imperial', todayKey)}
          columns={weighInColumns(profile?.units === 'metric' ? 'metric' : 'imperial')}
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
          title={selectedHomeDate === todayKey ? 'Add food to today' : 'Add food'}
          actions={[
            {
              id: 'search',
              label: 'Search foods',
              detail: 'Your foods first, then USDA (e.g. "green apple")',
              icon: '🔎',
              onPress: () => setOpenSheet('food-search')
            },
            {
              id: 'scan',
              label: 'Scan',
              detail: 'Barcode, package front, or nutrition label',
              icon: '📷',
              onPress: () => setQuickScanOpen(true)
            },
            {
              id: 'quick-calories',
              label: 'Quick calories',
              detail: 'Just a number, no lookup',
              icon: '✏️',
              onPress: () => setOpenSheet('quick-calories')
            }
          ]}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}

      {openSheet === 'account' ? (
        <ActionSheet
          title={profile?.display_name || 'Account'}
          actions={[
            { id: 'profile', label: 'Profile', detail: 'Body, goal, and targets', icon: '🥒', onPress: () => handleSectionChange('profile') },
            { id: 'food-bank', label: 'Food bank', detail: 'Your foods, recipes, and recent scans', icon: '🥫', onPress: () => handleSectionChange('foods') },
            { id: 'settings', label: 'Settings', detail: 'Appearance, units, nutrition, account', icon: '⚙️', onPress: () => handleSectionChange('settings') },
            // Development sessions only: the owner never sees these.
            ...(isOwnerSession
              ? []
              : entryMode === 'live'
                ? [
                    { id: 'preview', label: 'Switch to preview', onPress: enterPreviewMode },
                    { id: 'logout', label: 'Log out', onPress: logoutToEntryScreen }
                  ]
                : [{ id: 'entry', label: 'Change entry mode', onPress: returnToEntryScreen }])
          ]}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

// Native builds draw the splash image here; on web the HTML layer in public/index.html shows it.
const launchSplashSource: ImageSourcePropType = require('./public/splash.jpg');

function LaunchSplash(): ReactElement {
  const { width } = useWindowDimensions();
  const size = launchSplashSize(width);
  // On web the HTML splash layer (public/index.html) stays on top the whole time; this only
  // keeps the background behind it. When the app stops rendering LaunchSplash (its first real
  // screen is ready), the layer fades out.
  useEffect(() => () => {
    dismissLaunchSplash();
  }, []);
  if (Platform.OS === 'web') {
    return <View style={styles.launchSplash} />;
  }
  return (
    <View style={styles.launchSplash} accessibilityLabel="Relish is loading">
      <StatusBar style="dark" />
      <Image source={launchSplashSource} style={size} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
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

function addDaysToIsoDate(value: string, days: number): string {
  return addDaysToDateKey(value, days);
}

function formatHomeDateLabel(value: string, todayKey: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const base = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  if (value === todayKey) {
    return `Today · ${base}`;
  }
  return base;
}

function formatCompletionTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function deriveExerciseIntensity(
  durationMinutes: number,
  caloriesBurned: number
): PlannedExerciseEntry['intensity'] {
  if (caloriesBurned >= 300) {
    return 'High';
  }
  if (durationMinutes >= 30) {
    return 'Moderate';
  }
  return 'Low';
}

function estimatePlannedExerciseCalories(
  durationMinutes: number,
  preset: (typeof exercisePresets)[number]
): number {
  const presetMinutes = Number(preset.minutes);
  const presetCalories = Number(preset.calories);
  if (!Number.isFinite(presetMinutes) || presetMinutes <= 0 || !Number.isFinite(presetCalories) || presetCalories <= 0) {
    return 0;
  }
  return Math.max(1, Math.round((presetCalories / presetMinutes) * durationMinutes));
}

function sortPlannedExerciseEntries(entries: PlannedExerciseEntry[]): PlannedExerciseEntry[] {
  return [...entries].sort((left, right) =>
    `${left.planned_on}T${left.planned_at}`.localeCompare(`${right.planned_on}T${right.planned_at}`)
  );
}

// Expo replaces process.env.NODE_ENV at build time; production web builds hide developer hints.
const IS_DEVELOPMENT_BUILD = process.env.NODE_ENV !== 'production';

function createEmptyFoodLog(date = localDateKey()): FoodLogSummary {
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
            <ActivityIndicator size="small" color={tc.fg_17324d} />
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
    backgroundColor: RELISH_COLORS.canvas
  },
  screen: {
    flex: 1,
    backgroundColor: RELISH_COLORS.canvas
  },
  content: {
    padding: 16,
    gap: 16
  },
  onboardingWelcomeCard: {
    alignItems: 'center',
    gap: 14
  },
  onboardingWelcomeImage: {
    ...MASCOT_OUTLINE,
    width: 170,
    height: 210
  },
  onboardingWelcomeTitle: {
    color: RELISH_COLORS.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center'
  },
  onboardingWelcomeTitleDisplay: {
    fontFamily: 'Ribeye_400Regular',
    fontWeight: '400'
  },
  onboardingWelcomeIntro: {
    color: RELISH_COLORS.text,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 420
  },
  onboardingWelcomeList: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 4
  },
  onboardingWelcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: tc.bg_ffffff,
    borderWidth: 1,
    borderColor: tc.line_e7e0cf
  },
  onboardingWelcomeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RELISH_COLORS.text
  },
  onboardingWelcomeBadgeLabel: {
    color: tc.fg_f4efe4,
    fontWeight: '800'
  },
  onboardingWelcomeRowCopy: {
    flex: 1
  },
  onboardingWelcomeRowTitle: {
    color: RELISH_COLORS.text,
    fontSize: 15,
    fontWeight: '800'
  },
  onboardingWelcomeRowDetail: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    marginTop: 2
  },
  onboardingWelcomeFootnote: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    textAlign: 'center'
  },
  onboardingWelcomeAction: {
    alignSelf: 'stretch'
  },
  launchSplash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.bg_f4efe4
  },
  setupBackdrop: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8
  },
  setupCard: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: tc.bg_ffffff,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tc.line_dde6ee,
    padding: 18,
    gap: 14,
    shadowColor: '#132536',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14
  },
  setupHeaderCopy: {
    flex: 1,
    gap: 4
  },
  setupTitle: {
    color: tc.fg_132536,
    fontSize: 22,
    fontWeight: '800'
  },
  setupMascotWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: tc.bg_f6f0e7,
    borderWidth: 1,
    borderColor: tc.line_e5ddd1
  },
  setupMascotImage: {
    width: '100%',
    height: '100%'
  },
  bmrLink: {
    color: tc.fg_2f6b4f,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  bmrLinkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8
  },
  bmrExplainer: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    lineHeight: 19
  },
  setupGoalCalories: {
    color: RELISH_COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4
  },
  paceRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  paceRowCalories: {
    color: RELISH_COLORS.text,
    fontSize: 13,
    fontWeight: '800'
  },
  // A calculated target below the recommended minimum, before the user decides (or opted out).
  allergyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  allergyTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    backgroundColor: tc.bg_f7f4ef
  },
  allergyIcon: {
    fontSize: 22
  },
  allergyLabel: {
    flex: 1,
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '700'
  },
  allergyCheck: {
    width: 22,
    height: 22,
    borderRadius: 7
  },
  // An emoji at the left of a setup choice row.
  setupIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  setupIconRowCopy: {
    flex: 1,
    gap: 2
  },
  setupIcon: {
    fontSize: 30,
    width: 40,
    textAlign: 'center'
  },
  setupCheckBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: tc.line_cbd5e1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  setupCheckBoxActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  setupCheckMark: {
    color: tc.fg_ffffff,
    fontSize: 15,
    fontWeight: '800'
  },
  reviewTarget: {
    ...FIELD_BOX,
    padding: 16,
    gap: 4
  },
  reviewTargetLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  reviewTargetValue: {
    color: tc.fg_132536,
    fontSize: 26,
    fontWeight: '800'
  },
  reviewTargetMacros: {
    color: tc.fg_5c6d80,
    fontSize: 14
  },
  reviewList: {
    gap: 2
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tc.line_dbe3ec
  },
  reviewRowCopy: {
    flex: 1,
    gap: 2
  },
  reviewRowLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '700'
  },
  reviewRowValue: {
    color: tc.fg_132536,
    fontSize: 16
  },
  reviewEdit: {
    color: tc.fg_0f766e,
    fontSize: 15,
    fontWeight: '700'
  },
  explainerActions: {
    alignSelf: 'stretch'
  },
  paceRowCaloriesBelow: {
    color: tc.fg_b42318
  },
  paceRowWarning: {
    color: tc.fg_b45309,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  goalWeightBlock: {
    gap: 6
  },
  goalWeightEstimate: {
    color: RELISH_COLORS.text,
    fontSize: 13
  },
  setupProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  setupProgressTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4
  },
  setupProgressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: tc.bg_e3dccb
  },
  setupProgressSegmentDone: {
    backgroundColor: RELISH_COLORS.text
  },
  setupProgressCount: {
    color: tc.fg_66778c,
    fontSize: 12,
    fontWeight: '700'
  },
  setupIntroText: {
    color: tc.fg_5b6b62,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -6
  },
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: 12,
    backgroundColor: tc.bg_ece6d6
  },
  unitToggleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9
  },
  unitToggleOptionActive: {
    backgroundColor: tc.bg_ffffff
  },
  unitToggleLabel: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    fontWeight: '700'
  },
  unitToggleLabelActive: {
    color: RELISH_COLORS.text
  },
  setupSegmentRow: {
    flexDirection: 'row',
    gap: 10
  },
  // Same height as the picker fields, so every row on About you lines up.
  setupSegmentChoice: {
    ...FIELD_BOX,
    flex: 1,
    height: FIELD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  setupSegmentLabel: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '600'
  },
  setupPanel: {
    gap: 14
  },
  setupChoiceCard: {
    flexGrow: 1,
    flexBasis: 180,
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 14,
    gap: 6
  },
  setupChoiceCardActive: {
    backgroundColor: tc.bg_eef3f8,
    borderColor: tc.line_17324d
  },
  setupChoiceTitle: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '800'
  },
  setupChoiceTitleActive: {
    color: tc.fg_17324d
  },
  setupChoiceDetail: {
    color: tc.fg_66778c,
    fontSize: 12,
    lineHeight: 17
  },
  setupGoalGrid: {
    flexDirection: 'column',
    gap: 10
  },
  setupGoalCard: {
    width: '100%',
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    alignItems: 'center'
  },
  setupGoalCardActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  setupGoalImage: {
    ...MASCOT_OUTLINE,
    width: '100%',
    height: 72
  },
  setupGoalNote: {
    color: tc.fg_0f766e,
    fontSize: 11,
    fontWeight: '700'
  },
  setupOptionStack: {
    gap: 10
  },
  setupOptionRow: {
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 14,
    gap: 4
  },
  setupOptionRowActive: {
    backgroundColor: tc.bg_eef3f8,
    borderColor: tc.line_17324d
  },
  setupFooter: {
    gap: 10,
    paddingTop: 4
  },
  setupNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  setupActionButton: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  setupActionButtonPrimary: {
    backgroundColor: tc.bg_17324d
  },
  setupActionButtonSecondary: {
    backgroundColor: tc.bg_ffffff,
    borderWidth: 1,
    borderColor: tc.line_17324d
  },
  setupActionButtonLabelPrimary: {
    color: tc.fg_ffffff,
    fontWeight: '800',
    fontSize: 15
  },
  setupActionButtonLabelSecondary: {
    color: tc.fg_17324d,
    fontWeight: '800',
    fontSize: 15
  },
  appHeader: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 0
  },
  appShellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  appHeaderTitleWrap: {
    gap: 2,
    flex: 1,
    minWidth: 0,
    paddingRight: 4
  },
  appShellActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },
  appBrandTitle: {
    color: tc.fg_132536,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800'
  },
  appBrandTitleDisplay: {
    fontFamily: 'Ribeye_400Regular',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '400',
    letterSpacing: 0.4
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    backgroundColor: tc.bg_f7f4ef,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  modeControlCard: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
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
    color: tc.fg_6b7b90,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  modeControlValue: {
    color: tc.fg_17324d,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4
  },
  modeControlDetail: {
    color: tc.fg_66778c,
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
    backgroundColor: tc.bg_17324d,
    borderRadius: 28,
    padding: 20,
    gap: 16
  },
  eyebrow: {
    color: tc.fg_d8e1ed,
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
    color: tc.fg_f8fafc,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800'
  },
  lede: {
    color: tc.fg_d6e0ea,
    fontSize: 15,
    lineHeight: 22
  },
  ringCard: {
    alignSelf: 'flex-start',
    backgroundColor: tc.bg_f6f0e7,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 132
  },
  ringValue: {
    color: tc.fg_17324d,
    fontSize: 30,
    fontWeight: '800'
  },
  ringLabel: {
    color: tc.fg_17324d,
    fontWeight: '700',
    marginTop: 4
  },
  ringCaption: {
    color: tc.fg_5c6d80,
    marginTop: 4,
    fontSize: 12
  },
  mascotCard: {
    backgroundColor: tc.bg_f6f0e7,
    borderRadius: 24,
    padding: 14,
    alignItems: 'center'
  },
  mascotImage: {
    width: '100%',
    maxWidth: 180,
    height: 180
  },
  entryGrid: {
    gap: 16
  },
  entryCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: RELISH_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: RELISH_COLORS.stroke,
    padding: 18,
    gap: 14,
    shadowColor: '#163127',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  entryCardHeader: {
    gap: 4
  },
  entryCardEyebrow: {
    color: RELISH_COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase'
  },
  entryPreviewCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 14,
    gap: 6
  },
  entryPreviewTitle: {
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '800'
  },
  entryPreviewDetail: {
    color: tc.fg_66778c,
    fontSize: 13,
    lineHeight: 18
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RELISH_COLORS.primary,
    backgroundColor: RELISH_COLORS.primarySoft,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryButtonLabel: {
    color: RELISH_COLORS.primaryDeep,
    fontWeight: '800'
  },
  welcomeShell: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 18
  },
  welcomeAppName: {
    color: RELISH_COLORS.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'center'
  },
  welcomeAppNameDisplay: {
    fontFamily: 'Ribeye_400Regular',
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '400',
    letterSpacing: 0.8
  },
  welcomeSubtitle: {
    color: RELISH_COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3
  },
  welcomeMascotWrap: {
    width: 244,
    height: 244,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  welcomeMascotImage: {
    ...MASCOT_OUTLINE,
    width: 206,
    height: 206
  },
  welcomeActions: {
    width: '100%',
    maxWidth: 360,
    gap: 6,
    alignItems: 'center'
  },
  welcomePrimaryButton: {
    minWidth: 180,
    borderRadius: 18,
    backgroundColor: RELISH_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  welcomePrimaryButtonLabel: {
    color: tc.fg_ffffff,
    fontWeight: '800'
  },
  welcomeSecondaryButton: {
    minWidth: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RELISH_COLORS.primary,
    backgroundColor: RELISH_COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  welcomeSecondaryButtonLabel: {
    color: RELISH_COLORS.primaryDeep,
    fontWeight: '800'
  },
  welcomeLinkButton: {
    alignItems: 'center',
    paddingVertical: 6
  },
  welcomeLinkLabel: {
    color: RELISH_COLORS.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  welcomeStatusStrip: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tc.bg_fffaf0,
    gap: 2
  },
  welcomeStatusLabel: {
    color: RELISH_COLORS.text,
    fontSize: 12,
    fontWeight: '700'
  },
  welcomeStatusDetail: {
    color: tc.fg_8a5a1d,
    fontSize: 11,
    lineHeight: 16
  },
  entryAuthActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  statusBanner: {
    backgroundColor: tc.bg_fffaf0,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    gap: 4
  },
  statusLabel: {
    color: tc.fg_132536,
    fontWeight: '700',
    fontSize: 15
  },
  statusDetail: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    lineHeight: 18
  },
  exercisePresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  exercisePresetCard: {
    flexGrow: 1,
    flexBasis: 136,
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 12,
    gap: 6,
    alignItems: 'center'
  },
  exercisePresetCardActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  exercisePresetImage: {
    ...MASCOT_OUTLINE,
    width: '100%',
    height: 112
  },
  exercisePresetLabel: {
    color: tc.fg_132536,
    fontSize: 14,
    fontWeight: '800'
  },
  exercisePresetMeta: {
    color: tc.fg_66778c,
    fontSize: 12,
    textAlign: 'center'
  },
  panel: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 24,
    padding: 18,
    gap: 14
  },
  panelHeader: {
    gap: 6
  },
  panelEyebrow: {
    color: tc.fg_0f766e,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  panelTitle: {
    color: tc.fg_132536,
    fontSize: 22,
    fontWeight: '800'
  },
  panelDetail: {
    color: tc.fg_66778c,
    fontSize: 13,
    lineHeight: 18
  },
  dashboardStack: {
    gap: 0
  },
  trendRangeRow: { flexDirection: 'row', gap: 6 },
  trendRange: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  trendRangeActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  trendRangeLabel: { color: tc.fg_132536, fontSize: 13, fontWeight: '700' },
  trendRangeLabelActive: { color: tc.fg_ffffff },
  trendHeadline: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  trendMacro: { gap: 6, marginTop: 6 },
  trendMacroLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '700' },
  trendMacroValue: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700' },
  trendMacroTrack: { height: 8, borderRadius: 999, backgroundColor: tc.bg_e2e8f0, overflow: 'hidden' },
  trendMacroFill: { height: '100%', borderRadius: 999 },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
    alignItems: 'center'
  },
  toastLabel: {
    overflow: 'hidden',
    backgroundColor: tc.bg_17324d,
    color: tc.fg_ffffff,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999
  },
  mealStyleHeading: { color: tc.fg_132536, fontSize: 15, fontWeight: '800', marginTop: 8 },
  mealStyleRow: { gap: 2, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7 },
  mealStyleRowActive: { borderColor: tc.line_0f766e, backgroundColor: tc.bg_ecfdf3 },
  mealStyleLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '800' },
  mealStyleLabelActive: { color: tc.fg_0f766e },
  mealStyleDetail: { color: tc.fg_5c6d80, fontSize: 13 },
  mealStylePreview: { color: tc.fg_6b7b90, fontSize: 12, fontWeight: '600' },
  todayMealGroup: { gap: 0, marginTop: 6 },
  todayMealGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 },
  todayMealGroupLabel: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  todayMealGroupCalories: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '700' },
  todaySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tc.brand_primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  todayAddButtonLabel: { color: tc.fg_ffffff, fontSize: 24, lineHeight: 26, fontWeight: '600' },
  todayEmpty: { gap: 6, alignItems: 'flex-start' },
  todayHint: { color: tc.fg_6b7b90, fontSize: 13 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tc.line_e2e8f0
  },
  todayRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayRowTag: { color: tc.fg_0f766e, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  todayRemoveButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.bg_eef2f6
  },
  todayRemoveConfirm: { backgroundColor: tc.bg_fff4f0 },
  todayRemoveLabel: { color: tc.fg_5c6d80, fontSize: 14, fontWeight: '700' },
  todayRemoveConfirmLabel: { color: tc.fg_b42318 },
  homeSection: {
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: tc.line_dbe3ec
  },
  dailyHomeGoalBadge: {
    backgroundColor: tc.bg_edf8f1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: tc.line_c7e5d2,
    maxWidth: 180
  },
  dailyHomeGoalBadgeLabel: {
    color: tc.fg_1d5f3a,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  dailyHomeMacroRingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center'
  },
  dailyHomeMacroLegend: {
    color: tc.fg_66778c,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center'
  },
  dailyHomeMealPlanHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  dailyHomeMealPlanSlotCopy: {
    flex: 1,
    gap: 8
  },
  dailyHomeMealPlanSlotMeta: {
    alignItems: 'flex-end',
    gap: 8
  },
  mealPlanSlotCard: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dfe7ef,
    padding: 14,
    gap: 10
  },
  mealPlanSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  mealPlanSlotTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12
  },
  mealPlanSlotLabel: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20
  },
  mealPlanSlotSubtitle: {
    color: tc.fg_7890ad,
    fontSize: 13,
    lineHeight: 18
  },
  mealPlanSlotTotal: {
    color: tc.fg_17324d,
    fontSize: 15,
    fontWeight: '800'
  },
  mealPlanItemList: {
    gap: 10,
    marginTop: 6
  },
  mealPlanItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12
  },
  mealPlanItemCopy: {
    flex: 1,
    paddingRight: 12
  },
  mealPlanItemName: {
    color: tc.fg_17324d,
    fontSize: 15,
    fontWeight: '700'
  },
  mealPlanItemQuantityInline: {
    color: tc.fg_7c8aa5,
    fontSize: 13,
    fontWeight: '500'
  },
  mealPlanItemInlineMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 16,
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  mealPlanItemMacroLine: {
    color: tc.fg_73859d,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right'
  },
  mealPlanItemCalories: {
    color: tc.fg_17324d,
    fontSize: 13,
    fontWeight: '700'
  },
  dailyHomeEmptyState: {
    color: tc.fg_66778c,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  dashboardIntro: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 16,
    gap: 8
  },
  dashboardTitle: {
    color: tc.fg_132536,
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
    backgroundColor: tc.bg_edf1f5
  },
  rangeTabActive: {
    backgroundColor: tc.bg_17324d
  },
  rangeTabLabel: {
    color: tc.fg_17324d,
    fontWeight: '700'
  },
  rangeTabLabelActive: {
    color: tc.fg_ffffff
  },
  scaleSelectorCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
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
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  scaleSelectorValue: {
    color: tc.fg_17324d,
    fontSize: 18,
    fontWeight: '800'
  },
  scaleSelectorHint: {
    color: tc.fg_7c8aa5,
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
    backgroundColor: tc.bg_e2e8f0
  },
  scaleSelectorRailFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 10,
    borderRadius: 999,
    backgroundColor: tc.bg_0f766e
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
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc
  },
  scaleSelectorDotActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_17324d
  },
  scaleSelectorStopLabel: {
    color: tc.fg_7c8aa5,
    fontSize: 11,
    fontWeight: '700'
  },
  scaleSelectorStopLabelActive: {
    color: tc.fg_17324d
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
    backgroundColor: tc.bg_f3f6fb,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    gap: 4
  },
  mealPlanDateCardActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  mealPlanDateWeekday: {
    color: tc.fg_6b7b90,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  mealPlanDateWeekdayActive: {
    color: tc.fg_dbe7f2
  },
  mealPlanDateLabel: {
    color: tc.fg_17324d,
    fontSize: 18,
    fontWeight: '800'
  },
  mealPlanDateLabelActive: {
    color: tc.fg_ffffff
  },
  mealPlanDateMeta: {
    color: tc.fg_66778c,
    fontSize: 12
  },
  mealPlanDateMetaActive: {
    color: tc.fg_dbe7f2
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
    color: tc.fg_7c8aa5,
    fontSize: 12,
    lineHeight: 17
  },
  mealIngredientEditor: {
    gap: 10
  },
  mealIngredientRow: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
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
    backgroundColor: tc.bg_ffffff,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  mealIngredientInput: {
    minWidth: 64,
    color: tc.fg_17324d,
    fontWeight: '800',
    textAlign: 'right',
    fontSize: 16
  },
  mealIngredientUnit: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mealNameInput: {
    borderWidth: 1,
    borderColor: tc.line_d4dbe3,
    borderRadius: 16,
    backgroundColor: tc.bg_ffffff,
    color: tc.fg_132536,
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
    color: tc.fg_7a8797,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mealServingInput: {
    borderWidth: 1,
    borderColor: tc.line_d4dbe3,
    borderRadius: 12,
    backgroundColor: tc.bg_ffffff,
    color: tc.fg_132536,
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
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 18,
    padding: 14,
    gap: 6
  },
  metricTileCompact: {
    minWidth: 140
  },
  metricLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: tc.fg_17324d,
    fontWeight: '800',
    fontSize: 18
  },
  chartCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 22,
    padding: 16
  },
  chartTitle: {
    color: tc.fg_17324d,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10
  },
  lineChartFrame: {
    height: chartHeight,
    borderRadius: 18,
    backgroundColor: tc.bg_eef3f8,
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
    borderTopColor: tc.line_94a3b8,
    borderStyle: 'dashed'
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: tc.bg_0f766e,
    borderRadius: 999,
    opacity: 0.9
  },
  lineNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: tc.bg_17324d,
    borderWidth: 2,
    borderColor: tc.line_f8fafc
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
    color: tc.fg_17324d,
    fontSize: 11,
    fontWeight: '700'
  },
  chartLabel: {
    color: tc.fg_66778c,
    fontSize: 12
  },
  chartTargetCaption: {
    color: tc.fg_66778c,
    marginTop: 10,
    fontSize: 12
  },
  macroStack: {
    gap: 12
  },
  quickLogCard: {
    backgroundColor: tc.bg_f7f4ef,
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
    color: tc.fg_17324d,
    fontSize: 18,
    fontWeight: '800'
  },
  quickLogHint: {
    color: tc.fg_7c8aa5,
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
    backgroundColor: tc.bg_e2e8f0,
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
    borderBottomColor: tc.line_edf1f5
  },
  listTitle: {
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '700'
  },
  listCaption: {
    color: tc.fg_7c8aa5,
    fontSize: 12
  },
  listMetric: {
    color: tc.fg_17324d,
    fontWeight: '700'
  },
  searchRow: {
    gap: 10
  },
  dropdownWrap: {
    gap: 8
  },
  dropdownLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  dropdownTrigger: {
    backgroundColor: tc.bg_f8fafc,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownValue: {
    color: tc.fg_17324d,
    fontWeight: '800',
    fontSize: 16
  },
  dropdownCaret: {
    color: tc.fg_66778c,
    fontSize: 12
  },
  dropdownMenu: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    overflow: 'hidden'
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tc.line_edf1f5
  },
  dropdownOptionActive: {
    backgroundColor: tc.bg_17324d
  },
  dropdownOptionLabel: {
    color: tc.fg_17324d,
    fontWeight: '700'
  },
  dropdownOptionLabelActive: {
    color: tc.fg_ffffff
  },
  searchInput: {
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: tc.fg_132536,
    fontSize: 16
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: tc.bg_17324d,
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryButtonLabel: {
    color: tc.fg_ffffff,
    fontWeight: '800'
  },
  inlineStatus: {
    backgroundColor: tc.bg_fffaf0,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4
  },
  inlineStatusLabel: {
    color: tc.fg_132536,
    fontWeight: '700'
  },
  inlineStatusDetail: {
    color: tc.fg_8a5a1d,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1
  },
  foodList: {
    gap: 8
  },
  logEntryCard: {
    gap: 8
  },
  entryEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4
  },
  entryEditInput: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: tc.bg_ffffff,
    color: tc.fg_17324d,
    fontSize: 16
  },
  entryActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4
  },
  entryDeleteConfirmLabel: {
    color: tc.fg_b42318
  },
  buttonDisabled: {
    opacity: 0.5
  },
  settingsInput: {
    ...FIELD_BOX,
    height: FIELD_HEIGHT,
    paddingHorizontal: 16,
    color: tc.fg_132536,
    fontSize: 16
  },
  settingsReadOnly: {
    gap: 2
  },
  settingsValue: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '600'
  },
  settingsHint: {
    color: tc.fg_6b7b90,
    fontSize: 13
  },
  settingsLink: {
    color: tc.fg_0f766e,
    fontSize: 14,
    fontWeight: '700'
  },
  settingsMessage: {
    color: tc.fg_0f766e,
    fontSize: 14,
    fontWeight: '700'
  },
  settingsError: {
    color: tc.fg_b42318,
    fontSize: 14
  },
  floorCompare: {
    flexDirection: 'row',
    gap: 10
  },
  floorCompareTile: {
    ...FIELD_BOX,
    flex: 1,
    padding: 12,
    gap: 2
  },
  floorCompareLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '700'
  },
  floorCompareValue: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  floorCompareNote: {
    color: tc.fg_5c6d80,
    fontSize: 12
  },
  floorTip: {
    backgroundColor: tc.brand_primarySoft,
    borderRadius: 14,
    padding: 12
  },
  floorWarningText: {
    color: tc.fg_132536,
    fontSize: 15,
    lineHeight: 21
  },
  floorWarningStrong: {
    fontWeight: '800'
  },
  floorWarningHint: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    lineHeight: 18
  },
  resetConfirmButton: {
    borderColor: tc.line_f2c8be,
    backgroundColor: tc.bg_fff4f0
  },
  foodRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_e2e8f0,
    backgroundColor: tc.bg_ffffff,
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
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  mealPlanLoggedRow: {
    borderColor: tc.line_0f766e,
    backgroundColor: tc.bg_effaf7
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
    backgroundColor: tc.bg_edf1f5,
    color: tc.fg_17324d,
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
    borderColor: tc.line_cbd5e1,
    overflow: 'hidden',
    backgroundColor: tc.bg_ffffff
  },
  quantityStepperButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tc.bg_f8fafc
  },
  quantityStepperButtonLabel: {
    color: tc.fg_17324d,
    fontSize: 16,
    fontWeight: '800'
  },
  quantityStepperValue: {
    minWidth: 56,
    paddingHorizontal: 10,
    textAlign: 'center',
    color: tc.fg_17324d,
    fontWeight: '800'
  },
  mealPlanCheck: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.bg_ffffff
  },
  mealPlanCheckActive: {
    borderColor: tc.line_0f766e,
    backgroundColor: tc.bg_0f766e
  },
  mealPlanCheckLabel: {
    color: tc.fg_6b7b90,
    fontSize: 16,
    fontWeight: '800'
  },
  mealPlanCheckLabelActive: {
    color: tc.fg_ffffff
  },
  inlinePillButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  inlinePillButtonLabel: {
    color: tc.fg_17324d,
    fontSize: 12,
    fontWeight: '800'
  },
  inlinePillRow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cdd8e5,
    backgroundColor: tc.bg_f6f9fc,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  inlinePillText: {
    color: tc.fg_4c627a,
    fontSize: 12,
    fontWeight: '700'
  },
  inlinePillButtonComplete: {
    borderColor: tc.line_15803d,
    backgroundColor: tc.bg_edf8f1
  },
  inlinePillButtonLabelComplete: {
    color: tc.fg_15803d
  },
  listRowCopyFlex: {
    flex: 1,
    minWidth: 0
  },
  listRowActions: {
    alignItems: 'flex-end',
    gap: 8
  },
  listActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8
  },
  favoriteToggleButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_f59e0b,
    backgroundColor: tc.bg_fff8ea,
    alignItems: 'center',
    justifyContent: 'center'
  },
  favoriteToggleButtonActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  favoriteToggleButtonLabel: {
    color: tc.fg_b45309,
    fontSize: 16,
    fontWeight: '800'
  },
  favoriteToggleButtonLabelActive: {
    color: tc.fg_ffffff
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
    backgroundColor: tc.bg_17324d,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  recipeStarButtonActive: {
    backgroundColor: tc.bg_0f766e
  },
  recipeStarButtonLabel: {
    color: tc.fg_ffffff,
    fontSize: 12,
    fontWeight: '800'
  },
  recipeAccordionCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    padding: 14,
    gap: 10
  },
  recipeAccordionCardActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_f7f4ef
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
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '800'
  },
  recipeAccordionBody: {
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: tc.line_dbe3ec
  },
  detailCard: {
    backgroundColor: tc.bg_f7f4ef,
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
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  profileFieldInput: {
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: tc.fg_132536,
    fontSize: 16
  },
  profileFieldInputError: {
    borderColor: tc.line_2563eb
  },
  profileFieldError: {
    color: tc.fg_1d4ed8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  },
  profileToggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  profileToggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  profileToggleActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  profileToggleLabel: {
    color: tc.fg_17324d,
    fontWeight: '700'
  },
  profileToggleLabelActive: {
    color: tc.fg_ffffff
  },
  goalCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
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
    backgroundColor: tc.bg_eef3f8,
    color: tc.fg_17324d,
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
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  recipeStarToggleInactive: {
    backgroundColor: tc.bg_f8fafc,
    borderColor: tc.line_cbd5e1
  },
  recipeStarToggleLabel: {
    color: tc.fg_17324d,
    fontWeight: '800'
  },
  recipeStarToggleLabelActive: {
    color: tc.fg_ffffff
  },
  recipeMetaBlock: {
    gap: 6,
    paddingTop: 4
  },
  recipeMetaLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  recipeStep: {
    color: tc.fg_132536,
    fontSize: 13,
    lineHeight: 18
  },
  recipeMetaItem: {
    color: tc.fg_132536,
    fontSize: 13,
    lineHeight: 18
  },
  recipeDetailLoading: {
    gap: 8
  },
  recipeImportCard: {
    backgroundColor: tc.bg_f3efe8,
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  recipeReviewBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: tc.bg_17324d,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  recipeReviewBadgeLabel: {
    color: tc.fg_ffffff,
    fontSize: 11,
    fontWeight: '800'
  },
  recipeSecondaryCard: {
    backgroundColor: tc.bg_f2f6fb,
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  detailTitle: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  detailSubtitle: {
    color: tc.fg_66778c
  },
  footer: {
    color: tc.fg_66778c,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 16
  }
});
