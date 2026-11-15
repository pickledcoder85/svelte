import { describe, expect, it } from 'vitest';

import type { ExerciseEntry } from '../types';
import { buildWorkoutDetail } from './workout-detail';

const ride: ExerciseEntry = {
  id: 'g1',
  title: 'Harris County Road Cycling',
  duration_minutes: 106,
  calories_burned: 928,
  logged_on: '2026-11-01',
  logged_at: '7:15 AM',
  intensity: 'High',
  source: 'garmin',
  distance_m: 48280,
  source_calories_total: 1051,
  source_bmr_calories: 149,
  relish_resting_calories: 123
};

describe('workout detail', () => {
  it('shows Garmin as recorded next to what Relish counts', () => {
    const detail = buildWorkoutDetail(ride, 75);
    expect(detail.subtitle).toBe('106 min · 30.0 mi · 7:15 AM');
    expect(detail.recorded?.map((r) => [r.label, r.value])).toEqual([
      ['Total burned', '1,051 kcal'],
      ['Resting (their estimate)', '−149 kcal'],
      ['Active', '902 kcal']
    ]);
    expect(detail.relish.map((r) => [r.label, r.value])).toEqual([
      ['Total burned', '1,051 kcal'],
      ['Resting (your BMR)', '−123 kcal'],
      ['Active, counted', '928 kcal'],
      ['Added to today (75%)', '+696 kcal']
    ]);
    expect(detail.notes[0]).toMatch(/^Relish counts 26 kcal more than Garmin's/);
    expect(detail.notes[1]).toMatch(/^Only 75%/);
  });

  it('a manual workout shows what you logged', () => {
    const detail = buildWorkoutDetail(
      { id: 'm', title: 'Walk', duration_minutes: 30, calories_burned: 120, logged_on: '2026-11-15', logged_at: '7:00 AM', intensity: 'Low' },
      100
    );
    expect(detail.recorded).toBeNull();
    expect(detail.relish.map((r) => r.value)).toEqual(['120 kcal', '+120 kcal']);
    expect(detail.subtitle).toBe('30 min · 7:00 AM');
  });

  it('notices an edited import', () => {
    const detail = buildWorkoutDetail({ ...ride, relish_resting_calories: null, calories_burned: 800 }, 100);
    expect(detail.notes[0]).toBe('You edited the calories for this workout; your number is used.');
    expect(detail.relish[1].label).toBe("Resting (Garmin's, until setup)");
  });

  it('share off adds nothing', () => {
    expect(buildWorkoutDetail(ride, 0).relish.at(-1)).toEqual({ label: 'Added to today (off)', value: '+0 kcal', strong: true });
  });
});
