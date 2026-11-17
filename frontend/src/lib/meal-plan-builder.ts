/**
 * Create a Meal Plan, the app side: which dates get meals, how many proposal steps there are
 * for each variety, which meal each date gets, and the shopping list.
 */
import { en } from '../i18n/en';
import { formatDate, formatNumber, type Locale, type TFunction, type TranslationKey } from '../i18n/translate';
import { addDaysToDateKey, parseDateKey } from './dates';

export type PlanMeal = 'breakfast' | 'lunch' | 'dinner';
export type PlanVariety = 'same' | 'rotate' | 'daily';
export type CookingTime = 'very_little' | 'some' | 'enjoy';
/** A number of days in a row, or particular days of the week (0 = Sunday … 6 = Saturday). */
export type DayChoice = { kind: 'count'; count: number } | { kind: 'weekdays'; weekdays: number[] };

/** A weekday's short name (0 = Sunday): "Sun", "dom". */
export function weekdayLabel(weekday: number, t: TFunction): string {
  // 2026-11-15 is a Sunday.
  return formatDate(new Date(2026, 10, 15 + weekday), { weekday: 'short' }, t.locale);
}

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

/** A note for Gus about which step this is; it is part of the request, so it stays English. */
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
  /** Counted foods: how many in all, and of what ("large egg" / "large eggs"). */
  count?: number | null;
  unit?: string | null;
  unit_plural?: string | null;
}

const ROLE_ORDER = ['protein', 'carb', 'veg', 'fruit', 'fat', 'other'];
/** English group names; shoppingList() labels them in `t`'s language when given one. */
export const ROLE_LABELS: Record<string, string> = { ...en.shopping.roles };

/** Every ingredient in the plan, totalled (grams × how many times the meal appears). Counted
 * foods add up their counts too ("12 large eggs"), kept apart from the same food by weight. */
export function shoppingList(
  meals: Array<{ times: number; items: ShoppingItem[] }>,
  t?: TFunction
): Array<{ role: string; label: string; items: ShoppingItem[] }> {
  const totals = new Map<string, ShoppingItem>();
  for (const meal of meals) {
    for (const item of meal.items) {
      const counted = Boolean(item.count && item.unit);
      const key = `${item.name.trim().toLowerCase()}|${counted ? item.unit!.trim().toLowerCase() : ''}`;
      const current: ShoppingItem = totals.get(key) ?? {
        name: item.name.trim(),
        grams: 0,
        role: item.role || 'other',
        ...(counted ? { count: 0, unit: item.unit, unit_plural: item.unit_plural } : {})
      };
      current.grams += item.grams * meal.times;
      if (counted) {
        current.count = (current.count ?? 0) + item.count! * meal.times;
      }
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
    label: t ? t(`shopping.roles.${role}` as TranslationKey) : ROLE_LABELS[role],
    items: (groups.get(role) ?? []).sort((a, b) => a.name.localeCompare(b.name))
  }));
}

/** "12 large eggs (600 g)", or the weight for weighed foods. Counts round up to whole items. */
export function shoppingAmount(item: ShoppingItem, t?: TFunction): string {
  const locale = t?.locale ?? 'en-US';
  if (item.count && item.unit) {
    const count = Math.ceil(item.count - 1e-9);
    return `${count} ${count === 1 ? item.unit : item.unit_plural || item.unit} (${formatGrams(item.grams, locale)})`;
  }
  return formatGrams(item.grams, locale);
}

/** "1.2 kg" over 1,000 g, else "350 g" ("1,2 kg" in Spanish). */
export function formatGrams(grams: number, locale: Locale = 'en-US'): string {
  if (grams >= 1000) {
    const digits = grams % 1000 === 0 ? 0 : 1;
    return `${formatNumber(grams / 1000, { minimumFractionDigits: digits, maximumFractionDigits: digits }, locale)} kg`;
  }
  return `${formatNumber(Math.round(grams), { useGrouping: false }, locale)} g`;
}
