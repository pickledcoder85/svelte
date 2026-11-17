/**
 * Add a workout by hand: the activity chips, the duration wheel, distance in the user's units,
 * and the time the workout is logged at.
 */
import type { WorkoutActivity, WorkoutEffort } from '../types';

export const WORKOUT_ACTIVITIES: Array<{ id: WorkoutActivity; label: string; icon: string; distance: boolean }> = [
  { id: 'walk', label: 'Walk', icon: '🚶', distance: true },
  { id: 'run', label: 'Run', icon: '🏃', distance: true },
  { id: 'bike', label: 'Bike', icon: '🚴', distance: true },
  { id: 'swim', label: 'Swim', icon: '🏊', distance: false },
  { id: 'strength', label: 'Strength', icon: '🏋️', distance: false },
  { id: 'other', label: 'Other', icon: '✨', distance: false }
];

export const WORKOUT_EFFORTS: Array<{ id: WorkoutEffort; label: string; hint: string }> = [
  { id: 'easy', label: 'Easy', hint: 'can chat' },
  { id: 'moderate', label: 'Moderate', hint: 'breathing harder' },
  { id: 'hard', label: 'Hard', hint: 'few words' }
];

/** Minutes on the wheel: 5 to 300 in 5-minute steps. */
export const DURATION_MINUTES = Array.from({ length: 60 }, (_, index) => (index + 1) * 5);
export const DEFAULT_DURATION_INDEX = DURATION_MINUTES.indexOf(30);

export function durationLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
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

/** "7:05 AM" for now, the way workouts store their time. */
export function clockLabel(now: Date = new Date()): string {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
