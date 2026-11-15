import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_LEVELS,
  activityIndex,
  arcPath,
  indexForPosition,
  isOnDialBand,
  maintenanceForLevel,
  pointOnArc,
  positionForIndex,
  positionForPoint
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

  it('puts each handle in the middle of its fifth of the arc', () => {
    expect(positionForIndex(0)).toBeCloseTo(0.1);
    expect(positionForIndex(2)).toBeCloseTo(0.5);
    expect(positionForIndex(4)).toBeCloseTo(0.9);
    expect(positionForIndex(9)).toBeCloseTo(0.9);
  });

  it('snaps a position to the level that owns it', () => {
    expect(indexForPosition(0)).toBe(0);
    expect(indexForPosition(0.19)).toBe(0);
    expect(indexForPosition(0.21)).toBe(1);
    expect(indexForPosition(0.5)).toBe(2);
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
    expect(positionForPoint(100, 100, top)).toBeCloseTo(0.5);
    expect(positionForPoint(100, 100, pointOnArc(100, 100, 80, 0.3))).toBeCloseTo(0.3);
  });

  it('only counts touches on the dial band', () => {
    expect(isOnDialBand(100, 100, 80, pointOnArc(100, 100, 80, 0.3), 20)).toBe(true);
    expect(isOnDialBand(100, 100, 80, { x: 100, y: 35 }, 20)).toBe(true);
    // The centre label, outside the dial, and well below the centre line.
    expect(isOnDialBand(100, 100, 80, { x: 100, y: 80 }, 20)).toBe(false);
    expect(isOnDialBand(100, 100, 80, { x: 100, y: -10 }, 20)).toBe(false);
    expect(isOnDialBand(100, 100, 80, { x: 20, y: 130 }, 20)).toBe(false);
  });

  it('treats touches below the dial as the nearer end', () => {
    expect(positionForPoint(100, 100, { x: 40, y: 140 })).toBe(0);
    expect(positionForPoint(100, 100, { x: 160, y: 140 })).toBe(1);
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
