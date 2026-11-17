import { translatorFor } from '../i18n/dictionaries';
import { formatDate, type TFunction } from '../i18n/translate';
import { localDateKey } from './dates';
import type { MealPlanDay } from '../types';

const ENGLISH = translatorFor('en');

function parsePlanDate(planDate: string): Date | null {
  const parsed = new Date(`${planDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function sortMealPlanDaysByDate(days: MealPlanDay[]): MealPlanDay[] {
  return [...days].sort((left, right) => {
    const leftDate = left.plan_date ? parsePlanDate(left.plan_date) : null;
    const rightDate = right.plan_date ? parsePlanDate(right.plan_date) : null;

    if (leftDate && rightDate) {
      return leftDate.getTime() - rightDate.getTime();
    }
    if (leftDate) {
      return -1;
    }
    if (rightDate) {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });
}

export function resolveSelectedMealPlanDate(
  days: MealPlanDay[],
  preferredDate: string | null,
  todayKey: string = localDateKey()
): string | null {
  if (preferredDate && days.some((day) => day.plan_date === preferredDate)) {
    return preferredDate;
  }

  if (days.some((day) => day.plan_date === todayKey)) {
    return todayKey;
  }

  return days.at(-1)?.plan_date ?? null;
}

export function selectMealPlanDay(days: MealPlanDay[], selectedDate: string | null): MealPlanDay | null {
  if (selectedDate) {
    const selected = days.find((day) => day.plan_date === selectedDate);
    if (selected) {
      return selected;
    }
  }

  return days[0] ?? null;
}

/** "Mar 30" ("30 de mar."); "Unscheduled" without a date. */
export function formatMealPlanCardDate(planDate: string | undefined, t: TFunction = ENGLISH): string {
  if (!planDate) {
    return t('mealPlan.unscheduled');
  }

  const parsed = parsePlanDate(planDate);
  if (!parsed) {
    return planDate;
  }

  return formatDate(parsed, { month: 'short', day: 'numeric' }, t.locale);
}

/** "Mon" ("lun"); "Planned" without a date. */
export function formatMealPlanCardWeekday(planDate: string | undefined, t: TFunction = ENGLISH): string {
  if (!planDate) {
    return t('mealPlan.planned');
  }

  const parsed = parsePlanDate(planDate);
  if (!parsed) {
    return t('mealPlan.planned');
  }

  return formatDate(parsed, { weekday: 'short' }, t.locale);
}
