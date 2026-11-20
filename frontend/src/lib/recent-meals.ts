/**
 * Repeat a recent meal: the meals logged over the last weeks, one per day and meal (breakfast,
 * lunch, dinner, snack), the same meal eaten on several days shown once ("eaten 4 times"),
 * newest first, with what's needed to log it again or add it to a day's plan.
 */
import type { MealSlot } from './meal-slots';
import type { FoodLogEntry, FoodLogSummary } from '../types';

export interface RecentMealItem {
  name: string;
  /** Logged again by food and weight (or servings) when there is one, else as quick calories. */
  foodId: string | null;
  grams: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantityLabel: string | null;
}

export interface RecentMeal {
  key: string;
  slot: MealSlot;
  /** The most recent day it was eaten. */
  date: string;
  times: number;
  items: RecentMealItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function mealItem(entry: FoodLogEntry): RecentMealItem {
  const isFood = (entry.entry_type ?? 'food') === 'food' && Boolean(entry.food_item_id ?? entry.food_id);
  return {
    name: entry.food_name,
    foodId: isFood ? (entry.food_item_id ?? entry.food_id) : null,
    grams: entry.grams,
    servings: entry.servings ?? 1,
    calories: entry.calories,
    protein: entry.macros.protein,
    carbs: entry.macros.carbs,
    fat: entry.macros.fat,
    quantityLabel: entry.quantity_label ?? null
  };
}

/** The same foods in about the same amounts (to the nearest 10 g). */
function signature(slot: string, items: RecentMealItem[]): string {
  return `${slot}|${items
    .map((item) => `${item.foodId ?? item.name.toLowerCase()}:${Math.round((item.grams || item.calories) / 10)}`)
    .sort()
    .join(',')}`;
}

function totals(items: RecentMealItem[]) {
  return {
    calories: Math.round(items.reduce((sum, item) => sum + item.calories, 0)),
    protein: Math.round(items.reduce((sum, item) => sum + item.protein, 0)),
    carbs: Math.round(items.reduce((sum, item) => sum + item.carbs, 0)),
    fat: Math.round(items.reduce((sum, item) => sum + item.fat, 0))
  };
}

/** A logged meal (one meal's entries on one day) ready to repeat. */
export function mealFromEntries(slot: MealSlot, date: string, entries: FoodLogEntry[]): RecentMeal {
  const items = entries.map(mealItem);
  return { key: signature(slot, items), slot, date, times: 1, items, ...totals(items) };
}

/** Recent meals, newest first, each distinct meal once. */
export function recentMeals(logs: FoodLogSummary[], options: { exclude?: { date: string; slot: MealSlot } } = {}): RecentMeal[] {
  const byKey = new Map<string, RecentMeal>();
  for (const log of [...logs].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const slot of SLOTS) {
      if (options.exclude && options.exclude.date === log.date && options.exclude.slot === slot) {
        continue;
      }
      const entries = log.entries.filter((entry) => entry.meal_slot === slot);
      if (entries.length === 0) {
        continue;
      }
      const meal = mealFromEntries(slot, log.date, entries);
      const known = byKey.get(meal.key);
      if (known) {
        known.times += 1;
      } else {
        byKey.set(meal.key, meal);
      }
    }
  }
  return [...byKey.values()];
}

/** Meals with a food matching the search ("oats", "salm"). */
export function filterMeals(meals: RecentMeal[], query: string): RecentMeal[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return meals;
  }
  return meals.filter((meal) => {
    const text = meal.items.map((item) => item.name.toLowerCase()).join(' ');
    return words.every((word) => text.includes(word));
  });
}

/** "Chicken thigh, rice +1" for a plan's title. */
export function mealTitle(meal: Pick<RecentMeal, 'items'>, max = 2): string {
  const names = meal.items.map((item) => item.name);
  const shown = names.slice(0, max).join(', ');
  const title = names.length > max ? `${shown} +${names.length - max}` : shown;
  return title.slice(0, 80) || 'Meal';
}
