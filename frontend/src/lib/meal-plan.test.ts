import { describe, expect, it } from 'vitest';

import { demoMealPlanDays } from '../mock-data';
import {
  formatMealPlanCardDate,
  formatMealPlanCardWeekday,
  resolveSelectedMealPlanDate,
  selectMealPlanDay,
  sortMealPlanDaysByDate
} from './meal-plan';

describe('meal plan helpers', () => {
  it('sorts meal plan days by date and chooses a preferred selection', () => {
    const shuffled = [demoMealPlanDays[2], demoMealPlanDays[0], demoMealPlanDays[1]];
    const sorted = sortMealPlanDaysByDate(shuffled);

    expect(sorted.map((day) => day.plan_date)).toEqual(['2026-03-30', '2026-03-31', '2026-04-01']);
    expect(resolveSelectedMealPlanDate(sorted, '2026-03-31', '2026-03-28')).toBe('2026-03-31');
    expect(resolveSelectedMealPlanDate(sorted, null, '2026-03-30')).toBe('2026-03-30');
    expect(resolveSelectedMealPlanDate(sorted, 'missing', '2026-04-02')).toBe('2026-03-30');
    expect(selectMealPlanDay(sorted, '2026-03-31')?.label).toBe('Tue');
    expect(selectMealPlanDay(sorted, 'missing')?.label).toBe('Mon');
  });

  it('formats compact date card labels', () => {
    expect(formatMealPlanCardDate('2026-03-30')).toBe('Mar 30');
    expect(formatMealPlanCardWeekday('2026-03-30')).toBe('Mon');
    expect(formatMealPlanCardDate(undefined)).toBe('Unscheduled');
    expect(formatMealPlanCardWeekday(undefined)).toBe('Planned');
  });
});
