/**
 * One workout, side by side: what the source recorded (as recorded) and what Relish counts.
 * Watches report total calories, including the resting calories you'd burn anyway; Relish
 * removes its own resting estimate (the same BMR as your target) and counts the active rest.
 */
import { formatNumber, type TFunction } from '../i18n/translate';
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

const kcal = (value: number, t: TFunction) => t('common.kcal', { value: formatNumber(Math.round(value), undefined, t.locale) });

const fixed = (value: number, digits: number, t: TFunction) =>
  formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false }, t.locale);

function formatDistance(meters: number, metric: boolean, t: TFunction): string {
  if (metric) {
    const km = meters / 1000;
    return `${fixed(km, km < 10 ? 2 : 1, t)} km`;
  }
  const miles = meters / 1609.344;
  return `${fixed(miles, miles < 10 ? 2 : 1, t)} mi`;
}

function addedToday(calories: number, sharePercent: number): number {
  return Math.round((Math.max(0, calories) * Math.min(100, Math.max(0, sharePercent))) / 100);
}

export function buildWorkoutDetail(entry: ExerciseEntry, sharePercent: number, metric: boolean, t: TFunction): WorkoutDetail {
  const sourceLabel = workoutSourceLabel(entry.source);
  const facts = [t('common.minutes', { minutes: entry.duration_minutes })];
  if (entry.distance_m) {
    facts.push(formatDistance(entry.distance_m, metric, t));
  }
  facts.push(entry.logged_at);

  const added = addedToday(entry.calories_burned, sharePercent);
  const addedRow: DetailRow = {
    label: sharePercent > 0 ? t('workouts.detail.addedShare', { percent: sharePercent }) : t('workouts.detail.addedOff'),
    value: `+${kcal(added, t)}`,
    strong: true
  };

  if (entry.calories_method === 'estimated') {
    const effortId = ({ Low: 'easy', Moderate: 'moderate', High: 'hard' } as const)[entry.intensity as 'Low' | 'Moderate' | 'High'];
    const effort = effortId ? t(`workouts.efforts.${effortId}`) : entry.intensity;
    const weight = entry.weight_lbs_at_time
      ? t('workouts.detail.atWeight', {
          weight: metric ? `${Math.round(entry.weight_lbs_at_time * 0.45359237)} kg` : `${Math.round(entry.weight_lbs_at_time)} lb`
        })
      : '';
    const fromPace = String(entry.calc_version ?? '').endsWith(':pace');
    return {
      title: entry.title,
      subtitle: facts.join(' · '),
      sourceLabel: null,
      recorded: null,
      relish: [{ label: t('workouts.detail.estimatedByRelish'), value: kcal(entry.calories_burned, t) }, addedRow],
      notes: [
        t('workouts.detail.estimateNote', {
          basis: fromPace ? t('workouts.detail.fromPace') : effort,
          met: entry.met ? t('workouts.detail.metPart', { met: formatNumber(entry.met, undefined, t.locale) }) : '',
          weight
        }),
        t('workouts.detail.metFormula')
      ]
    };
  }

  if (entry.calories_method === 'device' && entry.source_calories_total != null) {
    const relish: DetailRow[] = [{ label: t('workouts.detail.watchSaid'), value: kcal(entry.source_calories_total, t) }];
    if (entry.relish_resting_calories != null) {
      relish.push({ label: t('workouts.detail.restingYourBmr'), value: `−${kcal(entry.relish_resting_calories, t)}` });
    }
    relish.push({ label: t('workouts.detail.activeCounted'), value: kcal(entry.calories_burned, t), strong: true }, addedRow);
    return {
      title: entry.title,
      subtitle: facts.join(' · '),
      sourceLabel: null,
      recorded: null,
      relish,
      notes: [t('workouts.detail.watchNote')]
    };
  }

  if (!sourceLabel || entry.source_calories_total == null) {
    return {
      title: entry.title,
      subtitle: facts.join(' · '),
      sourceLabel,
      recorded: null,
      relish: [{ label: t('workouts.detail.youLogged'), value: kcal(entry.calories_burned, t) }, addedRow],
      notes: [t('workouts.detail.loggedNote')]
    };
  }

  const total = entry.source_calories_total;
  const sourceResting = entry.source_bmr_calories;
  const recorded: DetailRow[] = [{ label: t('workouts.detail.totalBurned'), value: kcal(total, t) }];
  if (sourceResting != null) {
    recorded.push({ label: t('workouts.detail.restingTheirs'), value: `−${kcal(sourceResting, t)}` });
    recorded.push({ label: t('workouts.detail.active'), value: kcal(Math.max(0, total - sourceResting), t), strong: true });
  }

  const relish: DetailRow[] = [{ label: t('workouts.detail.totalBurned'), value: kcal(total, t) }];
  if (entry.relish_resting_calories != null) {
    relish.push({ label: t('workouts.detail.restingYourBmr'), value: `−${kcal(entry.relish_resting_calories, t)}` });
  } else if (sourceResting != null) {
    relish.push({ label: t('workouts.detail.restingSource', { source: sourceLabel }), value: `−${kcal(sourceResting, t)}` });
  }
  relish.push({ label: t('workouts.detail.activeCounted'), value: kcal(entry.calories_burned, t), strong: true });
  relish.push(addedRow);

  const notes: string[] = [];
  const sourceActive = sourceResting != null ? Math.max(0, total - sourceResting) : null;
  const resting = entry.relish_resting_calories ?? sourceResting ?? 0;
  const imported = Math.max(0, total - resting);
  if (Math.abs(imported - entry.calories_burned) > 1) {
    notes.push(t('workouts.detail.editedNote'));
  } else if (sourceActive !== null && entry.relish_resting_calories != null && sourceActive !== entry.calories_burned) {
    const difference = entry.calories_burned - sourceActive;
    notes.push(
      t(difference > 0 ? 'workouts.detail.countsMore' : 'workouts.detail.countsLess', {
        value: kcal(Math.abs(difference), t),
        source: sourceLabel
      })
    );
  }
  if (sharePercent < 100) {
    notes.push(sharePercent > 0 ? t('workouts.detail.shareOnly', { percent: sharePercent }) : t('workouts.detail.shareNone'));
  }
  notes.push(t('workouts.detail.keptAsRecorded', { source: sourceLabel }));

  return { title: entry.title, subtitle: facts.join(' · '), sourceLabel, recorded, relish, notes };
}
