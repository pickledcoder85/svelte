import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import {
  ACTIVITY_LEVELS,
  activityIndex,
  activityLevelText,
  activityBars,
  indexForPosition,
  maintenanceForLevel,
  positionForIndex,
  sliderPosition
} from './activity-level';

describe('activity level', () => {
  it('lists the five levels in order', () => {
    expect(ACTIVITY_LEVELS.map((level) => level.id)).toEqual([
      'sedentary',
      'light',
      'moderate',
      'very_active',
      'extra_active'
    ]);
    expect(activityIndex('very_active')).toBe(3);
  });

  it('spreads the levels from the full left to the full right of the slider', () => {
    expect(positionForIndex(0)).toBe(0);
    expect(positionForIndex(1)).toBe(0.25);
    expect(positionForIndex(2)).toBe(0.5);
    expect(positionForIndex(4)).toBe(1);
    expect(positionForIndex(9)).toBe(1);
  });

  it('snaps a position to the nearest level', () => {
    expect(indexForPosition(0)).toBe(0);
    expect(indexForPosition(0.12)).toBe(0);
    expect(indexForPosition(0.13)).toBe(1);
    expect(indexForPosition(0.5)).toBe(2);
    expect(indexForPosition(0.9)).toBe(4);
    expect(indexForPosition(1)).toBe(4);
    for (let index = 0; index < 5; index += 1) {
      expect(indexForPosition(positionForIndex(index))).toBe(index);
    }
  });

  it('maps a touch on the slider to a position, keeping room for the handle at each end', () => {
    expect(sliderPosition(20, 300, 20)).toBe(0);
    expect(sliderPosition(0, 300, 20)).toBe(0);
    expect(sliderPosition(150, 300, 20)).toBe(0.5);
    expect(sliderPosition(280, 300, 20)).toBe(1);
    expect(sliderPosition(400, 300, 20)).toBe(1);
    expect(sliderPosition(10, 30, 20)).toBe(0);
    expect(indexForPosition(sliderPosition(85, 300, 20))).toBe(1);
  });

  it('scales the bars to the most active level so the activity bar grows', () => {
    const byLevel = { sedentary: 2264, light: 2453, moderate: 2736, very_active: 3019, extra_active: 3302 };
    expect(activityBars(1887, 2264, byLevel)).toEqual({ rest: 57, active: 69, fromActivity: 377 });
    expect(activityBars(1887, 2736, byLevel)).toEqual({ rest: 57, active: 83, fromActivity: 849 });
    expect(activityBars(1887, 3302, byLevel)).toEqual({ rest: 57, active: 100, fromActivity: 1415 });
    // Without the per-level numbers the chosen level is the scale.
    expect(activityBars(1887, 2736, undefined)).toEqual({ rest: 69, active: 100, fromActivity: 849 });
    expect(activityBars(0, 0, undefined)).toEqual({ rest: 0, active: 0, fromActivity: 0 });
  });

  it('reads maintenance for a level from the preview', () => {
    const preview = {
      maintenance_calories: 2736,
      maintenance_by_activity: { sedentary: 2264, moderate: 2736, extra_active: 3302 }
    };
    expect(maintenanceForLevel(preview, 'sedentary')).toBe(2264);
    expect(maintenanceForLevel(preview, 'light')).toBe(2736);
    expect(maintenanceForLevel({ maintenance_calories: 2000 }, 'extra_active')).toBe(2000);
    expect(maintenanceForLevel(null, 'moderate')).toBeNull();
  });

  it('names each level in English and Spanish', () => {
    expect(ACTIVITY_LEVELS[0]).toEqual({ id: 'sedentary', title: 'Sedentary', description: 'Mostly sitting', steps: '< 5,000 steps' });
    expect(activityLevelText('very_active', translatorFor('en')).title).toBe('Very active');
    expect(activityLevelText('light', translatorFor('es'))).toEqual({
      title: 'Ligero',
      description: 'Camina un poco',
      steps: '5.000–7.500 pasos'
    });
  });
});
