import { describe, expect, it } from 'vitest';
import {
  demoExerciseEntries,
  demoIngestionOutputs,
  demoFoodLog,
  demoMeal,
  demoMealPlanDays,
  demoMealPrepTasks,
  demoRangeSeries,
  demoRecipe,
  demoRecipeFavorites,
  demoRecipeCatalog,
  demoRecipeImports
} from './mock-data';

describe('frontend demo data', () => {
  it('keeps the seed meal aligned to two servings', () => {
    expect(demoMeal.serving_count).toBe(2);
    expect(demoMeal.ingredients).toHaveLength(3);
  });

  it('exposes recipe import sources and dashboard ranges', () => {
    expect(demoRecipeImports.sources).toHaveLength(3);
    expect(demoRangeSeries).toHaveLength(4);
    expect(demoRangeSeries[0].range).toBe('1D');
  });

  it('seeds a persisted daily log for the new log screen', () => {
    expect(demoFoodLog.entries).toHaveLength(3);
    expect(demoFoodLog.totals.calories).toBeGreaterThan(0);
  });

  it('seeds tracker and planning data for the new shell sections', () => {
    expect(demoExerciseEntries).toHaveLength(2);
    expect(demoMealPlanDays).toHaveLength(3);
    expect(demoMealPrepTasks).toHaveLength(4);
  });

  it('seeds recipe favorites for the new recipes screen', () => {
    expect(demoRecipeFavorites).toHaveLength(2);
    expect(demoRecipeCatalog).toHaveLength(3);
    expect(demoRecipeCatalog.some((recipe) => !recipe.favorite)).toBe(true);
    expect(demoRecipe.favorite).toBe(true);
    expect(demoRecipe.steps).toHaveLength(3);
  });

  it('seeds pending ingestion outputs for the review flow', () => {
    expect(demoIngestionOutputs.filter((output) => output.review_state === 'pending')).toHaveLength(2);
    expect(demoIngestionOutputs.some((output) => output.review_state === 'accepted')).toBe(true);
  });
});
