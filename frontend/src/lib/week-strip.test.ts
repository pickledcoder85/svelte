import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import { dayLabel, weekDays } from './week-strip';

const en = translatorFor('en');
const es = translatorFor('es');

describe('week strip', () => {
  it('shows Monday to Sunday around the chosen day', () => {
    const week = weekDays('2026-11-15', '2026-11-15', en); // a Sunday
    expect(week.map((d) => d.key)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'
    ]);
    expect(week.map((d) => d.letter).join('')).toBe('MTWTFSS');
    expect(weekDays('2026-11-15', '2026-11-15', es).map((d) => d.letter).join('')).toBe('LMMJVSD');
    expect(week[6]).toMatchObject({ date: 15, isToday: true, isSelected: true, isFuture: false });
  });

  it('marks future days and keeps today highlighted when another day is chosen', () => {
    const week = weekDays('2026-11-17', '2026-11-15', en);
    expect(week[0].key).toBe('2026-11-16');
    expect(week.find((d) => d.isSelected)?.key).toBe('2026-11-17');
    expect(week.every((d) => d.isFuture)).toBe(true);
    expect(week.some((d) => d.isToday)).toBe(false);
  });

  it('labels nearby days in words', () => {
    expect(dayLabel('2026-11-15', '2026-11-15', en)).toBe('Today · Sun, Nov 15');
    expect(dayLabel('2026-11-14', '2026-11-15', en)).toBe('Yesterday · Sat, Nov 14');
    expect(dayLabel('2026-11-16', '2026-11-15', en)).toBe('Tomorrow · Mon, Nov 16');
    expect(dayLabel('2026-11-10', '2026-11-15', en)).toBe('Tue, Nov 10');
    expect(dayLabel('2026-11-15', '2026-11-15', es)).toMatch(/^Hoy · dom/);
    expect(dayLabel('2026-11-14', '2026-11-15', es)).toMatch(/^Ayer · /);
  });
});
