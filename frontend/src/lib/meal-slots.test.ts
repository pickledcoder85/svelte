import { describe, expect, it } from 'vitest';

import type { FoodLogEntry } from '../types';
import { addButtonLabel, defaultMealSlot, groupByMeal } from './meal-slots';

const at = (h: number, m = 0) => new Date(2026, 10, 15, h, m);

function entry(id: string, calories: number, meal_slot?: FoodLogEntry['meal_slot']): FoodLogEntry {
  return {
    id, food_id: id, food_name: id, brand: null, source: 'CUSTOM', grams: 0, calories,
    macros: { protein: 0, carbs: 0, fat: 0 }, logged_at: '', meal_slot
  };
}

describe('meal slots', () => {
  it('picks the meal from the time of day', () => {
    expect(defaultMealSlot(at(7))).toBe('breakfast');
    expect(defaultMealSlot(at(10, 29))).toBe('breakfast');
    expect(defaultMealSlot(at(10, 30))).toBe('lunch');
    expect(defaultMealSlot(at(15))).toBe('snack');
    expect(defaultMealSlot(at(18))).toBe('dinner');
    expect(defaultMealSlot(at(0, 30))).toBe('breakfast');
  });

  it('groups in meal order with untagged food last', () => {
    const groups = groupByMeal([entry('a', 100, 'dinner'), entry('b', 316), entry('c', 200, 'breakfast'), entry('d', 50, 'dinner')]);
    expect(groups.map((g) => [g.label, g.calories, g.entries.length])).toEqual([
      ['Breakfast', 200, 1],
      ['Dinner', 150, 2],
      ['Other', 316, 1]
    ]);
    expect(groupByMeal([])).toEqual([]);
  });

  it('labels the add button', () => {
    expect(addButtonLabel('today', 'dinner')).toBe("Add to today's dinner");
    expect(addButtonLabel('Tuesday', 'lunch')).toBe("Add to Tuesday's lunch");
  });
});
