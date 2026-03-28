import { describe, expect, it } from 'vitest';
import { demoFoodResults } from '../mock-data';
import { foodMacroLine, selectFoodById } from './foods';

describe('food helpers', () => {
  it('selects a matching food by id or falls back to the first result', () => {
    expect(selectFoodById(demoFoodResults, 'food-blueberries')?.name).toBe('Blueberries');
    expect(selectFoodById(demoFoodResults, 'missing-id')?.id).toBe('food-greek-yogurt');
  });

  it('formats a macro line for the selected food detail', () => {
    expect(foodMacroLine(demoFoodResults[0])).toBe('10.3P / 3.6C / 0.4F');
  });
});
