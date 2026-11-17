import { describe, expect, it } from 'vitest';

import type { ShoppingItem, ShoppingList } from '../types';
import { translatorFor } from '../i18n/dictionaries';
import { itemsByGroup, planListTitle, progressLabel, remainingCount, shareText } from './shopping';

const en = translatorFor('en');
const es = translatorFor('es');

const item = (id: string, name: string, role: string, position: number, checked = false, amount = ''): ShoppingItem => ({
  id, name, role, position, checked, amount
});
const list: ShoppingList = {
  id: 'l', title: 'Meal plan · Nov 18–20', created_at: '', updated_at: '',
  items: [
    item('1', 'Eggs', 'protein', 0, true, '12 large eggs (600 g)'),
    item('2', 'Chicken thigh', 'protein', 1, false, '450 g'),
    item('3', 'Oats', 'carb', 2),
    item('4', 'Coffee', 'other', 3)
  ]
};

describe('shopping lists', () => {
  it('groups by aisle with ticked items last', () => {
    const groups = itemsByGroup(list.items, en);
    expect(groups.map((group) => group.label)).toEqual(['Protein', 'Carbs and grains', 'Other']);
    expect(groups[0].items.map((entry) => entry.name)).toEqual(['Chicken thigh', 'Eggs']);
  });

  it('counts what is left', () => {
    expect(remainingCount(list)).toBe(3);
    expect(progressLabel(3, 4, en)).toBe('3 of 4 left');
    expect(progressLabel(0, 4, en)).toBe('All done');
    expect(progressLabel(0, 0, en)).toBe('Empty');
    expect(progressLabel(3, 4, es)).toBe('Faltan 3 de 4');
    expect(progressLabel(0, 4, es)).toBe('Todo listo');
  });

  it('shares only what is still to buy', () => {
    const text = shareText(list, en);
    expect(text).toContain('- Chicken thigh: 450 g');
    expect(text).not.toContain('Eggs');
    expect(shareText({ ...list, items: list.items.map((entry) => ({ ...entry, checked: true })) }, en)).toContain('All done.');
    expect(shareText(list, es)).toContain('Harinas y granos\n- Oats');
  });

  it('titles a list after the plan dates', () => {
    expect(planListTitle(['2026-11-20', '2026-11-18', '2026-11-19'])).toBe('Meal plan · Nov 18–20');
    expect(planListTitle(['2026-11-30', '2026-12-02'])).toBe('Meal plan · Nov 30–Dec 2');
    expect(planListTitle(['2026-11-18'])).toBe('Meal plan · Nov 18');
    expect(planListTitle([])).toBe('Shopping list');
  });
});
