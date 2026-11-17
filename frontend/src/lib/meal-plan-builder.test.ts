import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import { formatGrams, planDates, shoppingAmount, shoppingList, stepCount, stepForDay, stepNote, weekdayLabel } from './meal-plan-builder';

describe('meal plan builder', () => {
  it('picks the dates', () => {
    expect(planDates({ kind: 'count', count: 3 }, '2026-11-16')).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    // Mon, Wed, Fri from Sunday Nov 15.
    expect(planDates({ kind: 'weekdays', weekdays: [1, 3, 5] }, '2026-11-15')).toEqual(['2026-11-16', '2026-11-18', '2026-11-20']);
  });

  it('counts steps per variety and assigns meals to days', () => {
    expect(stepCount('same', 7)).toBe(1);
    expect(stepCount('rotate', 7)).toBe(3);
    expect(stepCount('rotate', 3)).toBe(2);
    expect(stepCount('rotate', 1)).toBe(1);
    expect(stepCount('daily', 5)).toBe(5);
    expect([0, 1, 2, 3, 4, 5, 6].map((day) => stepForDay('rotate', day, 3))).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(stepForDay('same', 4, 1)).toBe(0);
    expect(stepNote('daily', 1, 5)).toBe('day 2 of 5');
  });

  it('totals the shopping list by group', () => {
    const list = shoppingList([
      { times: 3, items: [{ name: 'Chicken thigh', grams: 150, role: 'protein' }, { name: 'Rice', grams: 180, role: 'carb' }] },
      { times: 2, items: [{ name: 'chicken thigh', grams: 120, role: 'protein' }, { name: 'Broccoli', grams: 80, role: 'veg' }] }
    ]);
    expect(list.map((group) => [group.label, group.items.map((item) => [item.name, item.grams])])).toEqual([
      ['Protein', [['Chicken thigh', 690]]],
      ['Carbs and grains', [['Rice', 540]]],
      ['Vegetables', [['Broccoli', 160]]]
    ]);
    expect(formatGrams(1200)).toBe('1.2 kg');
    expect(formatGrams(2000)).toBe('2 kg');
    expect(formatGrams(350)).toBe('350 g');
  });
});

describe('shopping list counts', () => {
  it('adds up counted foods across days and keeps them apart from weighed ones', () => {
    const egg = { name: 'Eggs', grams: 100, role: 'protein', count: 2, unit: 'large egg', unit_plural: 'large eggs' };
    const list = shoppingList([
      { times: 5, items: [egg, { name: 'Oats', grams: 60, role: 'carb' }] },
      { times: 1, items: [{ ...egg, grams: 150, count: 3 }, { name: 'Eggs', grams: 40, role: 'protein' }] },
      { times: 2, items: [{ name: 'Sweet potato', grams: 75, role: 'carb', count: 0.5, unit: 'medium sweet potato', unit_plural: 'medium sweet potatoes' }] }
    ]);
    const protein = list.find((group) => group.role === 'protein')!.items;
    expect(protein.map((item) => shoppingAmount(item))).toEqual(['13 large eggs (650 g)', '40 g']);
    const carbs = list.find((group) => group.role === 'carb')!.items;
    expect(carbs.map((item) => `${item.name}: ${shoppingAmount(item)}`)).toEqual(['Oats: 300 g', 'Sweet potato: 1 medium sweet potato (150 g)']);
  });

  it('rounds half items up to whole ones to buy', () => {
    expect(shoppingAmount({ name: 'Avocado', grams: 225, role: 'fat', count: 1.5, unit: 'avocado', unit_plural: 'avocados' })).toBe('2 avocados (225 g)');
  });
});

describe('meal plan builder in Spanish', () => {
  const es = translatorFor('es');

  it('labels groups and formats amounts in the display language', () => {
    const list = shoppingList([{ times: 1, items: [{ name: 'Rice', grams: 100, role: 'carb' }] }], es);
    expect(list[0].label).toBe('Harinas y granos');
    expect(formatGrams(1200, 'es-CO')).toBe('1,2 kg');
    expect(shoppingAmount({ name: 'Eggs', grams: 1250, role: 'protein', count: 3, unit: 'egg', unit_plural: 'eggs' }, es)).toBe('3 eggs (1,3 kg)');
    // Gus's step note is part of the request, so it stays English.
    expect(stepNote('rotate', 0, 2)).toBe('meal 1 of 2 in a rotation');
  });

  it('names weekdays in the display language', () => {
    expect(weekdayLabel(0, translatorFor('en'))).toBe('Sun');
    expect(weekdayLabel(6, translatorFor('en'))).toBe('Sat');
    expect(weekdayLabel(3, es)).toBe('mié');
  });
});
