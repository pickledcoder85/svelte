/**
 * Add a workout by hand: the activity chips, the duration wheel, distance in the user's units,
 * and the time the workout is logged at.
 */
import type { TFunction } from '../i18n/translate';
import type { WorkoutActivity, WorkoutEffort } from '../types';

/** Labels come from t(`workouts.activities.${id}`); the id is what is saved. */
export const WORKOUT_ACTIVITIES: Array<{ id: WorkoutActivity; icon: string; distance: boolean }> = [
  { id: 'walk', icon: '🚶', distance: true },
  { id: 'run', icon: '🏃', distance: true },
  { id: 'bike', icon: '🚴', distance: true },
  { id: 'swim', icon: '🏊', distance: false },
  { id: 'strength', icon: '🏋️', distance: false },
  { id: 'other', icon: '✨', distance: false }
];

/** Labels and hints come from t(`workouts.efforts.${id}`) and t(`workouts.effortHints.${id}`). */
export const WORKOUT_EFFORTS: WorkoutEffort[] = ['easy', 'moderate', 'hard'];

export function activityLabel(id: WorkoutActivity, t: TFunction): string {
  return t(`workouts.activities.${id}`);
}

export function effortLabel(id: WorkoutEffort, t: TFunction): string {
  return t(`workouts.efforts.${id}`);
}

export function effortHint(id: WorkoutEffort, t: TFunction): string {
  return t(`workouts.effortHints.${id}`);
}

/** Minutes on the wheel: 5 to 300 in 5-minute steps. */
export const DURATION_MINUTES = Array.from({ length: 60 }, (_, index) => (index + 1) * 5);
export const DEFAULT_DURATION_INDEX = DURATION_MINUTES.indexOf(30);

export function durationLabel(minutes: number, t: TFunction): string {
  if (minutes < 60) {
    return t('workouts.duration.minutes', { minutes });
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t('workouts.duration.hoursMinutes', { hours, minutes: rest }) : t('workouts.duration.hours', { hours });
}

const METERS = { mi: 1609.344, km: 1000 } as const;

/** Meters from what the user typed ("3.1" mi or km); null when empty or not a positive number. */
export function distanceMeters(text: string, unit: 'mi' | 'km'): number | null {
  const value = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(value) && value > 0 ? Math.round(value * METERS[unit]) : null;
}

/** A watch's calorie total typed in; null when empty. */
export function watchCalories(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

/** "7:05 AM" for now, the way workouts store their time (always en-US: it is saved, not shown). */
export function clockLabel(now: Date = new Date()): string {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
