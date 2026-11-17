import type { TFunction } from '../i18n/translate';
import { tc } from '../theme/palette';
import type { FoodLogSummary, MealInput, PlannedExerciseEntry } from '../types';
import { localDateKey } from './dates';
import { MEAL_STYLES, type MealStyleId } from './meal-split';

/** The breakfast / lunch / dinner split for a meal balance style. */
export function mealStyleSplit(style: MealStyleId): number[] {
  return (MEAL_STYLES.find((option) => option.id === style) ?? MEAL_STYLES[0]).splits[3];
}

export function toneColor(tone: 'checking' | 'live'): string {
  if (tone === 'live') {
    return tc.line_0f766e;
  }
  return tc.line_1d4ed8;
}

/** The first word of a name, for greetings ("Brian Miner" → "Brian"). */
export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

export function splitHeightCm(heightCm: number | null | undefined): { feet: string; inches: string } {
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

export function createEmptyMealDraft(): MealInput {
  return {
    id: 'meal-draft',
    name: 'Untitled meal',
    serving_count: 1,
    ingredients: []
  };
}

/** "Today · Tue, Nov 17", or the date; in `t`'s language when given one (else the device's). */
export function formatHomeDateLabel(value: string, todayKey: string, t?: TFunction): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const base = date.toLocaleDateString(t ? t.locale : [], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  if (value === todayKey) {
    return t ? t('day.today', { date: base }) : `Today · ${base}`;
  }
  return base;
}

export function formatCompletionTimeLabel(value: string, t?: TFunction): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(t ? t.locale : [], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function deriveExerciseIntensity(
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

export function sortPlannedExerciseEntries(entries: PlannedExerciseEntry[]): PlannedExerciseEntry[] {
  return [...entries].sort((left, right) =>
    `${left.planned_on}T${left.planned_at}`.localeCompare(`${right.planned_on}T${right.planned_at}`)
  );
}

export function createEmptyFoodLog(date = localDateKey()): FoodLogSummary {
  return {
    date,
    entries: [],
    totals: {
      calories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 }
    }
  };
}
