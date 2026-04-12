import { StatusBar } from 'expo-status-bar';
import { Ribeye_400Regular, useFonts as useRibeyeFonts } from '@expo-google-fonts/ribeye';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import {
  ActivityIndicator,
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
  View
} from 'react-native';

import {
  addFoodLogEntry,
  addFavoriteFood,
  createExerciseEntry,
  createPlannedExerciseEntry,
  createLocalSession,
  createWeightEntry,
  deletePlannedExerciseEntry,
  completeOnboarding,
  createUserGoal,
  fetchBackendHealth,
  getApiBaseUrl,
  fetchExerciseEntries,
  fetchPlannedExerciseEntries,
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
  fetchWeeklyMetrics,
  favoriteRecipe,
  searchFoodsWithSession,
  unfavoriteFood,
  updateProfile,
  updateMealPlanSlotEatenAt,
  updateMealPrepTaskStatus,
  updatePlannedExerciseEntry,
  updatePlannedExerciseCompletion,
  unfavoriteRecipe,
  searchFoods
} from './src/lib/api';
import { buildTrendChartGeometry, remainingCalories, selectRangeSeries } from './src/lib/dashboard';
import {
  buildDailyExerciseSummary,
  buildDailyMealPlanSummary,
  buildDailyTargetSummary
} from './src/lib/daily-home';
import {
  appShellMenuGroups
} from './src/lib/app-shell';
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
  PlannedExerciseEntry,
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
type EntryMode = 'live' | 'preview';
const chartHeight = 160;
const mascotDefaultImage = require('./assets/mascot.png');
const mascotAvatarImage = require('./assets/mascot-avatar.png');
const mascotWeightsImage = require('./assets/weights.png');
const mascotBikeImage = require('./assets/bike.png');
const mascotRunImage = require('./assets/run.png');
const mascotSwimImage = require('./assets/swim.png');
const RELISH_COLORS = {
  canvas: '#f6f1e7',
  surface: '#fffdf8',
  text: '#163127',
  muted: '#63776a',
  primary: '#4b8d66',
  primaryDeep: '#2d6046',
  primarySoft: '#e8f3ec',
  accent: '#ea9d2d',
  accentSoft: '#fff3de',
  stroke: '#d7e0d7'
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
type GoalPace = 'light' | 'recommended' | 'extreme' | 'lean' | 'aggressive';
type DietaryPattern = 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'carnivore';
type NutritionStyle = 'balanced' | 'keto' | 'mediterranean';
type AllergyChoice = 'none' | 'milk' | 'egg' | 'peanut' | 'tree_nuts' | 'wheat' | 'shellfish' | 'other';
type OnboardingStep = 'basics' | 'goal' | 'pace' | 'activity' | 'diet' | 'style' | 'allergies' | 'review';

const onboardingSteps: Array<{ id: OnboardingStep; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'goal', label: 'Goal' },
  { id: 'pace', label: 'Style' },
  { id: 'activity', label: 'Activity' },
  { id: 'diet', label: 'Diet' },
  { id: 'style', label: 'Nutrition style' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'review', label: 'Review' }
];

const dietaryPatternOptions: Array<{
  id: DietaryPattern;
  title: string;
  accent: string;
  subtitle: string;
  mark: string;
}> = [
  { id: 'vegan', title: 'Vegan', accent: '#0f766e', subtitle: 'Plants only', mark: 'Leaf' },
  { id: 'vegetarian', title: 'Vegetarian', accent: '#65a30d', subtitle: 'No meat or fish', mark: 'Garden' },
  { id: 'pescatarian', title: 'Pescatarian', accent: '#0284c7', subtitle: 'Fish, dairy, and plants', mark: 'Fish' },
  { id: 'omnivore', title: 'Omnivore', accent: '#17324d', subtitle: 'Balanced mixed diet', mark: 'Plate' },
  { id: 'carnivore', title: 'Carnivore', accent: '#b45309', subtitle: 'Animal-based focus', mark: 'Steak' }
];

const nutritionStyleOptions: Array<{
  id: NutritionStyle;
  title: string;
  accent: string;
  subtitle: string;
  mark: string;
}> = [
  { id: 'balanced', title: 'Balanced', accent: '#17324d', subtitle: 'Flexible mixed approach', mark: 'Plate' },
  { id: 'keto', title: 'Keto', accent: '#2563eb', subtitle: 'Very low carb, higher fat', mark: 'Keto' },
  {
    id: 'mediterranean',
    title: 'Mediterranean',
    accent: '#0f766e',
    subtitle: 'Whole foods, olive oil, fish, plants',
    mark: 'Med'
  }
];

const allergyOptions: Array<{
  id: AllergyChoice;
  title: string;
  accent: string;
  subtitle: string;
  mark: string;
}> = [
  { id: 'none', title: 'None', accent: '#64748b', subtitle: 'No major food allergies', mark: 'None' },
  { id: 'milk', title: 'Milk', accent: '#2563eb', subtitle: 'Avoid dairy milk proteins', mark: 'Milk' },
  { id: 'egg', title: 'Egg', accent: '#f59e0b', subtitle: 'Avoid eggs and egg ingredients', mark: 'Egg' },
  { id: 'peanut', title: 'Peanut', accent: '#b45309', subtitle: 'Avoid peanuts', mark: 'Nut' },
  { id: 'tree_nuts', title: 'Tree nuts', accent: '#7c3aed', subtitle: 'Avoid almonds, cashews, walnuts', mark: 'Tree' },
  { id: 'wheat', title: 'Wheat', accent: '#ca8a04', subtitle: 'Avoid wheat-based foods', mark: 'Wheat' },
  { id: 'shellfish', title: 'Shellfish', accent: '#0f766e', subtitle: 'Avoid shrimp, crab, lobster', mark: 'Shell' },
  { id: 'other', title: 'Other', accent: '#17324d', subtitle: 'Add a custom restriction', mark: 'Other' }
];

const allergyLabels: Record<Exclude<AllergyChoice, 'none' | 'other'>, string> = {
  milk: 'Milk',
  egg: 'Egg',
  peanut: 'Peanut',
  tree_nuts: 'Tree nuts',
  wheat: 'Wheat',
  shellfish: 'Shellfish'
};

const activityLevelCards: Array<{
  id: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  title: string;
  subtitle: string;
}> = [
  { id: 'sedentary', title: 'Sedentary', subtitle: 'Mostly sitting, driving, or desk time' },
  { id: 'light', title: 'Light', subtitle: 'Some walking and light day-to-day movement' },
  { id: 'moderate', title: 'Moderate', subtitle: 'Regular movement and time on your feet' },
  { id: 'very_active', title: 'Very active', subtitle: 'High daily movement, walking, or physical work' },
  { id: 'extra_active', title: 'Extra active', subtitle: 'Very high daily movement most days' }
];

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

function parseAllergySelection(notes: string | null | undefined): {
  selected: AllergyChoice[];
  otherText: string;
} {
  const value = notes?.trim();
  if (!value) {
    return { selected: ['none'], otherText: '' };
  }

  const normalized = value.toLowerCase();
  const selected: AllergyChoice[] = [];

  (Object.entries(allergyLabels) as Array<[Exclude<AllergyChoice, 'none' | 'other'>, string]>).forEach(
    ([id, label]) => {
      if (normalized.includes(label.toLowerCase())) {
        selected.push(id);
      }
    }
  );

  const otherMatch = value.match(/Other:\s*(.+)$/i);
  const otherText = otherMatch?.[1]?.trim() ?? '';
  if (otherText) {
    selected.push('other');
  }

  if (selected.length === 0) {
    return { selected: ['other'], otherText: value };
  }

  return { selected, otherText };
}

function formatAllergySelection(selected: AllergyChoice[], otherText: string): string | null {
  if (selected.length === 0 || selected.includes('none')) {
    return null;
  }

  const labels = selected
    .filter((value): value is Exclude<AllergyChoice, 'none' | 'other'> => value !== 'none' && value !== 'other')
    .map((value) => allergyLabels[value]);

  if (selected.includes('other') && otherText.trim()) {
    labels.push(`Other: ${otherText.trim()}`);
  }

  return labels.length > 0 ? labels.join('; ') : null;
}

function formatGoalPaceLabel(goalType: 'lose' | 'maintain' | 'gain', goalPace: GoalPace | null): string {
  if (goalType === 'maintain') {
    return 'Steady maintenance';
  }
  if (goalType === 'lose') {
    if (goalPace === 'light') {
      return 'Light cut · -350 kcal';
    }
    if (goalPace === 'extreme') {
      return 'Extreme cut · -1000 kcal';
    }
    return 'Recommended cut · -500 kcal';
  }
  if (goalPace === 'aggressive') {
    return 'Aggressive gain · +500 kcal';
  }
  return 'Lean gain · +200 kcal';
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

export default function App(): ReactElement {
  const [ribeyeLoaded] = useRibeyeFonts({
    Ribeye_400Regular
  });
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [entryIntent, setEntryIntent] = useState<'signup' | 'signin' | null>(null);
  const [entryEmailDraft, setEntryEmailDraft] = useState('dev@example.com');
  const [entryDisplayNameDraft, setEntryDisplayNameDraft] = useState('Local Dev User');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryEmailError, setEntryEmailError] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryBackendTone, setEntryBackendTone] = useState<'checking' | 'live'>('checking');
  const [entryBackendStatus, setEntryBackendStatus] = useState('Checking backend reachability');
  const [entryBackendDetail, setEntryBackendDetail] = useState(`Using ${getApiBaseUrl()}`);
  const [section, setSection] = useState<AppSection>('dashboard');
  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false);
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
  const [onboardingGoalPaceDraft, setOnboardingGoalPaceDraft] = useState<GoalPace>('recommended');
  const [onboardingTargetWeightDraft, setOnboardingTargetWeightDraft] = useState('170');
  const [onboardingActivityLevelDraft, setOnboardingActivityLevelDraft] = useState<
    'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'
  >('moderate');
  const [onboardingDietaryPatternDraft, setOnboardingDietaryPatternDraft] = useState<DietaryPattern>('omnivore');
  const [onboardingNutritionStyleDraft, setOnboardingNutritionStyleDraft] = useState<NutritionStyle>('balanced');
  const [onboardingAllergySelectionsDraft, setOnboardingAllergySelectionsDraft] = useState<AllergyChoice[]>(['none']);
  const [onboardingAllergyOtherDraft, setOnboardingAllergyOtherDraft] = useState('');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('basics');
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState('Loading first-run setup');

  function handleSectionChange(nextSection: AppSection) {
    setSection(nextSection);
    setIsShellMenuOpen(false);
  }

  useEffect(() => {
    setIsShellMenuOpen(false);
  }, [section, entryMode]);

  useEffect(() => {
    if (onboardingGoalTypeDraft === 'maintain') {
      return;
    }
    if (onboardingGoalTypeDraft === 'lose' && !['light', 'recommended', 'extreme'].includes(onboardingGoalPaceDraft)) {
      setOnboardingGoalPaceDraft('recommended');
    }
    if (onboardingGoalTypeDraft === 'gain' && !['lean', 'aggressive'].includes(onboardingGoalPaceDraft)) {
      setOnboardingGoalPaceDraft('lean');
    }
  }, [onboardingGoalTypeDraft, onboardingGoalPaceDraft]);

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

  function skipAllergyStep() {
    setOnboardingAllergySelectionsDraft(['none']);
    setOnboardingAllergyOtherDraft('');
    setOnboardingError(null);
    const currentIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
    const nextStep = onboardingSteps[currentIndex + 1];
    if (nextStep) {
      setOnboardingStep(nextStep.id);
    }
  }
  const [logFoodDraft, setLogFoodDraft] = useState('chicken');
  const [logFoodSearchTerm, setLogFoodSearchTerm] = useState('chicken');
  const [logFoodResults, setLogFoodResults] = useState<FoodItem[]>([]);
  const [selectedLogFoodId, setSelectedLogFoodId] = useState('');
  const [logGrams, setLogGrams] = useState('100');
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
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
  const [exerciseTitleDraft, setExerciseTitleDraft] = useState('Bike ride');
  const [exerciseMinutesDraft, setExerciseMinutesDraft] = useState('30');
  const [exerciseCaloriesDraft, setExerciseCaloriesDraft] = useState('220');
  const [plannedExerciseTitleDraft, setPlannedExerciseTitleDraft] = useState('Swim');
  const [plannedExerciseMinutesDraft, setPlannedExerciseMinutesDraft] = useState('55');
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
    setOnboardingSexDraft('female');
    setOnboardingAgeDraft('34');
    setOnboardingHeightFeetDraft('5');
    setOnboardingHeightInchesDraft('10');
    setOnboardingCurrentWeightDraft('180');
    setOnboardingGoalTypeDraft('lose');
    setOnboardingGoalPaceDraft('recommended');
    setOnboardingTargetWeightDraft('170');
    setOnboardingActivityLevelDraft('moderate');
    setOnboardingDietaryPatternDraft('omnivore');
    setOnboardingNutritionStyleDraft('balanced');
    setOnboardingAllergySelectionsDraft(['none']);
    setOnboardingAllergyOtherDraft('');
    setOnboardingStep('basics');
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
    setOnboardingGoalPaceDraft(
      loadedProfile.goal_pace ?? (loadedProfile.goal_type === 'gain' ? 'lean' : 'recommended')
    );
    setOnboardingTargetWeightDraft(
      loadedProfile.target_weight_lbs !== null && loadedProfile.target_weight_lbs !== undefined
        ? String(loadedProfile.target_weight_lbs)
        : ''
    );
    setOnboardingActivityLevelDraft(loadedProfile.activity_level ?? 'moderate');
    setOnboardingDietaryPatternDraft(loadedProfile.dietary_pattern ?? 'omnivore');
    setOnboardingNutritionStyleDraft(loadedProfile.nutrition_style ?? 'balanced');
    const parsedAllergies = parseAllergySelection(loadedProfile.allergy_notes);
    setOnboardingAllergySelectionsDraft(parsedAllergies.selected);
    setOnboardingAllergyOtherDraft(parsedAllergies.otherText);
    setOnboardingStep('basics');

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
        setTrackerTone('checking');
        setTrackerStatus('Preview tracker loaded');
        setTrackerError('No active tracker session. Showing preview tracker data.');
        setExerciseEntries(demoExerciseEntries);
        setPlannedExerciseEntries(demoPlannedExerciseEntries);
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
        const [exercise, plannedExercise, mealPlan, mealPrep] = await Promise.all([
          fetchExerciseEntries(foodSessionToken),
          fetchPlannedExerciseEntries(foodSessionToken),
          fetchMealPlanDays(foodSessionToken),
          fetchMealPrepTasks(foodSessionToken)
        ]);

        if (cancelled) {
          return;
        }

        setExerciseEntries(exercise);
        setPlannedExerciseEntries(plannedExercise);
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
        setMealPlanDays([]);
        setSelectedMealPlanDate(null);
        setMealPlanEatenSlots({});
        setMealPrepTasks([]);
        setTrackerTone('checking');
        setTrackerStatus('Preview tracker loaded');
        setTrackerError(error instanceof Error ? `${error.message} Showing preview tracker data.` : 'Tracker data unavailable. Showing preview tracker data.');
        setExerciseEntries(demoExerciseEntries);
        setPlannedExerciseEntries(demoPlannedExerciseEntries);
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
    setFoodSessionToken(null);
    setEntryEmailError(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setEntryIntent(null);
    setEntryMode(null);
  }

  function logoutToEntryScreen() {
    setFoodSessionToken(null);
    setEntryEmailError(null);
    setEntryError(null);
    setProfileLoaded(false);
    setSection('dashboard');
    setIsShellMenuOpen(false);
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
  const homeDateOptions = useMemo(() => {
    const values = new Set<string>();
    for (let offset = -1; offset <= 5; offset += 1) {
      values.add(addDaysToIsoDate(todayKey, offset));
    }
    sortedMealPlanDays.forEach((day) => {
      if (day.plan_date) {
        values.add(day.plan_date);
      }
    });
    exerciseEntries.forEach((entry) => values.add(entry.logged_on));
    plannedExerciseEntries.forEach((entry) => values.add(entry.planned_on));
    values.add(selectedHomeDate);
    return [...values].sort();
  }, [exerciseEntries, plannedExerciseEntries, selectedHomeDate, sortedMealPlanDays, todayKey]);
  const selectedHomeDateIndex = useMemo(
    () => homeDateOptions.findIndex((value) => value === selectedHomeDate),
    [homeDateOptions, selectedHomeDate]
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
        exerciseEntries: homeCompletedExerciseEntries
      }),
    [homeCompletedExerciseEntries, homeFoodLog, latestProfileGoal, profile]
  );
  const dailyMealPlanSummary = useMemo(
    () => buildDailyMealPlanSummary(homeMealPlanDay, homeMealPlanEatenSlots),
    [homeMealPlanDay, homeMealPlanEatenSlots]
  );
  const dailyExerciseSummary = useMemo(
    () => buildDailyExerciseSummary(homePlannedExerciseEntries),
    [homePlannedExerciseEntries]
  );
  const homeConsumedMacros = homeFoodLog.totals.macros;
  const homeConsumedCalories = dailyHomeTargets.intakeCalories;
  const homeNetCalories = homeConsumedCalories - dailyHomeTargets.exerciseCalories;
  const homeRemainingCalories = dailyHomeTargets.calorieTarget - homeNetCalories;
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
    activeRange === '1D' ? dailyHomeTargets.calorieTarget : activeMetricConfig.targetValue;
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

    if (
      !Number.isFinite(age_years) ||
      age_years <= 0 ||
      !Number.isFinite(feet) ||
      feet <= 0 ||
      !Number.isFinite(inches) ||
      inches < 0 ||
      !Number.isFinite(current_weight_lbs) ||
      current_weight_lbs <= 0
    ) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError('Enter a valid age, height, and weight before continuing.');
      return;
    }

    if (!foodSessionToken) {
      setOnboardingStatus('Could not save onboarding');
      setOnboardingError('Create a live local session before continuing to the app.');
      return;
    }

    const height_cm = round1(((feet * 12 + inches) * 2.54));
    const allergy_notes = formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft);

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
          goal_pace: onboardingGoalTypeDraft === 'maintain' ? null : onboardingGoalPaceDraft,
          target_weight_lbs: null,
          activity_level: onboardingActivityLevelDraft,
          dietary_pattern: onboardingDietaryPatternDraft,
          nutrition_style: onboardingNutritionStyleDraft,
          allergy_notes
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

  async function addPlannedExerciseEntry() {
    const duration_minutes = Number(plannedExerciseMinutesDraft);
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

    const payload = {
      title,
      duration_minutes: Math.round(duration_minutes),
      calories_burned: Math.round(estimatedCaloriesBurned),
      planned_on: selectedHomeDate,
      planned_at: '06:30',
      intensity: deriveExerciseIntensity(Math.round(duration_minutes), Math.round(estimatedCaloriesBurned))
    } as const;

    setPlannedExerciseSaving(true);
    setTrackerTone('checking');
    setTrackerStatus(`${plannedExerciseEditingId ? 'Updating' : 'Planning'} ${title}`);
    setTrackerError(null);
    let previousEntries: PlannedExerciseEntry[] = [];
    let optimisticEntryId: string | null = null;

    setPlannedExerciseEntries((current) => {
      previousEntries = current;
      if (plannedExerciseEditingId) {
        return sortPlannedExerciseEntries(
          current.map((entry) =>
            entry.id === plannedExerciseEditingId
              ? {
                  ...entry,
                  ...payload
                }
              : entry
          )
        );
      }

      const optimisticEntry: PlannedExerciseEntry = {
        id: `planned-exercise-${Date.now()}`,
        ...payload
      };
      optimisticEntryId = optimisticEntry.id;
      return sortPlannedExerciseEntries([...current, optimisticEntry]);
    });

    try {
      if (!foodSessionToken) {
        throw new Error(`Create a live local session before ${plannedExerciseEditingId ? 'updating' : 'saving'} planned exercise.`);
      }

      const saved = plannedExerciseEditingId
        ? await updatePlannedExerciseEntry(plannedExerciseEditingId, payload, foodSessionToken)
        : await createPlannedExerciseEntry(payload, foodSessionToken);
      setPlannedExerciseEntries((current) =>
        sortPlannedExerciseEntries([
          ...current.filter((entry) => entry.id !== (plannedExerciseEditingId ?? optimisticEntryId)),
          saved
        ])
      );
      setTrackerTone('live');
      setTrackerStatus(
        `${title} ${plannedExerciseEditingId ? 'updated for' : 'planned for'} ${formatHomeDateLabel(selectedHomeDate, todayKey)}`
      );
      resetPlannedExerciseDrafts();
    } catch (error) {
      setPlannedExerciseEntries(previousEntries);
      setTrackerTone('checking');
      setTrackerStatus(`Could not ${plannedExerciseEditingId ? 'update' : 'plan'} ${title}`);
      setTrackerError(error instanceof Error ? error.message : `Unable to ${plannedExerciseEditingId ? 'update' : 'save'} planned exercise.`);
    } finally {
      setPlannedExerciseSaving(false);
    }
  }

  function beginPlannedExerciseEdit(entry: PlannedExerciseEntry) {
    setPlannedExerciseEditingId(entry.id);
    setSelectedHomeDate(entry.planned_on);
    setPlannedExerciseTitleDraft(entry.title);
    setPlannedExerciseMinutesDraft(String(entry.duration_minutes));
    setTrackerTone('live');
    setTrackerStatus(`Editing ${entry.title}`);
    setTrackerError(null);
  }

  function resetPlannedExerciseDrafts() {
    setPlannedExerciseEditingId(null);
    setPlannedExerciseTitleDraft('Walk');
    setPlannedExerciseMinutesDraft('25');
  }

  async function removePlannedExerciseEntry(entry: PlannedExerciseEntry) {
    let previousEntries: PlannedExerciseEntry[] = [];
    setPlannedExerciseDeletingId(entry.id);
    setTrackerTone('checking');
    setTrackerStatus(`Deleting ${entry.title}`);
    setTrackerError(null);
    setPlannedExerciseEntries((current) => {
      previousEntries = current;
      return current.filter((item) => item.id !== entry.id);
    });

    try {
      if (!foodSessionToken) {
        throw new Error('Create a live local session before deleting planned exercise.');
      }
      await deletePlannedExerciseEntry(entry.id, foodSessionToken);
      if (entry.completed_exercise_entry_id) {
        setExerciseEntries(await fetchExerciseEntries(foodSessionToken));
      }
      if (plannedExerciseEditingId === entry.id) {
        resetPlannedExerciseDrafts();
      }
      setTrackerTone('live');
      setTrackerStatus(`${entry.title} deleted`);
    } catch (error) {
      setPlannedExerciseEntries(previousEntries);
      setTrackerTone('checking');
      setTrackerStatus(`Could not delete ${entry.title}`);
      setTrackerError(error instanceof Error ? error.message : 'Unable to delete planned exercise.');
    } finally {
      setPlannedExerciseDeletingId(null);
    }
  }

  async function togglePlannedExerciseCompletion(entry: PlannedExerciseEntry) {
    const nextCompletedAt = entry.completed_at ? null : new Date().toISOString();
    const optimisticEntry: PlannedExerciseEntry = {
      ...entry,
      completed_at: nextCompletedAt,
      completed_exercise_entry_id: nextCompletedAt ? entry.completed_exercise_entry_id ?? `exercise-${Date.now()}` : null
    };

    setPlannedExerciseUpdatingId(entry.id);
    setTrackerTone('checking');
    setTrackerStatus(
      `${entry.title} ${nextCompletedAt ? 'completed' : 'marked incomplete'}`
    );
    setTrackerError(null);
    setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? optimisticEntry : item)));

    try {
      if (!foodSessionToken) {
        throw new Error('Create a live local session before updating planned exercise.');
      }
      const saved = await updatePlannedExerciseCompletion(entry.id, nextCompletedAt, foodSessionToken);
      setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? saved : item)));
      setExerciseEntries(await fetchExerciseEntries(foodSessionToken));
      setTrackerTone('live');
      setTrackerStatus(
        `${entry.title} ${nextCompletedAt ? 'completed' : 'marked incomplete'}`
      );
    } catch (error) {
      setPlannedExerciseEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
      setTrackerTone('checking');
      setTrackerStatus(`Could not update ${entry.title}`);
      setTrackerError(error instanceof Error ? error.message : 'Unable to update planned exercise completion.');
    } finally {
      setPlannedExerciseUpdatingId(null);
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
      goal_pace: onboardingGoalTypeDraft === 'maintain' ? null : onboardingGoalPaceDraft,
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

  function validateOnboardingStep(step: OnboardingStep): string | null {
    if (step === 'basics') {
      const age_years = Number(onboardingAgeDraft);
      const feet = Number(onboardingHeightFeetDraft);
      const inches = Number(onboardingHeightInchesDraft);
      const current_weight_lbs = Number(onboardingCurrentWeightDraft);

      if (
        !Number.isFinite(age_years) ||
        age_years <= 0 ||
        !Number.isFinite(feet) ||
        feet <= 0 ||
        !Number.isFinite(inches) ||
        inches < 0 ||
        !Number.isFinite(current_weight_lbs) ||
        current_weight_lbs <= 0
      ) {
        return 'Enter valid body details before continuing.';
      }
    }

    if (step === 'goal') {
      return null;
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

  function goToNextOnboardingStep() {
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
    }
  }

  function goToPreviousOnboardingStep() {
    const currentIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
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

              {entryIntent === null ? (
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
                        placeholderTextColor="#7c8aa5"
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
                          placeholderTextColor="#7c8aa5"
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
    const activeStepIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
    const currentStepLabel = onboardingSteps[activeStepIndex]?.label ?? 'Basics';
    const showOnboardingStatus = onboardingSaving || Boolean(onboardingError);
    const selectedGoalPaceCards =
      onboardingGoalTypeDraft === 'lose'
        ? [
            {
              id: 'light' as GoalPace,
              title: 'Light cut',
              detail: 'About 350 calories below maintenance',
              image: mascotDefaultImage,
              note: 'Casual pace'
            },
            {
              id: 'recommended' as GoalPace,
              title: 'Recommended cut',
              detail: 'About 500 calories below maintenance',
              image: mascotRunImage,
              note: 'Best default'
            },
            {
              id: 'extreme' as GoalPace,
              title: 'Extreme cut',
              detail: 'About 1000 calories below maintenance',
              image: mascotSwimImage,
              note: 'Warning: hardest option'
            }
          ]
        : onboardingGoalTypeDraft === 'gain'
          ? [
              {
                id: 'lean' as GoalPace,
                title: 'Lean gain',
                detail: 'About 200 calories above maintenance',
                image: mascotWeightsImage,
                note: 'Slow steady surplus'
              },
              {
                id: 'aggressive' as GoalPace,
                title: 'Aggressive gain',
                detail: 'About 500 calories above maintenance',
                image: mascotBikeImage,
                note: 'Faster scale movement'
              }
            ]
          : [];
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
                <View style={styles.setupStepMeta}>
                  <Text style={styles.setupStepCounter}>
                    Step {activeStepIndex + 1} of {onboardingSteps.length}
                  </Text>
                  <Text style={styles.setupStepCaption}>{currentStepLabel}</Text>
                </View>

                {showOnboardingStatus ? (
                  <View
                    style={[
                      styles.inlineStatus,
                      { borderColor: onboardingSaving ? toneColor('checking') : '#d97706' }
                    ]}
                  >
                    <Text style={styles.inlineStatusLabel}>
                      {onboardingSaving ? 'Saving profile...' : 'There is a setup issue to fix'}
                    </Text>
                    {onboardingError ? <Text style={styles.inlineStatusDetail}>{onboardingError}</Text> : null}
                  </View>
                ) : null}

              {onboardingStep === 'basics' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Start with body basics</Text>

                  <View style={styles.setupChoiceRow}>
                    {(['female', 'male'] as const).map((option) => {
                      const active = onboardingSexDraft === option;
                      return (
                        <Pressable
                          key={option}
                          style={[styles.setupChoiceCard, active && styles.setupChoiceCardActive]}
                          onPress={() => setOnboardingSexDraft(option)}
                        >
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {option === 'male' ? 'Male' : 'Female'}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>Used for the initial energy estimate</Text>
                        </Pressable>
                      );
                    })}
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
                </View>
              ) : null}

              {onboardingStep === 'goal' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Choose your goal</Text>

                  <View style={styles.setupGoalGrid}>
                    {([
                      { id: 'lose' as const, title: 'Weight Loss', detail: 'Cut body weight with a defined deficit', image: mascotRunImage },
                      { id: 'maintain' as const, title: 'Maintenance', detail: 'Hold steady around maintenance calories', image: mascotDefaultImage },
                      { id: 'gain' as const, title: 'Weight Gain', detail: 'Add weight with a controlled surplus', image: mascotWeightsImage }
                    ]).map((option) => {
                      const active = onboardingGoalTypeDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupGoalCard, active && styles.setupGoalCardActive]}
                          onPress={() => setOnboardingGoalTypeDraft(option.id)}
                        >
                          <Image source={option.image} style={styles.setupGoalImage} resizeMode="contain" />
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {option.title}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>{option.detail}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'pace' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Choose the style of your goal</Text>

                  {onboardingGoalTypeDraft === 'maintain' ? (
                    <View style={styles.detailCard}>
                      <Text style={styles.detailTitle}>Maintenance stays steady</Text>
                      <Text style={styles.detailSubtitle}>
                        No extra pace choice is needed. We will use your estimated maintenance calories directly.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.setupGoalGrid}>
                      {selectedGoalPaceCards.map((option) => {
                        const active = onboardingGoalPaceDraft === option.id;
                        return (
                          <Pressable
                            key={option.id}
                            style={[styles.setupGoalCard, active && styles.setupGoalCardActive]}
                            onPress={() => setOnboardingGoalPaceDraft(option.id)}
                          >
                            <Image source={option.image} style={styles.setupGoalImage} resizeMode="contain" />
                            <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                              {option.title}
                            </Text>
                            <Text style={styles.setupChoiceDetail}>{option.detail}</Text>
                            <Text style={styles.setupGoalNote}>{option.note}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              {onboardingStep === 'activity' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>How active are you most days?</Text>
                  <Text style={styles.panelDetail}>
                    This should reflect non-exercise lifestyle movement. Planned workouts are a separate layer later.
                  </Text>

                  <View style={styles.setupOptionStack}>
                    {activityLevelCards.map((option) => {
                      const active = onboardingActivityLevelDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.setupOptionRow, active && styles.setupOptionRowActive]}
                          onPress={() => setOnboardingActivityLevelDraft(option.id)}
                        >
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {option.title}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>{option.subtitle}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'diet' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Pick your dietary pattern</Text>

                  <View style={styles.setupDietGrid}>
                    {dietaryPatternOptions.map((option) => {
                      const active = onboardingDietaryPatternDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.setupDietCard,
                            { borderColor: active ? option.accent : '#d7dee7' },
                            active && styles.setupDietCardActive
                          ]}
                          onPress={() => setOnboardingDietaryPatternDraft(option.id)}
                        >
                          <View style={[styles.setupDietBadge, { backgroundColor: option.accent }]}>
                            <Text style={styles.setupDietBadgeLabel}>{option.mark}</Text>
                          </View>
                          <Text
                            style={[
                              styles.setupChoiceTitle,
                              styles.setupDietTitle,
                              active && styles.setupChoiceTitleActive
                            ]}
                          >
                            {option.title}
                          </Text>
                          <Text style={[styles.setupChoiceDetail, styles.setupDietDetail]}>{option.subtitle}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'style' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Pick your nutrition style</Text>

                  <View style={styles.setupDietGrid}>
                    {nutritionStyleOptions.map((option) => {
                      const active = onboardingNutritionStyleDraft === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.setupDietCard,
                            { borderColor: active ? option.accent : '#d7dee7' },
                            active && styles.setupDietCardActive
                          ]}
                          onPress={() => setOnboardingNutritionStyleDraft(option.id)}
                        >
                          <View style={[styles.setupDietBadge, { backgroundColor: option.accent }]}>
                            <Text style={styles.setupDietBadgeLabel}>{option.mark}</Text>
                          </View>
                          <Text
                            style={[
                              styles.setupChoiceTitle,
                              styles.setupDietTitle,
                              active && styles.setupChoiceTitleActive
                            ]}
                          >
                            {option.title}
                          </Text>
                          <Text style={[styles.setupChoiceDetail, styles.setupDietDetail]}>{option.subtitle}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {onboardingStep === 'allergies' ? (
                <View style={styles.setupPanel}>
                  <Text style={styles.panelTitle}>Allergies or exclusions</Text>

                  <View style={styles.setupDietGrid}>
                    {allergyOptions.map((option) => {
                      const active = onboardingAllergySelectionsDraft.includes(option.id);
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.setupDietCard,
                            { borderColor: active ? option.accent : '#d7dee7' },
                            active && styles.setupDietCardActive
                          ]}
                          onPress={() => toggleOnboardingAllergy(option.id)}
                        >
                          <View style={[styles.setupDietBadge, { backgroundColor: option.accent }]}>
                            <Text style={styles.setupDietBadgeLabel}>{option.mark}</Text>
                          </View>
                          <Text
                            style={[
                              styles.setupChoiceTitle,
                              styles.setupDietTitle,
                              active && styles.setupChoiceTitleActive
                            ]}
                          >
                            {option.title}
                          </Text>
                          <Text style={[styles.setupChoiceDetail, styles.setupDietDetail]}>{option.subtitle}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {onboardingAllergySelectionsDraft.includes('other') ? (
                    <TextInput
                      value={onboardingAllergyOtherDraft}
                      onChangeText={setOnboardingAllergyOtherDraft}
                      placeholder="Add another allergy or exclusion"
                      placeholderTextColor="#7c8aa5"
                      style={styles.setupTextArea}
                      multiline
                      textAlignVertical="top"
                    />
                  ) : null}
                </View>
              ) : null}

              {onboardingStep === 'review' ? (
                <View style={styles.setupPanel}>
                  <View style={styles.setupPanelHeading}>
                    <Text style={styles.panelTitle}>Review your setup</Text>
                    <Text style={styles.panelDetail}>
                      Save this profile and then the app will drop you into your daily home with targets ready.
                    </Text>
                  </View>

                  <View style={styles.setupReviewCard}>
                    <View style={styles.setupReviewHeader}>
                      <Text style={styles.setupReviewTitle}>{entryDisplayNameDraft || 'Local profile'}</Text>
                      <Text style={styles.setupReviewSubtitle}>
                        This is what the app will use to generate your first daily targets.
                      </Text>
                    </View>
                    <View style={styles.setupReviewGrid}>
                      <View style={styles.setupReviewTile}>
                        <Text style={styles.setupReviewLabel}>Body stats</Text>
                        <Text style={styles.setupReviewValue}>
                          {Math.round(Number(onboardingCurrentWeightDraft) || 0)} lb · {onboardingHeightFeetDraft}'
                          {onboardingHeightInchesDraft}" · age {onboardingAgeDraft}
                        </Text>
                      </View>
                      <View style={styles.setupReviewTile}>
                        <Text style={styles.setupReviewLabel}>Goal</Text>
                        <Text style={styles.setupReviewValue}>
                          {formatGoalTypeLabel(onboardingGoalTypeDraft)} ·{' '}
                          {formatGoalPaceLabel(
                            onboardingGoalTypeDraft,
                            onboardingGoalTypeDraft === 'maintain' ? null : onboardingGoalPaceDraft
                          )}
                        </Text>
                      </View>
                      <View style={styles.setupReviewTile}>
                        <Text style={styles.setupReviewLabel}>Lifestyle</Text>
                        <Text style={styles.setupReviewValue}>
                          {activityLevelCards.find((option) => option.id === onboardingActivityLevelDraft)?.title ?? 'Moderate'} activity
                        </Text>
                      </View>
                      <View style={styles.setupReviewTile}>
                        <Text style={styles.setupReviewLabel}>Diet</Text>
                        <Text style={styles.setupReviewValue}>
                          {dietaryPatternOptions.find((option) => option.id === onboardingDietaryPatternDraft)?.title ?? 'Omnivore'}
                        </Text>
                      </View>
                      <View style={styles.setupReviewTile}>
                        <Text style={styles.setupReviewLabel}>Nutrition style</Text>
                        <Text style={styles.setupReviewValue}>
                          {nutritionStyleOptions.find((option) => option.id === onboardingNutritionStyleDraft)?.title ?? 'Balanced'}
                        </Text>
                      </View>
                      {formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft) ? (
                        <View style={styles.setupReviewTile}>
                          <Text style={styles.setupReviewLabel}>Avoid</Text>
                          <Text style={styles.setupReviewValue}>
                            {formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}

                <View style={styles.setupFooter}>
                  <View style={styles.setupNavRow}>
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                      onPress={goToPreviousOnboardingStep}
                      disabled={activeStepIndex === 0 || onboardingSaving}
                    >
                      <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
                    </Pressable>

                    {onboardingStep === 'allergies' ? (
                      <Pressable
                        style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                        onPress={skipAllergyStep}
                        disabled={onboardingSaving}
                      >
                        <Text style={styles.setupActionButtonLabelSecondary}>Skip</Text>
                      </Pressable>
                    ) : null}

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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.appHeader}>
          <View style={styles.appShellTopRow}>
            <View style={styles.appHeaderTitleWrap}>
              <Text style={[styles.appBrandTitle, ribeyeLoaded && styles.appBrandTitleDisplay]}>Relish</Text>
            </View>
            <View style={styles.appShellActions}>
              <Pressable
                style={styles.avatarButton}
                onPress={() => handleSectionChange('profile')}
                accessibilityLabel="Open profile"
              >
                <View style={styles.avatarBadge}>
                  <Image source={mascotAvatarImage} style={styles.avatarImage} resizeMode="cover" />
                </View>
              </Pressable>
              <Pressable
                style={[styles.menuButton, isShellMenuOpen && styles.menuButtonActive]}
                onPress={() => setIsShellMenuOpen((current) => !current)}
                accessibilityLabel="Toggle navigation menu"
              >
                <View style={styles.menuIcon}>
                  <View style={[styles.menuIconBar, isShellMenuOpen && styles.menuIconBarActive]} />
                  <View style={[styles.menuIconBar, isShellMenuOpen && styles.menuIconBarActive]} />
                  <View style={[styles.menuIconBar, isShellMenuOpen && styles.menuIconBarActive]} />
                </View>
              </Pressable>
            </View>
          </View>

          {isShellMenuOpen ? (
            <View style={styles.shellMenuCard}>
              {appShellMenuGroups.map((group) => (
                <View key={group.title} style={styles.shellMenuGroup}>
                  <Text style={styles.shellMenuGroupTitle}>{group.title}</Text>
                  <View style={styles.shellMenuList}>
                    {group.sections.map((item) => {
                      const active = item.id === section;
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.shellMenuItem, active && styles.shellMenuItemActive]}
                          onPress={() => handleSectionChange(item.id)}
                        >
                          <View style={styles.shellMenuItemCopy}>
                            <Text style={[styles.shellMenuItemTitle, active && styles.shellMenuItemTitleActive]}>
                              {item.label}
                            </Text>
                            <Text style={styles.shellMenuItemDetail}>{item.detail}</Text>
                          </View>
                          {active ? <Text style={styles.shellMenuItemState}>Open</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.shellMenuFooter}>
                <View style={styles.shellMenuModeRow}>
                  <View>
                    <Text style={styles.modeControlLabel}>Mode</Text>
                    <Text style={styles.shellMenuModeValue}>
                      {entryMode === 'live' ? 'Live local profile' : 'Preview demo'}
                    </Text>
                  </View>
                  <Text style={styles.shellMenuModeDetail}>
                    {entryMode === 'live' ? 'Backend session active' : 'Preview state only'}
                  </Text>
                </View>
                <View style={styles.modeControlActions}>
                  {entryMode === 'live' ? (
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={logoutToEntryScreen}
                    >
                      <Text style={styles.inlinePillButtonLabel}>Log out</Text>
                    </Pressable>
                  ) : null}
                  {entryMode === 'live' ? (
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => {
                        setIsShellMenuOpen(false);
                        enterPreviewMode();
                      }}
                    >
                      <Text style={styles.inlinePillButtonLabel}>Switch to preview</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => {
                        setIsShellMenuOpen(false);
                        returnToEntryScreen();
                      }}
                    >
                      <Text style={styles.inlinePillButtonLabel}>Create live profile</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.inlinePillButton}
                    onPress={() => {
                      setIsShellMenuOpen(false);
                      returnToEntryScreen();
                    }}
                  >
                    <Text style={styles.inlinePillButtonLabel}>Change entry mode</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {section !== 'dashboard' ? (
            <View style={[styles.appStatusCard, { borderColor: toneColor(syncTone) }]}>
              <Text style={styles.appStatusLabel}>{syncLabel}</Text>
              <Text style={styles.appStatusDetail}>{syncDetail}</Text>
            </View>
          ) : null}
        </View>

        {section === 'dashboard' && (
          <>
            <View style={styles.dashboardStack}>
              <View style={styles.homeSection}>
                <View style={styles.dailyHomeSummaryHeader}>
                  <View>
                    <Text style={styles.detailTitle}>Daily Plan</Text>
                    <Text style={styles.detailSubtitle}>{formatHomeDateLabel(selectedHomeDate, todayKey)}</Text>
                  </View>
                  <View style={styles.homeDateNavigator}>
                    <Pressable
                      style={[styles.homeDateButton, selectedHomeDateIndex <= 0 && styles.homeDateButtonDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Show previous day"
                      disabled={selectedHomeDateIndex <= 0}
                      onPress={() => setSelectedHomeDate(homeDateOptions[Math.max(selectedHomeDateIndex - 1, 0)] ?? selectedHomeDate)}
                    >
                      <Text style={styles.homeDateButtonLabel}>{'<'}</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.homeDateButton,
                        selectedHomeDateIndex < 0 || selectedHomeDateIndex >= homeDateOptions.length - 1
                          ? styles.homeDateButtonDisabled
                          : null
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Show next day"
                      disabled={selectedHomeDateIndex < 0 || selectedHomeDateIndex >= homeDateOptions.length - 1}
                      onPress={() =>
                        setSelectedHomeDate(
                          homeDateOptions[Math.min(selectedHomeDateIndex + 1, homeDateOptions.length - 1)] ?? selectedHomeDate
                        )
                      }
                    >
                      <Text style={styles.homeDateButtonLabel}>{'>'}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.dailyHomeSummaryMetricRow}>
                  <Text style={styles.dailyHomeSummaryLabel}>Daily calories</Text>
                  <Text style={styles.dailyHomeSummaryValue}>
                    {homeConsumedCalories.toLocaleString()}/{dailyHomeTargets.calorieTarget.toLocaleString()} kcal
                  </Text>
                </View>

                <View style={styles.dailyHomeSummaryMetricRow}>
                  <Text style={styles.dailyHomeSummaryLabel}>Macro split</Text>
                  <Text style={styles.dailyHomeSummaryValue}>
                    {dailyHomeTargets.macroPercentages.protein} / {dailyHomeTargets.macroPercentages.carbs} / {dailyHomeTargets.macroPercentages.fat}
                  </Text>
                </View>

                <Text style={styles.dailyHomeMacroLine}>
                  Remaining {homeRemainingCalories.toLocaleString()} kcal
                </Text>
              </View>

              <View style={styles.homeSection}>
                <View style={styles.recipeRowTitleWrap}>
                  <View>
                    <Text style={styles.detailTitle}>Consumed calories</Text>
                  </View>
                </View>
                <View style={styles.dailyHomeMacroRingRow}>
                  <MacroSplitRing
                    label="Protein"
                    consumed={Math.round(homeConsumedMacros.protein)}
                    target={Math.round(dailyHomeTargets.macroTargets.protein)}
                    baseColor="#0f766e"
                  />
                  <MacroSplitRing
                    label="Carbs"
                    consumed={Math.round(homeConsumedMacros.carbs)}
                    target={Math.round(dailyHomeTargets.macroTargets.carbs)}
                    baseColor="#ea580c"
                  />
                  <MacroSplitRing
                    label="Fat"
                    consumed={Math.round(homeConsumedMacros.fat)}
                    target={Math.round(dailyHomeTargets.macroTargets.fat)}
                    baseColor="#2563eb"
                  />
                </View>
                {homeConsumedCalories === 0 ? (
                  <Text style={styles.dailyHomeEmptyState}>No calories logged yet.</Text>
                ) : null}
              </View>

              <DashboardHeroChart
                controls={
                  <DashboardTimeRangeTabs
                    activeRange={activeRange}
                    onChange={setActiveRange}
                    ranges={rangeTabs}
                  />
                }
                caption={null}
                detail={null}
                legendLabel="Consumed calories"
                plannedLabel="Planned calories"
                plannedValue={dailyMealPlanSummary.hasPlan ? dailyMealPlanSummary.plannedCalories : null}
                points={homeChartPoints}
                range={activeRange}
                targetLabel="Target calories"
                targetValue={homeChartTargetValue}
                title="Calories"
                flat
              />

              <View style={styles.homeSection}>
                  <View style={styles.recipeRowTitleWrap}>
                    <View>
                      <Text style={styles.panelEyebrow}>Planned exercise</Text>
                      <Text style={styles.detailTitle}>{formatHomeSectionTitle(selectedHomeDate, todayKey, 'session')}</Text>
                    </View>
                    <Text style={styles.detailSubtitle}>
                      {dailyExerciseSummary.sessionCount > 0
                        ? `${dailyExerciseSummary.sessionCount} session${dailyExerciseSummary.sessionCount === 1 ? '' : 's'} planned`
                        : 'No planned exercise yet'}
                    </Text>
                  </View>

                  <View style={styles.summaryStrip}>
                    <MetricTile label="Minutes" value={`${dailyExerciseSummary.totalMinutes}`} compact />
                    <MetricTile label="Calories" value={`${dailyExerciseSummary.totalCalories.toLocaleString()} kcal`} compact />
                  </View>

                  <View>
                    {homePlannedExerciseEntries.length > 0 ? (
                      homePlannedExerciseEntries.slice(0, 2).map((entry) => (
                        <View key={entry.id} style={styles.listRow}>
                          <View style={styles.listRowCopyFlex}>
                            <Text style={styles.listTitle}>{entry.title}</Text>
                            <Text style={styles.listCaption}>
                              {entry.completed_at
                                ? `Completed ${formatCompletionTimeLabel(entry.completed_at)}`
                                : `${entry.planned_at} · ${entry.duration_minutes} min · ${entry.intensity}`}
                            </Text>
                          </View>
                          <View style={styles.listRowActions}>
                            <Text style={styles.listMetric}>{entry.calories_burned} kcal</Text>
                            <Pressable
                              style={[styles.inlinePillButton, entry.completed_at ? styles.inlinePillButtonComplete : null]}
                              onPress={() => void togglePlannedExerciseCompletion(entry)}
                              disabled={plannedExerciseUpdatingId === entry.id}
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
                      ))
                    ) : (
                      <Text style={styles.dailyHomeEmptyState}>No planned exercise saved yet.</Text>
                    )}
                  </View>
              </View>

              <View style={styles.homeSection}>
                  <View style={styles.recipeRowTitleWrap}>
                    <View>
                      <Text style={styles.detailTitle}>Meal Plan</Text>
                      <Text style={styles.detailSubtitle}>{formatHomeDateLabel(selectedHomeDate, todayKey)}</Text>
                      {dailyMealPlanSummary.hasPlan ? (
                        <Text style={styles.detailSubtitle}>
                          P {Math.round(dailyMealPlanSummary.plannedMacros.protein)}g · C {Math.round(dailyMealPlanSummary.plannedMacros.carbs)}g · F {Math.round(dailyMealPlanSummary.plannedMacros.fat)}g
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.dailyHomeMealPlanHeaderActions}>
                      <Text style={styles.detailSubtitle}>
                        {dailyMealPlanSummary.hasPlan
                          ? `${dailyMealPlanSummary.plannedCalories.toLocaleString()} kcal`
                          : 'No meal plan saved yet'}
                      </Text>
                      <Pressable style={styles.dailyHomeEditButton} accessibilityRole="button" accessibilityLabel="Edit meal plan">
                        <Text style={styles.dailyHomeEditButtonLabel}>✎</Text>
                      </Pressable>
                    </View>
                  </View>

                  {dailyMealPlanSummary.hasPlan ? (
                    <>
                      {homeMealPlanDay?.slots.map((slot) => {
                        const logged = homeMealPlanEatenSlots[slot.id] ?? false;
                        const slotItems = slot.items ?? [];
                        return (
                          <Pressable
                            key={slot.id}
                            style={[styles.mealPlanSlotCard, logged && styles.mealPlanLoggedRow]}
                            onPress={() => void toggleMealPlanMeal(homeMealPlanDay, slot.id, slot.meal_label)}
                          >
                            <View style={styles.mealPlanSlotHeader}>
                              <View style={styles.dailyHomeMealPlanSlotCopy}>
                                <View style={styles.mealPlanSlotTitleRow}>
                                  <Text style={styles.mealPlanSlotLabel}>{slot.meal_label}</Text>
                                  <Text style={styles.mealPlanSlotTotal}>{slot.calories} kcal</Text>
                                </View>
                                <Text style={styles.mealPlanSlotSubtitle}>{slot.title}</Text>
                              </View>
                              <View style={[styles.mealPlanCheck, logged && styles.mealPlanCheckActive]}>
                                <Text style={[styles.mealPlanCheckLabel, logged && styles.mealPlanCheckLabelActive]}>
                                  {logged ? '✓' : ''}
                                </Text>
                              </View>
                            </View>
                            {slotItems.length > 0 ? (
                              <View style={styles.mealPlanItemList}>
                                  {slotItems.map((item, index) => (
                                    <View key={`${slot.id}-item-${index}`} style={styles.mealPlanItemRow}>
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
                    </>
                  ) : (
                    <Text style={styles.dailyHomeEmptyState}>No meal plan saved yet.</Text>
                  )}
              </View>

              <Text style={styles.dashboardFooterStatus}>
                {syncLabel} · {syncDetail}
              </Text>
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
                  placeholderTextColor="#7c8aa5"
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
                  placeholder="Minutes"
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  keyboardType="numeric"
                  autoCorrect={false}
                />
                <View style={styles.metricTileCompact}>
                  <Text style={styles.metricLabel}>Estimated burn</Text>
                  <Text style={styles.metricValue}>{estimatedPlannedExerciseCalories} kcal</Text>
                </View>
              </View>

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

function MacroSplitRing({
  baseColor,
  consumed,
  label,
  target
}: {
  baseColor: string;
  consumed: number;
  label: string;
  target: number;
}): ReactElement {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? consumed / target : 0;
  const percent = target > 0 ? Math.round(ratio * 100) : 0;
  const clamped = Math.max(0, Math.min(percent, 100));
  const overflowPercent = Math.max(0, percent - 100);
  const offset = circumference - (clamped / 100) * circumference;
  const overflowOffset = circumference - (Math.min(overflowPercent, 100) / 100) * circumference;

  let accentColor = baseColor;
  if (ratio >= 1.2) {
    accentColor = '#b91c1c';
  } else if (ratio >= 0.9 && ratio <= 1.1) {
    accentColor = '#15803d';
  }

  return (
    <View style={styles.macroSplitRingCard}>
      <View style={styles.macroSplitRingWrap}>
        <Svg width={54} height={54}>
          <Circle cx="27" cy="27" r={radius} stroke="#dbe3ec" strokeWidth="7" fill="none" />
          <Circle
            cx="27"
            cy="27"
            r={radius}
            stroke={accentColor}
            strokeWidth="7"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin="27,27"
          />
          {overflowPercent > 0 ? (
            <Circle
              cx="27"
              cy="27"
              r={radius + 4}
              stroke="#b91c1c"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={overflowOffset}
              strokeLinecap="round"
              rotation="-90"
              origin="27,27"
            />
          ) : null}
        </Svg>
        <View style={styles.macroSplitRingCenter}>
          <Text
            style={[
              styles.macroSplitRingPercent,
              ratio >= 1.2
                ? styles.macroSplitRingPercentOver
                : ratio >= 0.9 && ratio <= 1.1
                  ? styles.macroSplitRingPercentNear
                  : null
            ]}>
            {Math.max(percent, 0)}%
          </Text>
        </View>
      </View>
      <Text style={styles.macroSplitRingLabel}>{label}</Text>
      <Text
        style={[
          styles.macroSplitRingValue,
          ratio >= 1.2
            ? styles.macroSplitRingValueOver
            : ratio >= 0.9 && ratio <= 1.1
              ? styles.macroSplitRingValueNear
              : null
        ]}>
        {consumed}g
      </Text>
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
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

function formatHomeSectionTitle(value: string, todayKey: string, noun: string): string {
  return value === todayKey ? `Today's ${noun}` : `${formatHomeDateLabel(value, todayKey)} ${noun}`;
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
  setupBackdrop: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8
  },
  setupCard: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#dde6ee',
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
    color: '#132536',
    fontSize: 22,
    fontWeight: '800'
  },
  setupMascotWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#f6f0e7',
    borderWidth: 1,
    borderColor: '#e5ddd1'
  },
  setupMascotImage: {
    width: '100%',
    height: '100%'
  },
  setupStepMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  setupStepCounter: {
    color: '#17324d',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  setupStepCaption: {
    color: '#66778c',
    fontSize: 13,
    fontWeight: '700'
  },
  setupPanel: {
    gap: 14
  },
  setupPanelHeading: {
    gap: 6
  },
  setupChoiceRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  setupChoiceCard: {
    flexGrow: 1,
    flexBasis: 180,
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 14,
    gap: 6
  },
  setupChoiceCardActive: {
    backgroundColor: '#eef3f8',
    borderColor: '#17324d'
  },
  setupChoiceTitle: {
    color: '#132536',
    fontSize: 16,
    fontWeight: '800'
  },
  setupChoiceTitleActive: {
    color: '#17324d'
  },
  setupChoiceDetail: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 17
  },
  setupGoalGrid: {
    flexDirection: 'column',
    gap: 10
  },
  setupGoalCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    alignItems: 'center'
  },
  setupGoalCardActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  setupGoalImage: {
    width: '100%',
    height: 72
  },
  setupGoalNote: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '700'
  },
  setupOptionStack: {
    gap: 10
  },
  setupOptionRow: {
    backgroundColor: '#f7f4ef',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 14,
    gap: 4
  },
  setupOptionRowActive: {
    backgroundColor: '#eef3f8',
    borderColor: '#17324d'
  },
  setupDietCard: {
    width: 148,
    minHeight: 136,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    alignItems: 'center'
  },
  setupDietCardActive: {
    backgroundColor: '#f8fafc'
  },
  setupDietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12
  },
  setupDietTitle: {
    textAlign: 'center'
  },
  setupDietDetail: {
    textAlign: 'center'
  },
  setupDietBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  setupDietBadgeLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  setupTextArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#d7dee7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#132536',
    backgroundColor: '#f8fafc'
  },
  setupReviewCard: {
    backgroundColor: '#fbfcfe',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 18,
    gap: 14
  },
  setupReviewHeader: {
    gap: 4
  },
  setupReviewTitle: {
    color: '#132536',
    fontSize: 22,
    fontWeight: '800'
  },
  setupReviewSubtitle: {
    color: '#5c6d80',
    fontSize: 13,
    lineHeight: 18
  },
  setupReviewGrid: {
    gap: 10
  },
  setupReviewTile: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4
  },
  setupReviewLabel: {
    color: '#66778c',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  setupReviewValue: {
    color: '#132536',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700'
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
    backgroundColor: '#17324d'
  },
  setupActionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#17324d'
  },
  setupActionButtonLabelPrimary: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15
  },
  setupActionButtonLabelSecondary: {
    color: '#17324d',
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
    color: '#132536',
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
    borderColor: '#d7dee7',
    backgroundColor: '#f7f4ef',
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
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dee7',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  menuButtonActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  menuIcon: {
    gap: 4
  },
  menuIconBar: {
    width: 18,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#17324d'
  },
  menuIconBarActive: {
    backgroundColor: '#ffffff'
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
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 14,
    gap: 6
  },
  entryPreviewTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '800'
  },
  entryPreviewDetail: {
    color: '#66778c',
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
    color: '#ffffff',
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
    backgroundColor: '#fffaf0',
    gap: 2
  },
  welcomeStatusLabel: {
    color: RELISH_COLORS.text,
    fontSize: 12,
    fontWeight: '700'
  },
  welcomeStatusDetail: {
    color: '#8a5a1d',
    fontSize: 11,
    lineHeight: 16
  },
  entryAuthActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
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
  shellMenuCard: {
    backgroundColor: '#f9fbfd',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 14,
    gap: 14
  },
  shellMenuGroup: {
    gap: 10
  },
  shellMenuGroupTitle: {
    color: '#6b7b90',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  shellMenuList: {
    gap: 8
  },
  shellMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  shellMenuItemActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  shellMenuItemCopy: {
    flex: 1,
    gap: 3
  },
  shellMenuItemTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '800'
  },
  shellMenuItemTitleActive: {
    color: '#17324d'
  },
  shellMenuItemDetail: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 17
  },
  shellMenuItemState: {
    color: '#17324d',
    fontSize: 12,
    fontWeight: '700'
  },
  shellMenuFooter: {
    borderTopWidth: 1,
    borderTopColor: '#d7dee7',
    paddingTop: 14,
    gap: 10
  },
  shellMenuModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  shellMenuModeValue: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4
  },
  shellMenuModeDetail: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 17,
    flexShrink: 1,
    textAlign: 'right'
  },
  exercisePresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  exercisePresetCard: {
    flexGrow: 1,
    flexBasis: 136,
    backgroundColor: '#f7f4ef',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 12,
    gap: 6,
    alignItems: 'center'
  },
  exercisePresetCardActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  exercisePresetImage: {
    width: '100%',
    height: 112
  },
  exercisePresetLabel: {
    color: '#132536',
    fontSize: 14,
    fontWeight: '800'
  },
  exercisePresetMeta: {
    color: '#66778c',
    fontSize: 12,
    textAlign: 'center'
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
    gap: 0
  },
  homeSection: {
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe3ec'
  },
  dailyHomeSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  homeDateNavigator: {
    flexDirection: 'row',
    gap: 8
  },
  homeDateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ced7e3',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeDateButtonDisabled: {
    opacity: 0.45
  },
  homeDateButtonLabel: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800'
  },
  dailyHomeGoalBadge: {
    backgroundColor: '#edf8f1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#c7e5d2',
    maxWidth: 180
  },
  dailyHomeGoalBadgeLabel: {
    color: '#1d5f3a',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  dailyHomeSummaryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12
  },
  dailyHomeSummaryLabel: {
    color: '#66778c',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  dailyHomeSummaryValue: {
    color: '#132536',
    fontSize: 24,
    fontWeight: '800'
  },
  dailyHomeMacroLine: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 18
  },
  dailyHomeMacroRingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center'
  },
  dailyHomeMacroLegend: {
    color: '#66778c',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center'
  },
  dailyHomeMealPlanHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  dailyHomeEditButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  dailyHomeEditButtonLabel: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800'
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
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe7ef',
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
    color: '#132536',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20
  },
  mealPlanSlotSubtitle: {
    color: '#7890ad',
    fontSize: 13,
    lineHeight: 18
  },
  mealPlanSlotTotal: {
    color: '#17324d',
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
    color: '#17324d',
    fontSize: 15,
    fontWeight: '700'
  },
  mealPlanItemQuantityInline: {
    color: '#7c8aa5',
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
    color: '#73859d',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right'
  },
  mealPlanItemCalories: {
    color: '#17324d',
    fontSize: 13,
    fontWeight: '700'
  },
  macroSplitRingCard: {
    minWidth: 98,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    paddingHorizontal: 12,
    paddingVertical: 14
  },
  macroSplitRingWrap: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center'
  },
  macroSplitRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  macroSplitRingPercent: {
    color: '#132536',
    fontSize: 12,
    fontWeight: '800'
  },
  macroSplitRingPercentNear: {
    color: '#15803d'
  },
  macroSplitRingPercentOver: {
    color: '#b91c1c'
  },
  macroSplitRingLabel: {
    color: '#66778c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  macroSplitRingValue: {
    color: '#132536',
    fontSize: 14,
    fontWeight: '800'
  },
  macroSplitRingValueNear: {
    color: '#15803d'
  },
  macroSplitRingValueOver: {
    color: '#b91c1c'
  },
  dailyHomeEmptyState: {
    color: '#66778c',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
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
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1
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
  inlinePillRow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cdd8e5',
    backgroundColor: '#f6f9fc',
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  inlinePillText: {
    color: '#4c627a',
    fontSize: 12,
    fontWeight: '700'
  },
  inlinePillButtonComplete: {
    borderColor: '#15803d',
    backgroundColor: '#edf8f1'
  },
  inlinePillButtonLabelComplete: {
    color: '#15803d'
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
  profileFieldInputError: {
    borderColor: '#2563eb'
  },
  profileFieldError: {
    color: '#1d4ed8',
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
  dashboardFooterStatus: {
    color: '#8a98aa',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center'
  },
  footer: {
    color: '#66778c',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 16
  }
});
