/** The date header on Today: a plain label and the week (Monday first) around the chosen day. */
import { formatDate, type TFunction } from '../i18n/translate';
import { addDaysToDateKey, parseDateKey } from './dates';

export interface WeekDay {
  key: string;
  /** "M", "T", … ("L", "M", … in Spanish) */
  letter: string;
  /** Day of the month. */
  date: number;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
}

export function weekDays(selectedKey: string, todayKey: string, t: TFunction): WeekDay[] {
  // One letter per weekday, Sunday first.
  const letters = Array.from(t('day.letters'));
  const selected = parseDateKey(selectedKey) ?? new Date();
  const mondayOffset = (selected.getDay() + 6) % 7;
  const monday = addDaysToDateKey(selectedKey, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToDateKey(monday, index);
    const date = parseDateKey(key) ?? new Date();
    return {
      key,
      letter: letters[date.getDay()] ?? '',
      date: date.getDate(),
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      isFuture: key > todayKey
    };
  });
}

export function dayLabel(selectedKey: string, todayKey: string, t: TFunction): string {
  const date = parseDateKey(selectedKey);
  const full = date ? formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' }, t.locale) : selectedKey;
  if (selectedKey === todayKey) {
    return t('day.today', { date: full });
  }
  if (selectedKey === addDaysToDateKey(todayKey, -1)) {
    return t('day.yesterday', { date: full });
  }
  if (selectedKey === addDaysToDateKey(todayKey, 1)) {
    return t('day.tomorrow', { date: full });
  }
  return full;
}
