/** Breakfast, lunch, dinner, snack: which meal a logged food belongs to. */
import type { TFunction } from '../i18n/translate';
import type { FoodLogEntry } from '../types';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/** "Breakfast", "Desayuno": the display label only; the stored value stays the slot key. */
export function mealSlotLabel(slot: MealSlot | 'other', t: TFunction): string {
  return t(`meals.slots.${slot}`);
}

/** A planned meal's saved label ("Breakfast") in the display language; other labels as saved. */
export function plannedMealLabel(label: string, t: TFunction): string {
  const key = label.trim().toLowerCase();
  return key === 'breakfast' || key === 'lunch' || key === 'dinner' || key === 'snack' ? t(`meals.slots.${key}`) : label;
}

/** The meal for a time of day: before 10:30 breakfast, before 2:30 lunch, before 5 snack, then dinner. */
export function defaultMealSlot(now: Date = new Date()): MealSlot {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < 10 * 60 + 30) {
    return 'breakfast';
  }
  if (minutes < 14 * 60 + 30) {
    return 'lunch';
  }
  if (minutes < 17 * 60) {
    return 'snack';
  }
  return 'dinner';
}

export interface MealGroup {
  slot: MealSlot | 'other';
  label: string;
  entries: FoodLogEntry[];
  calories: number;
}

/** The day's food under its meals, in meal order; untagged food last, under "Other". */
export function groupByMeal(entries: FoodLogEntry[], t: TFunction): MealGroup[] {
  const order: Array<MealSlot | 'other'> = [...MEAL_SLOTS, 'other'];
  return order
    .map((slot) => {
      const items = entries.filter((entry) => (entry.meal_slot ?? 'other') === slot);
      return {
        slot,
        label: mealSlotLabel(slot, t),
        entries: items,
        calories: Math.round(items.reduce((sum, entry) => sum + entry.calories, 0))
      };
    })
    .filter((group) => group.entries.length > 0);
}

/**
 * "Add to today's dinner", "Add to Tuesday's lunch" (or, with `all`, "Add all to …"). `dayName`
 * is "today" or the day's name in the display language.
 */
export function addButtonLabel(dayName: string, slot: MealSlot, t: TFunction, all = false): string {
  if (dayName === 'today') {
    return t(all ? `meals.addAllToToday.${slot}` : `meals.addToToday.${slot}`);
  }
  return t(all ? `meals.addAllToDay.${slot}` : `meals.addToDay.${slot}`, { day: dayName });
}

/** "Add to today", "Add to Tuesday". */
export function addToDayLabel(dayName: string, t: TFunction): string {
  return dayName === 'today' ? t('day.addToToday') : t('day.addToDay', { day: dayName });
}

/** "✓ Added to today", "✓ Added to Tuesday". */
export function addedToDayLabel(dayName: string, t: TFunction): string {
  return dayName === 'today' ? t('day.addedToToday') : t('day.addedToDay', { day: dayName });
}
