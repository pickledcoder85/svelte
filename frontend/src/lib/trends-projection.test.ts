import { describe, expect, it } from 'vitest';

import type { DayPoint } from './trends';
import {
  goalDate,
  macroCounts,
  macroDays,
  macroMissIsBad,
  paceStatus,
  plannedWeeklyChange,
  projectableRate,
  projectLine
} from './trends';

const day = (date: string, protein: number, logged = true, proteinTarget = 100): DayPoint => ({
  date,
  eaten: 1500,
  macros: { protein, carbs: 0, fat: 0 },
  logged,
  workoutCalories: 0,
  baseTarget: 1500,
  allowance: 1500,
  macroAllowance: { protein: proteinTarget, carbs: 0, fat: 0 }
});

describe('macros over time', () => {
  it('says how far each day is from the target', () => {
    const days = macroDays([day('a', 150), day('b', 105), day('c', 60), day('d', 0, false)], 'protein');
    expect(days.map((d) => [d.percent, d.status])).toEqual([[50, 'over'], [5, 'on'], [-40, 'under'], [null, 'none']]);
    expect(macroCounts(days)).toEqual({ on: 1, over: 1, under: 1 });
  });

  it('treats protein as a minimum and carbs and fat as limits', () => {
    expect(macroMissIsBad('protein', 'under')).toBe(true);
    expect(macroMissIsBad('protein', 'over')).toBe(false);
    expect(macroMissIsBad('carbs', 'over')).toBe(true);
    expect(macroMissIsBad('fat', 'under')).toBe(false);
  });

  it('has no bars without a target', () => {
    expect(macroDays([day('a', 50, true, 0)], 'protein')[0].status).toBe('none');
  });

  it('measures each day against its own target (bigger on workout days)', () => {
    const [rest, workout] = macroDays([day('a', 120, true, 120), day('b', 120, true, 160)], 'protein');
    expect(rest).toMatchObject({ status: 'on', eaten: 120, target: 120 });
    expect(workout).toMatchObject({ status: 'under', percent: -25, target: 160 });
  });
});

describe('weight projection', () => {
  it('turns the calorie target and daily burn into a weekly pace', () => {
    expect(plannedWeeklyChange(1500, 2000)).toBe(-1);
    expect(plannedWeeklyChange(2500, 2000)).toBe(1);
    expect(plannedWeeklyChange(1500, null)).toBeNull();
  });

  it('needs a week of weigh-ins to carry the trend forward', () => {
    const points = (days: number) =>
      Array.from({ length: days + 1 }, (_, index) => ({ date: `2026-11-${String(1 + index).padStart(2, '0')}`, weight: 220 - index * 0.2, trend: 220 - index * 0.2 }));
    expect(projectableRate(points(4))).toBeNull();
    expect(projectableRate(points(10))).toBe(-1.4);
  });

  it('projects a straight line', () => {
    expect(projectLine({ date: '2026-11-16', weight: 220 }, -1, 28)).toEqual([
      { date: '2026-11-16', weight: 220 },
      { date: '2026-12-14', weight: 216 }
    ]);
  });

  it('finds the goal date, or none when moving away', () => {
    const from = { date: '2026-11-16', weight: 220 };
    expect(goalDate(from, -1, 210)).toBe('2027-01-25'); // 10 weeks
    expect(goalDate(from, 0.5, 210)).toBeNull();
    expect(goalDate(from, 0, 210)).toBeNull();
    expect(goalDate(from, -0.01, 150)).toBeNull(); // years away
    expect(goalDate(from, -1, 220)).toBe('2026-11-16');
    expect(goalDate(from, -1, null)).toBeNull();
    // Already past the goal in its direction: reached, even while still moving that way.
    expect(goalDate({ date: '2026-11-16', weight: 178 }, -0.5, 180, 'lose')).toBe('2026-11-16');
    expect(goalDate({ date: '2026-11-16', weight: 186 }, 0.3, 185, 'gain')).toBe('2026-11-16');
    expect(goalDate({ date: '2026-11-16', weight: 178 }, -0.5, 180)).toBeNull(); // direction unknown
  });

  it('compares the trend with the plan', () => {
    expect(paceStatus(-0.9, -1)).toBe('on');
    expect(paceStatus(-1.6, -1)).toBe('ahead');
    expect(paceStatus(-0.4, -1)).toBe('behind');
    expect(paceStatus(0.3, -1)).toBe('behind');
    expect(paceStatus(0.6, 0.5)).toBe('on');
    expect(paceStatus(0.5, 0)).toBe('drifting');
    expect(paceStatus(0.1, 0)).toBe('on');
    expect(paceStatus(null, -1)).toBeNull();
  });
});
