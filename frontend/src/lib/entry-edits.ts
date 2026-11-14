import type { FoodLogEntry } from '../types';
import type { FoodLogEntryUpdatePayload } from './api';

// Stored values keep three decimals so repeated edits do not drift; screens round for display.
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * New nutrition for a logged entry when its amount changes from `entry.grams` to `grams`.
 * Scales calories and macros proportionally (they were computed per gram when logged).
 * Returns null when the new amount (after rounding) is not positive or the entry has no gram basis.
 */
export function scaleEntryToGrams(entry: FoodLogEntry, grams: number): FoodLogEntryUpdatePayload | null {
  const roundedGrams = Number.isFinite(grams) ? round3(grams) : 0;
  if (roundedGrams <= 0 || !(entry.grams > 0)) {
    return null;
  }
  const factor = roundedGrams / entry.grams;
  const servings = entry.servings && entry.servings > 0 ? entry.servings : 1;
  return {
    grams: roundedGrams,
    servings: Math.max(round3(servings * factor), 0.001),
    calories: round3(entry.calories * factor),
    protein: round3(entry.macros.protein * factor),
    carbs: round3(entry.macros.carbs * factor),
    fat: round3(entry.macros.fat * factor)
  };
}

/** Parses a whole number > 0 from a text field (checked after rounding), or null. */
export function parsePositiveInt(value: string): number | null {
  const parsed = parseWholeNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

/** Parses a whole number >= 0 from a text field (for calories, which may be 0), or null. */
export function parseNonNegativeInt(value: string): number | null {
  const parsed = parseWholeNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function parseWholeNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
