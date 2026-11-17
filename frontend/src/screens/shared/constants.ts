import type { ImageSourcePropType } from 'react-native';

import { ACTIVITY_LEVELS } from '../../lib/activity-level';
import type { AllergyChoice } from '../../lib/allergies';
import { tc } from '../../theme/palette';

export const scaleStops = [0.5, 1, 1.25, 1.5, 2] as const;
export type ScaleStop = (typeof scaleStops)[number];
export const mascotDefaultImage = require('../../../assets/mascot.png');
export const mascotAvatarImage = require('../../../assets/mascot-avatar.png');
export const mascotWeightsImage = require('../../../assets/weights.png');
export const mascotBikeImage = require('../../../assets/bike.png');
export const mascotRunImage = require('../../../assets/run.png');
export const mascotSwimImage = require('../../../assets/swim.png');
export const RELISH_COLORS = {
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
export const exercisePresets: Array<{
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
export type DietaryPattern = 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'carnivore';
export type NutritionStyle = 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'mediterranean' | 'paleo';
// 'welcome' is the intro card before the numbered steps; it is not in onboardingSteps.
export type OnboardingStep = 'welcome' | 'basics' | 'goal' | 'pace' | 'activity' | 'diet' | 'style' | 'balance' | 'allergies' | 'review';

// Activity comes before the goal so the goal screens can show real calorie numbers.
export const onboardingSteps: Array<{ id: OnboardingStep; label: string }> = [
  { id: 'basics', label: 'About you' },
  { id: 'activity', label: 'Activity' },
  { id: 'goal', label: 'Your goal' },
  { id: 'pace', label: 'Pace or focus' },
  { id: 'diet', label: 'Diet' },
  { id: 'style', label: 'Nutrition style' },
  { id: 'balance', label: 'Meal balance' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'review', label: 'Review' }
];

export const dietaryPatternOptions: Array<{
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

export const nutritionStyleOptions: Array<{
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

export const allergyOptions: Array<{
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
export const activityLevelCards = ACTIVITY_LEVELS.map((level) => ({
  id: level.id,
  title: level.title,
  subtitle: `${level.description} · ${level.steps}`
}));

export function selectExercisePreset(title: string): (typeof exercisePresets)[number] {
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

export function estimatePlannedExerciseCalories(
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

// Expo replaces process.env.NODE_ENV at build time; production web builds hide developer hints.
export const IS_DEVELOPMENT_BUILD = process.env.NODE_ENV !== 'production';
