import { describe, expect, it } from 'vitest';
import {
  createEmptyFoodLog,
  deriveExerciseIntensity,
  firstName,
  formatHomeDateLabel,
  sortPlannedExerciseEntries,
  splitHeightCm
} from './app-format';
import type { PlannedExerciseEntry } from '../types';

describe('app-format helpers', () => {
  it('takes the first word of a name', () => {
    expect(firstName('  Brian Miner ')).toBe('Brian');
    expect(firstName(null)).toBe('');
  });

  it('splits centimetres into feet and inches, rolling 12 inches over', () => {
    expect(splitHeightCm(null)).toEqual({ feet: '5', inches: '10' });
    expect(splitHeightCm(177.8)).toEqual({ feet: '5', inches: '10' });
    expect(splitHeightCm(182.5)).toEqual({ feet: '6', inches: '0' });
  });

  it('derives exercise intensity from calories, then duration', () => {
    expect(deriveExerciseIntensity(10, 300)).toBe('High');
    expect(deriveExerciseIntensity(30, 100)).toBe('Moderate');
    expect(deriveExerciseIntensity(10, 100)).toBe('Low');
  });

  it('prefixes today and passes through unparseable dates', () => {
    expect(formatHomeDateLabel('2026-03-04', '2026-03-04').startsWith('Today · ')).toBe(true);
    expect(formatHomeDateLabel('2026-03-03', '2026-03-04').startsWith('Today')).toBe(false);
    expect(formatHomeDateLabel('not-a-date', '2026-03-04')).toBe('not-a-date');
  });

  it('sorts planned workouts by date then time without mutating the input', () => {
    const entries = [
      { planned_on: '2026-03-05', planned_at: '07:00' },
      { planned_on: '2026-03-04', planned_at: '18:00' },
      { planned_on: '2026-03-04', planned_at: '06:30' }
    ] as PlannedExerciseEntry[];
    const sorted = sortPlannedExerciseEntries(entries);
    expect(sorted.map((entry) => `${entry.planned_on} ${entry.planned_at}`)).toEqual([
      '2026-03-04 06:30',
      '2026-03-04 18:00',
      '2026-03-05 07:00'
    ]);
    expect(entries[0].planned_on).toBe('2026-03-05');
  });

  it('builds an empty food log for a date', () => {
    expect(createEmptyFoodLog('2026-03-04')).toEqual({
      date: '2026-03-04',
      entries: [],
      totals: { calories: 0, macros: { protein: 0, carbs: 0, fat: 0 } }
    });
  });
});
