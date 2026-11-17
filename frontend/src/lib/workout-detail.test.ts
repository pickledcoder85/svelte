import { describe, expect, it } from 'vitest';

import type { ExerciseEntry } from '../types';
import { translatorFor } from '../i18n/dictionaries';
import { buildWorkoutDetail } from './workout-detail';

const en = translatorFor('en');
const es = translatorFor('es');

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
    const detail = buildWorkoutDetail(ride, 75, false, en);
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
      100,
      false,
      en
    );
    expect(detail.recorded).toBeNull();
    expect(detail.relish.map((r) => r.value)).toEqual(['120 kcal', '+120 kcal']);
    expect(detail.subtitle).toBe('30 min · 7:00 AM');
  });

  it('a Relish estimate explains its MET', () => {
    const detail = buildWorkoutDetail(
      { id: 'e', title: 'Run', duration_minutes: 30, calories_burned: 359, logged_on: '2026-11-16', logged_at: '7:05 AM', intensity: 'Moderate',
        source: 'manual', calories_method: 'estimated', met: 9.8, weight_lbs_at_time: 180 },
      75,
      false,
      en
    );
    expect(detail.relish[0]).toEqual({ label: 'Estimated by Relish', value: '359 kcal' });
    expect(detail.notes[0]).toBe('Moderate, MET 9.8 at 180 lb.');
  });

  it('says the pace set the MET only when it did, in the chosen units', () => {
    const base: ExerciseEntry = {
      id: 'p', title: 'Run', duration_minutes: 30, calories_burned: 400, logged_on: '2026-11-16', logged_at: '7:05 AM', intensity: 'Moderate',
      source: 'manual', calories_method: 'estimated', met: 9.8, weight_lbs_at_time: 180, distance_m: 5000
    };
    expect(buildWorkoutDetail({ ...base, calc_version: 'met1:pace' }, 75, false, en).notes[0]).toBe('From your pace, MET 9.8 at 180 lb.');
    expect(buildWorkoutDetail({ ...base, calc_version: 'met1:effort' }, 75, false, en).notes[0]).toBe('Moderate, MET 9.8 at 180 lb.');
    const metric = buildWorkoutDetail({ ...base, calc_version: 'met1:pace' }, 75, true, en);
    expect(metric.notes[0]).toBe('From your pace, MET 9.8 at 82 kg.');
    expect(metric.subtitle).toBe('30 min · 5.00 km · 7:05 AM');
  });

  it('a watch total entered by hand shows the resting calories taken off', () => {
    const detail = buildWorkoutDetail(
      { id: 'd', title: 'Hill ride', duration_minutes: 60, calories_burned: 630, logged_on: '2026-11-16', logged_at: '6:00 PM', intensity: 'Moderate',
        source: 'manual', calories_method: 'device', source_calories_total: 700, relish_resting_calories: 70 },
      100,
      false,
      en
    );
    expect(detail.relish.map((r) => r.value)).toEqual(['700 kcal', '−70 kcal', '630 kcal', '+630 kcal']);
  });

  it('notices an edited import', () => {
    const detail = buildWorkoutDetail({ ...ride, relish_resting_calories: null, calories_burned: 800 }, 100, false, en);
    expect(detail.notes[0]).toBe('You edited the calories for this workout; your number is used.');
    expect(detail.relish[1].label).toBe("Resting (Garmin's, until setup)");
  });

  it('share off adds nothing', () => {
    expect(buildWorkoutDetail(ride, 0, false, en).relish.at(-1)).toEqual({ label: 'Added to today (off)', value: '+0 kcal', strong: true });
  });

  it('speaks Spanish with Colombian numbers', () => {
    const detail = buildWorkoutDetail(ride, 75, false, es);
    expect(detail.subtitle).toBe('106 min · 30,0 mi · 7:15 a. m.');
    expect(detail.recorded?.[0]).toEqual({ label: 'Total quemado', value: '1.051 kcal' });
    expect(detail.relish.at(-1)).toEqual({ label: 'Sumado a hoy (75 %)', value: '+696 kcal', strong: true });
    expect(detail.notes[0]).toMatch(/^Relish cuenta 26 kcal más que el número activo de Garmin/);
  });
});
