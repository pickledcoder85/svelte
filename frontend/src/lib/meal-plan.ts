import type { MealPlanDay } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  todayKey: string = new Date().toISOString().slice(0, 10)
): string | null {
  if (preferredDate && days.some((day) => day.plan_date === preferredDate)) {
    return preferredDate;
  }

  if (days.some((day) => day.plan_date === todayKey)) {
    return todayKey;
  }

  return days[0]?.plan_date ?? null;
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

export function formatMealPlanCardDate(planDate: string | undefined): string {
  if (!planDate) {
    return 'Unscheduled';
  }

  const parsed = parsePlanDate(planDate);
  if (!parsed) {
    return planDate;
  }

  return `${MONTHS[parsed.getMonth()]} ${parsed.getDate()}`;
}

export function formatMealPlanCardWeekday(planDate: string | undefined): string {
  if (!planDate) {
    return 'Planned';
  }

  const parsed = parsePlanDate(planDate);
  if (!parsed) {
    return 'Planned';
  }

  return WEEKDAYS[parsed.getDay()];
}
