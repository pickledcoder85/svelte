/**
 * Settings → Water reminders: turn notifications on for this phone (iOS asks permission on the
 * tap), pick the times (hourly, in your time zone), and send a test. The server sends each
 * reminder through Apple's push service, and skips it when the day's water goal is already met.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  fetchNotificationStatus,
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
  setWaterReminderTimes,
  type NotificationStatus
} from '../lib/api';
import {
  DEFAULT_WATER_TIMES,
  pushSupported,
  REMINDER_TIME_OPTIONS,
  subscribeThisPhone,
  thisPhoneEndpoint,
  timeLabel,
  unsubscribeThisPhone
} from '../lib/push-client';
import { tc } from '../theme/palette';

export function RemindersSettings({ accessToken }: { accessToken: string }) {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  // Whether *this phone* has a push subscription (the server's flag covers any device).
  const [phoneSubscribed, setPhoneSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supported = pushSupported();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchNotificationStatus(accessToken), thisPhoneEndpoint().catch(() => null)])
      .then(([result, endpoint]) => {
        if (!cancelled) {
          setStatus(result);
          setPhoneSubscribed(Boolean(endpoint) && result.subscribed);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load reminders.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function run(action: () => Promise<void>) {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const turnOn = () =>
    run(async () => {
      if (!status?.public_key) {
        return;
      }
      const subscription = await subscribeThisPhone(status.public_key);
      if (!subscription) {
        setError('Notifications are off for Relish. Turn them on in iPhone Settings → Notifications → Relish, then try again.');
        return;
      }
      let next = await savePushSubscription(subscription, accessToken);
      if (next.water_times.length === 0) {
        next = await setWaterReminderTimes(DEFAULT_WATER_TIMES, accessToken);
      }
      setStatus(next);
      setPhoneSubscribed(true);
      setMessage(`Reminders on: ${next.water_times.map(timeLabel).join(' and ')}.`);
    });

  const turnOff = () =>
    run(async () => {
      const endpoint = await unsubscribeThisPhone();
      setStatus(endpoint ? await removePushSubscription(endpoint, accessToken) : await fetchNotificationStatus(accessToken));
      setPhoneSubscribed(false);
      setMessage('Reminders off on this phone.');
    });

  const toggleTime = (time: string) =>
    run(async () => {
      const times = status?.water_times ?? [];
      const next = times.includes(time) ? times.filter((item) => item !== time) : [...times, time];
      setStatus(await setWaterReminderTimes(next, accessToken));
    });

  const test = () =>
    run(async () => {
      await sendTestNotification(accessToken);
      setMessage('Test sent: it should appear in a few seconds.');
    });

  if (!status) {
    return <Text style={styles.hint}>{error ?? 'Loading…'}</Text>;
  }
  if (!status.configured) {
    return <Text style={styles.hint}>Reminders aren’t set up on the server yet.</Text>;
  }
  if (!supported) {
    return (
      <Text style={styles.hint}>
        Notifications need Relish added to the Home Screen (Share → Add to Home Screen) and opened from there.
      </Text>
    );
  }

  return (
    <View style={styles.block}>
      <Pressable
        style={[phoneSubscribed ? styles.secondary : styles.primary, busy && styles.disabled]}
        onPress={() => void (phoneSubscribed ? turnOff() : turnOn())}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={phoneSubscribed ? styles.secondaryLabel : styles.primaryLabel}>
          {phoneSubscribed ? 'Turn off water reminders' : '💧 Turn on water reminders'}
        </Text>
      </Pressable>
      {phoneSubscribed ? (
        <>
          <Text style={styles.label}>Remind me at</Text>
          <View style={styles.chips} accessibilityLabel="Reminder times">
            {REMINDER_TIME_OPTIONS.map((time) => {
              const active = status.water_times.includes(time);
              return (
                <Pressable
                  key={time}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => void toggleTime(time)}
                  disabled={busy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{timeLabel(time)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {status.water_times.length
              ? 'In your time zone. A reminder is skipped once you’ve reached the day’s water goal.'
              : 'No times picked: no reminders will be sent.'}
          </Text>
          <Pressable onPress={() => void test()} disabled={busy} accessibilityRole="button">
            <Text style={styles.link}>Send a test notification</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.hint}>iOS asks once whether Relish may send notifications.</Text>
      )}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  label: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  chipActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  chipLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: tc.fg_ffffff },
  hint: { color: tc.fg_5c6d80, fontSize: 13, lineHeight: 18 },
  link: { color: tc.fg_0f766e, fontSize: 14, fontWeight: '700', paddingVertical: 2 },
  message: { color: tc.fg_0f766e, fontSize: 14 },
  error: { color: tc.fg_b42318, fontSize: 14 },
  primary: { alignItems: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7 },
  secondaryLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
