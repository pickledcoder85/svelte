/** Garmin sync status in plain words, and when the app should sync on its own. */
import type { GarminStatus } from '../types';

/** Opening the app syncs when the last good sync is older than this. */
export const GARMIN_STALE_MINUTES = 15;

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) {
    return null;
  }
  const at = Date.parse(iso);
  return Number.isNaN(at) ? null : Math.max(0, (now.getTime() - at) / 60000);
}

export function garminSyncIsStale(status: GarminStatus | null, now: Date): boolean {
  if (!status?.configured) {
    return false;
  }
  const minutes = minutesSince(status.last_success_at, now);
  return minutes === null || minutes >= GARMIN_STALE_MINUTES;
}

export function agoText(minutes: number): string {
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${Math.floor(minutes)} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function garminStatusText(status: GarminStatus | null, now: Date): string {
  if (!status) {
    return 'Checking…';
  }
  if (!status.configured) {
    return 'Not connected. Add a Garmin personal API key on the server to turn it on.';
  }
  const success = minutesSince(status.last_success_at, now);
  if (status.last_status === 'error') {
    const when = success === null ? 'Never synced.' : `Last synced ${agoText(success)}.`;
    return `Sync failed: ${status.last_error ?? 'unknown error'} ${when}`;
  }
  if (success === null) {
    return 'Not synced yet.';
  }
  return `Last synced ${agoText(success)}.`;
}

export function workoutSourceLabel(source: string | null | undefined): string | null {
  return source === 'garmin' ? 'Garmin' : null;
}
