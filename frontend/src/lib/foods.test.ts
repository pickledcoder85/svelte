import { describe, expect, it } from 'vitest';
import { demoFoodResults } from '../mock-data';
import { filterFoodsFuzzy, foodMacroLine, selectFoodById, sortFoodsAlphabetically } from './foods';

describe('food helpers', () => {
  it('selects a matching food by id or falls back to the first result', () => {
    expect(selectFoodById(demoFoodResults, 'food-blueberries')?.name).toBe('Blueberries');
    expect(selectFoodById(demoFoodResults, 'missing-id')?.id).toBe('food-greek-yogurt');
  });

  it('formats a macro line for the selected food detail', () => {
    expect(foodMacroLine(demoFoodResults[0])).toBe('10.3P / 3.6C / 0.4F');
  });

  it('sorts foods alphabetically for the default list', () => {
    const sorted = sortFoodsAlphabetically(demoFoodResults);
    expect(sorted.map((food) => food.name)).toEqual([
      'Blueberries',
      'Greek yogurt, plain nonfat',
      'Rolled oats'
    ]);
  });

  it('narrows foods with fuzzy matching as the query changes', () => {
    expect(filterFoodsFuzzy(demoFoodResults, 'blu')[0]?.name).toBe('Blueberries');
    expect(filterFoodsFuzzy(demoFoodResults, 'gyrt')[0]?.name).toBe('Greek yogurt, plain nonfat');
    expect(filterFoodsFuzzy(demoFoodResults, 'oat')[0]?.name).toBe('Rolled oats');
  });
});
