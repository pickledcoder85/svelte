/** The date header on Today: a plain label and the week (Monday first) around the chosen day. */
import { addDaysToDateKey, parseDateKey } from './dates';

export interface WeekDay {
  key: string;
  /** "M", "T", … */
  letter: string;
  /** Day of the month. */
  date: number;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function weekDays(selectedKey: string, todayKey: string): WeekDay[] {
  const selected = parseDateKey(selectedKey) ?? new Date();
  const mondayOffset = (selected.getDay() + 6) % 7;
  const monday = addDaysToDateKey(selectedKey, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToDateKey(monday, index);
    const date = parseDateKey(key) ?? new Date();
    return {
      key,
      letter: LETTERS[date.getDay()],
      date: date.getDate(),
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      isFuture: key > todayKey
    };
  });
}

export function dayLabel(selectedKey: string, todayKey: string): string {
  const date = parseDateKey(selectedKey);
  const full = date
    ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : selectedKey;
  if (selectedKey === todayKey) {
    return `Today · ${full}`;
  }
  if (selectedKey === addDaysToDateKey(todayKey, -1)) {
    return `Yesterday · ${full}`;
  }
  if (selectedKey === addDaysToDateKey(todayKey, 1)) {
    return `Tomorrow · ${full}`;
  }
  return full;
}
