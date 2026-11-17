import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import {
  DEFAULT_DURATION_INDEX,
  DURATION_MINUTES,
  activityLabel,
  clockLabel,
  distanceMeters,
  durationLabel,
  effortHint,
  effortLabel,
  watchCalories
} from './add-workout';

const en = translatorFor('en');
const es = translatorFor('es');

describe('add a workout', () => {
  it('offers 5 to 300 minutes, starting at 30', () => {
    expect(DURATION_MINUTES[0]).toBe(5);
    expect(DURATION_MINUTES.at(-1)).toBe(300);
    expect(DURATION_MINUTES[DEFAULT_DURATION_INDEX]).toBe(30);
  });

  it('labels durations', () => {
    expect(durationLabel(45, en)).toBe('45 min');
    expect(durationLabel(60, en)).toBe('1 h');
    expect(durationLabel(95, en)).toBe('1 h 35 min');
    expect(durationLabel(95, es)).toBe('1 h 35 min');
  });

  it('labels activities and efforts in each language', () => {
    expect(activityLabel('walk', en)).toBe('Walk');
    expect(activityLabel('walk', es)).toBe('Caminar');
    expect(effortLabel('hard', en)).toBe('Hard');
    expect(effortLabel('hard', es)).toBe('Intenso');
    expect(effortHint('easy', en)).toBe('can chat');
    expect(effortHint('easy', es)).toBe('puede conversar');
  });

  it('reads distances in miles or km', () => {
    expect(distanceMeters('3.1', 'mi')).toBe(4989);
    expect(distanceMeters('5,0', 'km')).toBe(5000);
    expect(distanceMeters('', 'mi')).toBeNull();
    expect(distanceMeters('0', 'km')).toBeNull();
  });

  it('reads a watch total', () => {
    expect(watchCalories('1,240')).toBe(1240);
    expect(watchCalories('')).toBeNull();
  });

  it('formats the time', () => {
    expect(clockLabel(new Date(2026, 10, 16, 7, 5))).toBe('7:05 AM');
  });
});
