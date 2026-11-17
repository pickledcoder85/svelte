/**
 * Reminder notifications in the installed app: asking permission, subscribing this phone to Web
 * Push with the server's public key, and the reminder times offered. iPhone needs the app added
 * to the home screen (iOS 16.4+) and the permission asked from a tap.
 */

import { formatDate, type TFunction } from '../i18n/translate';

/** Hourly times offered for water reminders (24-hour "HH:MM", what the server stores). */
export const REMINDER_TIME_OPTIONS = Array.from({ length: 15 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`);
export const DEFAULT_WATER_TIMES = ['10:00', '15:00'];

/** "10 AM", "3 PM", "12 PM". */
export function timeLabel(time: string, t?: TFunction): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (t && t.language !== 'en') {
    // "3 p. m.", "3:30 p. m." in the display language.
    return formatDate(new Date(2026, 0, 1, hours, minutes || 0), minutes ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' }, t.locale);
  }
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return minutes ? `${hour}:${String(minutes).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/** The server's VAPID public key (base64url) as the bytes pushManager.subscribe wants. */
export function applicationServerKey(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Ask permission (call from a tap) and subscribe this phone; null when refused. */
export async function subscribeThisPhone(publicKey: string): Promise<PushSubscriptionBody | null> {
  if (!pushSupported()) {
    return null;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const key = applicationServerKey(publicKey);
  let existing = await registration.pushManager.getSubscription();
  if (existing && !sameKey(existing.options?.applicationServerKey ?? null, key)) {
    // Made with an older server key: pushes to it would be refused, so start over.
    await existing.unsubscribe();
    existing = null;
  }
  const subscription = existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

export function sameKey(current: ArrayBuffer | null, wanted: Uint8Array): boolean {
  if (!current) {
    return false;
  }
  const bytes = new Uint8Array(current);
  return bytes.length === wanted.length && bytes.every((byte, index) => byte === wanted[index]);
}

/** This phone's push subscription endpoint, or null when it has none. */
export async function thisPhoneEndpoint(): Promise<string | null> {
  if (!pushSupported()) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription())?.endpoint ?? null;
}

/** Unsubscribe this phone; returns its endpoint (to tell the server), or null. */
export async function unsubscribeThisPhone(): Promise<string | null> {
  if (!pushSupported()) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
