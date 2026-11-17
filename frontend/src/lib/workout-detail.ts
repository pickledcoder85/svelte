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

function formatDistance(meters: number, metric = false): string {
  if (metric) {
    const km = meters / 1000;
    return `${km.toFixed(km < 10 ? 2 : 1)} km`;
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(miles < 10 ? 2 : 1)} mi`;
}

function addedToday(calories: number, sharePercent: number): number {
  return Math.round((Math.max(0, calories) * Math.min(100, Math.max(0, sharePercent))) / 100);
}

export function buildWorkoutDetail(entry: ExerciseEntry, sharePercent: number, metric = false): WorkoutDetail {
  const sourceLabel = workoutSourceLabel(entry.source);
  const facts = [`${entry.duration_minutes} min`];
  if (entry.distance_m) {
    facts.push(formatDistance(entry.distance_m, metric));
  }
  facts.push(entry.logged_at);

  const added = addedToday(entry.calories_burned, sharePercent);
  const addedRow: DetailRow = {
    label: sharePercent > 0 ? `Added to today (${sharePercent}%)` : 'Added to today (off)',
    value: `+${kcal(added)}`,
    strong: true
  };

  if (entry.calories_method === 'estimated') {
    const effort = { Low: 'Easy', Moderate: 'Moderate', High: 'Hard' }[entry.intensity] ?? entry.intensity;
    const weight = entry.weight_lbs_at_time
      ? ` at ${metric ? `${Math.round(entry.weight_lbs_at_time * 0.45359237)} kg` : `${Math.round(entry.weight_lbs_at_time)} lb`}`
      : '';
    const fromPace = String(entry.calc_version ?? '').endsWith(':pace');
    return {
      title: entry.title,
      subtitle: facts.join(' · '),
      sourceLabel: null,
      recorded: null,
      relish: [{ label: 'Estimated by Relish', value: kcal(entry.calories_burned) }, addedRow],
      notes: [
        `${fromPace ? 'From your pace' : effort}${entry.met ? `, MET ${entry.met}` : ''}${weight}.`,
        'Active calories = (MET − 1) × weight × hours: the 1 MET you burn at rest is left out because your target already counts it.'
      ]
    };
  }

  if (entry.calories_method === 'device' && entry.source_calories_total != null) {
    const relish: DetailRow[] = [{ label: 'Your watch said', value: kcal(entry.source_calories_total) }];
    if (entry.relish_resting_calories != null) {
      relish.push({ label: 'Resting (your BMR)', value: `−${kcal(entry.relish_resting_calories)}` });
    }
    relish.push({ label: 'Active, counted', value: kcal(entry.calories_burned), strong: true }, addedRow);
    return {
      title: entry.title,
      subtitle: facts.join(' · '),
      sourceLabel: null,
      recorded: null,
      relish,
      notes: ['Your watch’s total includes the calories you’d burn anyway at rest; Relish takes off its own resting estimate (the same BMR as your target) so they aren’t counted twice.']
    };
  }

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
