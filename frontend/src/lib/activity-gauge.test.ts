import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_LEVELS,
  activityIndex,
  arcPath,
  indexForPosition,
  maintenanceForLevel,
  pointOnArc,
  positionForIndex,
  sliderPosition
} from './activity-gauge';

describe('activity gauge', () => {
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

  it('spreads the levels from the full left to the full right of the arc', () => {
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

  it('maps positions to points on the top half of the dial and back', () => {
    const left = pointOnArc(100, 100, 80, 0);
    const top = pointOnArc(100, 100, 80, 0.5);
    const right = pointOnArc(100, 100, 80, 1);
    expect(left.x).toBeCloseTo(20);
    expect(left.y).toBeCloseTo(100);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(20);
    expect(right.x).toBeCloseTo(180);
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

  it('draws arcs clockwise over the top', () => {
    expect(arcPath(100, 100, 80, 0, 1)).toBe('M 20 100 A 80 80 0 0 1 180 100');
    expect(arcPath(100, 100, 80, 0.5, 0)).toBe('M 20 100 A 80 80 0 0 1 100 20');
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
});
