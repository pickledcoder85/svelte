/**
 * One workout, side by side: what the source recorded (as recorded) and what Relish counts.
 * Watches report total calories, including the resting calories you'd burn anyway; Relish
 * removes its own resting estimate (the same BMR as your target) and counts the active rest.
 */
import type { ExerciseEntry } from '../types';
import { workoutSourceLabel } from './garmin';

export interface DetailRow {
  label: string;
  value: string;
  strong?: boolean;
}

export interface WorkoutDetail {
  title: string;
  subtitle: string;
  sourceLabel: string | null;
  /** Null for a workout logged in Relish. */
  recorded: DetailRow[] | null;
  relish: DetailRow[];
  notes: string[];
}

const kcal = (value: number) => `${Math.round(value).toLocaleString('en-US')} kcal`;

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(miles < 10 ? 2 : 1)} mi`;
}

function addedToday(calories: number, sharePercent: number): number {
  return Math.round((Math.max(0, calories) * Math.min(100, Math.max(0, sharePercent))) / 100);
}

export function buildWorkoutDetail(entry: ExerciseEntry, sharePercent: number): WorkoutDetail {
  const sourceLabel = workoutSourceLabel(entry.source);
  const facts = [`${entry.duration_minutes} min`];
  if (entry.distance_m) {
    facts.push(formatDistance(entry.distance_m));
  }
  facts.push(entry.logged_at);

  const added = addedToday(entry.calories_burned, sharePercent);
  const addedRow: DetailRow = {
    label: sharePercent > 0 ? `Added to today (${sharePercent}%)` : 'Added to today (off)',
    value: `+${kcal(added)}`,
    strong: true
  };

  if (!sourceLabel || entry.source_calories_total == null) {
    return {
      title: entry.title,
      subtitle: facts.join(' · '),
      sourceLabel,
      recorded: null,
      relish: [{ label: 'You logged', value: kcal(entry.calories_burned) }, addedRow],
      notes: ['Logged in Relish. Your number is used as active calories.']
    };
  }

  const total = entry.source_calories_total;
  const sourceResting = entry.source_bmr_calories;
  const recorded: DetailRow[] = [{ label: 'Total burned', value: kcal(total) }];
  if (sourceResting != null) {
    recorded.push({ label: 'Resting (their estimate)', value: `−${kcal(sourceResting)}` });
    recorded.push({ label: 'Active', value: kcal(Math.max(0, total - sourceResting)), strong: true });
  }

  const relish: DetailRow[] = [{ label: 'Total burned', value: kcal(total) }];
  if (entry.relish_resting_calories != null) {
    relish.push({ label: 'Resting (your BMR)', value: `−${kcal(entry.relish_resting_calories)}` });
  } else if (sourceResting != null) {
    relish.push({ label: `Resting (${sourceLabel}'s, until setup)`, value: `−${kcal(sourceResting)}` });
  }
  relish.push({ label: 'Active, counted', value: kcal(entry.calories_burned), strong: true });
  relish.push(addedRow);

  const notes: string[] = [];
  const sourceActive = sourceResting != null ? Math.max(0, total - sourceResting) : null;
  const resting = entry.relish_resting_calories ?? sourceResting ?? 0;
  const imported = Math.max(0, total - resting);
  if (Math.abs(imported - entry.calories_burned) > 1) {
    notes.push('You edited the calories for this workout; your number is used.');
  } else if (sourceActive !== null && entry.relish_resting_calories != null && sourceActive !== entry.calories_burned) {
    const difference = entry.calories_burned - sourceActive;
    notes.push(
      `Relish counts ${kcal(Math.abs(difference))} ${difference > 0 ? 'more' : 'less'} than ${sourceLabel}'s active number because your ` +
        `resting estimate differs from theirs. Relish uses the same BMR as your target, so resting calories are never counted twice.`
    );
  }
  if (sharePercent < 100) {
    notes.push(
      `${sharePercent > 0 ? `Only ${sharePercent}%` : 'None'} of the active calories is added to today because watch estimates tend to run high. Change this in Settings → Workout calories.`
    );
  }
  notes.push(`${sourceLabel}'s numbers are kept as recorded. Relish's are worked out once, when the workout comes in.`);

  return { title: entry.title, subtitle: facts.join(' · '), sourceLabel, recorded, relish, notes };
}
