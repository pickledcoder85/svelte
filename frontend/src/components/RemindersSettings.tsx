/**
 * Settings → Water reminders: turn notifications on for this phone (iOS asks permission on the
 * tap), pick the times (hourly, in your time zone), and send a test. The server sends each
 * reminder through Apple's push service, and skips it when the day's water goal is already met.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
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
  const t = useT();
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
          setError(loadError instanceof Error ? loadError.message : t('reminders.loadError'));
        }
      });
    return () => {
      cancelled = true;
    };
    // Reload only for a new session, not when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(actionError instanceof Error ? actionError.message : t('reminders.genericError'));
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
        setError(t('reminders.permissionOff'));
        return;
      }
      let next = await savePushSubscription(subscription, accessToken);
      if (next.water_times.length === 0) {
        next = await setWaterReminderTimes(DEFAULT_WATER_TIMES, accessToken);
      }
      setStatus(next);
      setPhoneSubscribed(true);
      setMessage(t('reminders.on', { times: next.water_times.map((time) => timeLabel(time, t)).join(t('reminders.and')) }));
    });

  const turnOff = () =>
    run(async () => {
      const endpoint = await unsubscribeThisPhone();
      setStatus(endpoint ? await removePushSubscription(endpoint, accessToken) : await fetchNotificationStatus(accessToken));
      setPhoneSubscribed(false);
      setMessage(t('reminders.off'));
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
      setMessage(t('reminders.testSent'));
    });

  if (!status) {
    return <Text style={styles.hint}>{error ?? t('common.loading')}</Text>;
  }
  if (!status.configured) {
    return <Text style={styles.hint}>{t('reminders.notConfigured')}</Text>;
  }
  if (!supported) {
    return (
      <Text style={styles.hint}>{t('reminders.needsHomeScreen')}</Text>
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
          {phoneSubscribed ? t('reminders.turnOff') : t('reminders.turnOn')}
        </Text>
      </Pressable>
      {phoneSubscribed ? (
        <>
          <Text style={styles.label}>{t('reminders.remindAt')}</Text>
          <View style={styles.chips} accessibilityLabel={t('reminders.timesA11y')}>
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
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{timeLabel(time, t)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {status.water_times.length
              ? t('reminders.inTimeZone')
              : t('reminders.noTimes')}
          </Text>
          <Pressable onPress={() => void test()} disabled={busy} accessibilityRole="button">
            <Text style={styles.link}>{t('reminders.sendTest')}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.hint}>{t('reminders.iosAsks')}</Text>
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
