/**
 * Create a Meal Plan, the app side: which dates get meals, how many proposal steps there are
 * for each variety, which meal each date gets, and the shopping list.
 */
import { addDaysToDateKey, parseDateKey } from './dates';

export type PlanMeal = 'breakfast' | 'lunch' | 'dinner';
export type PlanVariety = 'same' | 'rotate' | 'daily';
export type CookingTime = 'very_little' | 'some' | 'enjoy';
/** A number of days in a row, or particular days of the week (0 = Sunday … 6 = Saturday). */
export type DayChoice = { kind: 'count'; count: number } | { kind: 'weekdays'; weekdays: number[] };

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The plan's dates from the start date: N days in a row, or the chosen weekdays in the next week. */
export function planDates(choice: DayChoice, start: string): string[] {
  if (choice.kind === 'count') {
    return Array.from({ length: Math.max(1, choice.count) }, (_, index) => addDaysToDateKey(start, index));
  }
  const wanted = new Set(choice.weekdays);
  const dates: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDaysToDateKey(start, offset);
    if (wanted.has((parseDateKey(day) ?? new Date()).getDay())) {
      dates.push(day);
    }
  }
  return dates;
}

export function dayCount(choice: DayChoice): number {
  return choice.kind === 'count' ? choice.count : choice.weekdays.length;
}

/** How many different meals of each type the plan has: 1 (same), 2–3 (rotate), or one a day. */
export function stepCount(variety: PlanVariety, days: number): number {
  if (variety === 'same') {
    return 1;
  }
  if (variety === 'rotate') {
    return Math.min(days, days <= 4 ? 2 : 3);
  }
  return days;
}

/** Which step's meal a date gets (0-based): the same one, the rotation, or its own. */
export function stepForDay(variety: PlanVariety, dayIndex: number, steps: number): number {
  if (variety === 'same') {
    return 0;
  }
  return dayIndex % Math.max(1, steps);
}

export function stepNote(variety: PlanVariety, step: number, steps: number): string {
  if (variety === 'same') {
    return 'one meal repeated every day';
  }
  return variety === 'rotate' ? `meal ${step + 1} of ${steps} in a rotation` : `day ${step + 1} of ${steps}`;
}

export interface ShoppingItem {
  name: string;
  grams: number;
  role: string;
}

const ROLE_ORDER = ['protein', 'carb', 'veg', 'fruit', 'fat', 'other'];
export const ROLE_LABELS: Record<string, string> = {
  protein: 'Protein',
  carb: 'Carbs and grains',
  veg: 'Vegetables',
  fruit: 'Fruit',
  fat: 'Fats and oils',
  other: 'Other'
};

/** Every ingredient in the plan, totalled (grams × how many times the meal appears). */
export function shoppingList(
  meals: Array<{ times: number; items: Array<{ name: string; grams: number; role: string }> }>
): Array<{ role: string; label: string; items: ShoppingItem[] }> {
  const totals = new Map<string, ShoppingItem>();
  for (const meal of meals) {
    for (const item of meal.items) {
      const key = item.name.trim().toLowerCase();
      const current = totals.get(key) ?? { name: item.name.trim(), grams: 0, role: item.role || 'other' };
      current.grams += item.grams * meal.times;
      totals.set(key, current);
    }
  }
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of totals.values()) {
    const role = ROLE_ORDER.includes(item.role) ? item.role : 'other';
    groups.set(role, [...(groups.get(role) ?? []), { ...item, grams: Math.round(item.grams / 5) * 5 }]);
  }
  return ROLE_ORDER.filter((role) => groups.has(role)).map((role) => ({
    role,
    label: ROLE_LABELS[role],
    items: (groups.get(role) ?? []).sort((a, b) => a.name.localeCompare(b.name))
  }));
}

/** "1.2 kg" over 1,000 g, else "350 g". */
export function formatGrams(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg` : `${Math.round(grams)} g`;
}
