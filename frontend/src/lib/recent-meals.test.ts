import { describe, expect, it } from 'vitest';

import type { FoodLogEntry, FoodLogSummary } from '../types';
import { filterMeals, mealTitle, recentMeals } from './recent-meals';

const entry = (id: string, name: string, slot: FoodLogEntry['meal_slot'], grams: number, calories: number, extra: Partial<FoodLogEntry> = {}): FoodLogEntry => ({
  id, food_id: `food-${name}`, food_item_id: `food-${name}`, entry_type: 'food', food_name: name, brand: null, source: 'USDA',
  grams, servings: 1, calories, macros: { protein: 10, carbs: 10, fat: 5 }, logged_at: '', meal_slot: slot, ...extra
});
const log = (date: string, entries: FoodLogEntry[]): FoodLogSummary => ({
  log_id: date, date, entries, totals: { calories: 0, macros: { protein: 0, carbs: 0, fat: 0 } }
});

describe('recent meals', () => {
  const logs = [
    log('2026-11-17', [entry('a', 'Chicken thigh', 'lunch', 150, 270), entry('b', 'Rice', 'lunch', 180, 230), entry('c', 'Oats', 'breakfast', 60, 230)]),
    log('2026-11-18', [entry('d', 'Chicken thigh', 'lunch', 152, 274), entry('e', 'Rice', 'lunch', 178, 228)]),
    log('2026-11-19', [
      entry('f', 'Coffee', 'breakfast', 240, 5),
      entry('g', 'Quick calories', 'snack', 0, 150, { entry_type: 'meal', food_item_id: null, food_id: 'g' })
    ])
  ];

  it('lists each meal once, newest first, counting repeats', () => {
    const meals = recentMeals(logs);
    expect(meals.map((meal) => `${meal.date} ${meal.slot} ×${meal.times}`)).toEqual([
      '2026-11-19 breakfast ×1',
      '2026-11-19 snack ×1',
      '2026-11-18 lunch ×2',
      '2026-11-17 breakfast ×1'
    ]);
    expect(meals[2].calories).toBe(502);
  });

  it('logs quick calories again as quick calories', () => {
    const snack = recentMeals(logs).find((meal) => meal.slot === 'snack')!;
    expect(snack.items[0].foodId).toBeNull();
    expect(snack.items[0].calories).toBe(150);
  });

  it('can leave out the meal being copied', () => {
    const meals = recentMeals(logs, { exclude: { date: '2026-11-19', slot: 'breakfast' } });
    expect(meals.map((meal) => `${meal.date} ${meal.slot}`)).not.toContain('2026-11-19 breakfast');
    expect(meals.map((meal) => `${meal.date} ${meal.slot}`)).toContain('2026-11-17 breakfast');
  });

  it('searches by food', () => {
    expect(filterMeals(recentMeals(logs), 'rice').map((meal) => meal.slot)).toEqual(['lunch']);
    expect(filterMeals(recentMeals(logs), '').length).toBe(4);
  });

  it('titles a copied meal', () => {
    expect(mealTitle({ items: [{ name: 'Chicken thigh' }, { name: 'Rice' }, { name: 'Broccoli' }] as never })).toBe('Chicken thigh, Rice +1');
  });
});
