import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import type { FoodLogEntry } from '../types';
import { addButtonLabel, addToDayLabel, defaultMealSlot, groupByMeal } from './meal-slots';

const en = translatorFor('en');
const es = translatorFor('es');

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
    const entries = [entry('a', 100, 'dinner'), entry('b', 316), entry('c', 200, 'breakfast'), entry('d', 50, 'dinner')];
    const groups = groupByMeal(entries, en);
    expect(groups.map((g) => [g.label, g.calories, g.entries.length])).toEqual([
      ['Breakfast', 200, 1],
      ['Dinner', 150, 2],
      ['Other', 316, 1]
    ]);
    expect(groupByMeal(entries, es).map((g) => g.label)).toEqual(['Desayuno', 'Cena', 'Otro']);
    expect(groupByMeal([], en)).toEqual([]);
  });

  it('labels the add button', () => {
    expect(addButtonLabel('today', 'dinner', en)).toBe("Add to today's dinner");
    expect(addButtonLabel('Tuesday', 'lunch', en)).toBe("Add to Tuesday's lunch");
    expect(addButtonLabel('today', 'dinner', en, true)).toBe("Add all to today's dinner");
    expect(addButtonLabel('today', 'dinner', es)).toBe('Agregue a la cena de hoy');
    expect(addButtonLabel('martes', 'lunch', es)).toBe('Agregue al almuerzo del martes');
    expect(addButtonLabel('martes', 'snack', es, true)).toBe('Agregue todo a la merienda del martes');
    expect(addToDayLabel('today', en)).toBe('Add to today');
    expect(addToDayLabel('Tuesday', en)).toBe('Add to Tuesday');
    expect(addToDayLabel('martes', es)).toBe('Agregue al martes');
  });
});
