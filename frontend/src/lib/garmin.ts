/** Garmin sync status in plain words, and when the app should sync on its own. */
import { translatorFor } from '../i18n/dictionaries';
import type { TFunction } from '../i18n/translate';
import type { GarminStatus } from '../types';

const ENGLISH = translatorFor('en');

/** Opening the app syncs when the last good sync is older than this. */
export const GARMIN_STALE_MINUTES = 15;

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) {
    return null;
  }
  const at = Date.parse(iso);
  return Number.isNaN(at) ? null : Math.max(0, (now.getTime() - at) / 60000);
}

/** Sync on open when the last attempt (good or failed) is 15+ minutes old: a failing sync
 * isn't retried on every resume. */
export function garminSyncIsStale(status: GarminStatus | null, now: Date): boolean {
  if (!status?.configured) {
    return false;
  }
  const success = minutesSince(status.last_success_at, now);
  const attempt = minutesSince(status.last_attempt_at, now);
  const latest = [success, attempt].filter((value): value is number => value !== null);
  return latest.length === 0 || Math.min(...latest) >= GARMIN_STALE_MINUTES;
}

export function agoText(minutes: number, t: TFunction = ENGLISH): string {
  if (minutes < 1) {
    return t('garmin.justNow');
  }
  if (minutes < 60) {
    return t('garmin.minutesAgo', { count: Math.floor(minutes) });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('garmin.hoursAgo', { count: hours });
  }
  const days = Math.floor(hours / 24);
  return t('garmin.daysAgo', { count: days });
}

/** The Garmin line in Settings; the server's own error text is shown as it comes. */
export function garminStatusText(status: GarminStatus | null, now: Date, t: TFunction = ENGLISH): string {
  if (!status) {
    return t('garmin.checking');
  }
  if (!status.configured) {
    return t('garmin.notConnected');
  }
  const success = minutesSince(status.last_success_at, now);
  if (status.last_status === 'error') {
    const when = success === null ? t('garmin.neverSynced') : t('garmin.lastSynced', { ago: agoText(success, t) });
    return t('garmin.failed', { error: status.last_error ?? t('garmin.unknownError'), when });
  }
  if (success === null) {
    return t('garmin.notYet');
  }
  return t('garmin.lastSynced', { ago: agoText(success, t) });
}

export function workoutSourceLabel(source: string | null | undefined): string | null {
  return source === 'garmin' ? 'Garmin' : null;
}
