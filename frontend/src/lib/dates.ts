/**
 * Calendar-day keys (YYYY-MM-DD) in the device's local time zone.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date, which in US time zones flips to
 * "tomorrow" in the afternoon or evening. Use these helpers for every day key; keep ISO
 * timestamps only for instants (eaten_at, completed_at, created_at).
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses YYYY-MM-DD as local midnight; returns null for anything else. */
export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDaysToDateKey(key: string, days: number): string {
  const date = parseDateKey(key);
  if (!date) {
    return key;
  }
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** The local calendar day an ISO timestamp falls on (for grouping by day). */
export function localDateKeyForTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp.slice(0, 10) : localDateKey(date);
}
