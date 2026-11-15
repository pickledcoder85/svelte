/** Breakfast, lunch, dinner, snack: which meal a logged food belongs to. */
import type { FoodLogEntry } from '../types';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack'
};

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
export function groupByMeal(entries: FoodLogEntry[]): MealGroup[] {
  const order: Array<MealSlot | 'other'> = [...MEAL_SLOTS, 'other'];
  return order
    .map((slot) => {
      const items = entries.filter((entry) => (entry.meal_slot ?? 'other') === slot);
      return {
        slot,
        label: slot === 'other' ? 'Other' : MEAL_SLOT_LABELS[slot],
        entries: items,
        calories: Math.round(items.reduce((sum, entry) => sum + entry.calories, 0))
      };
    })
    .filter((group) => group.entries.length > 0);
}

/** "Add to today's dinner", "Add to Tuesday's lunch". */
export function addButtonLabel(dayName: string, slot: MealSlot): string {
  const day = dayName === 'today' ? "today's" : `${dayName}'s`;
  return `Add to ${day} ${MEAL_SLOT_LABELS[slot].toLowerCase()}`;
}
