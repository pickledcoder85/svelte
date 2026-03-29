import { describe, expect, it } from 'vitest';
import { demoFoodResults } from '../mock-data';
import {
  calculateFoodGrams,
  clampFoodQuantity,
  filterFoodsFuzzy,
  foodMacroLine,
  formatFoodQuantity,
  formatFoodReference,
  mergeFoodsById,
  selectFoodById,
  sortFoodsAlphabetically,
  sortFoodsForPicker
} from './foods';

describe('food helpers', () => {
  it('selects a matching food by id or falls back to the first result', () => {
    expect(selectFoodById(demoFoodResults, 'food-blueberries')?.name).toBe('Blueberries');
    expect(selectFoodById(demoFoodResults, 'missing-id')?.id).toBe('food-apples-granny-smith');
  });

  it('formats a macro line for the selected food detail', () => {
    const yogurt = demoFoodResults.find((food) => food.id === 'food-greek-yogurt');
    expect(yogurt).toBeDefined();
    expect(foodMacroLine(yogurt!)).toBe('10.3P / 3.6C / 0.4F');
  });

  it('formats food card reference weights and quantities', () => {
    const yogurt = demoFoodResults.find((food) => food.id === 'food-greek-yogurt');
    expect(yogurt).toBeDefined();
    expect(formatFoodReference(yogurt!)).toBe('100 g');
    expect(formatFoodQuantity(1)).toBe('1.0×');
    expect(formatFoodQuantity(1.26)).toBe('1.3×');
  });

  it('clamps food quantities before converting to grams', () => {
    const yogurt = demoFoodResults.find((food) => food.id === 'food-greek-yogurt');
    expect(yogurt).toBeDefined();
    expect(clampFoodQuantity(0)).toBe(1);
    expect(clampFoodQuantity(0.4)).toBe(0.5);
    expect(calculateFoodGrams(yogurt!, 1.5)).toBe(150);
  });

  it('sorts foods alphabetically for the default list', () => {
    const sorted = sortFoodsAlphabetically(demoFoodResults);
    expect(sorted[0]?.name).toBe('Apples, Granny Smith');
    expect(sorted[1]?.name).toBe('Avocado');
    expect(sorted[2]?.name).toBe('Bananas');
  });

  it('narrows foods with fuzzy matching as the query changes', () => {
    expect(filterFoodsFuzzy(demoFoodResults, 'blu')[0]?.name).toBe('Blueberries');
    expect(filterFoodsFuzzy(demoFoodResults, 'gyrt')[0]?.name).toBe('Greek yogurt, plain nonfat');
    expect(filterFoodsFuzzy(demoFoodResults, 'oat')[0]?.name).toBe('Rolled oats');
  });

  it('keeps favorite foods first in picker ordering', () => {
    const sorted = sortFoodsForPicker([
      { ...demoFoodResults[0], favorite: false },
      { ...demoFoodResults[1], favorite: true },
      { ...demoFoodResults[2], favorite: false }
    ]);
    expect(sorted[0]?.favorite).toBe(true);
    expect(sorted[1]?.favorite).toBe(false);
    expect(sorted[2]?.favorite).toBe(false);
  });

  it('merges foods by id while preserving favorite status', () => {
    const merged = mergeFoodsById(
      [{ ...demoFoodResults[2], favorite: false }],
      [{ ...demoFoodResults[2], favorite: true }]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.favorite).toBe(true);
  });
});
