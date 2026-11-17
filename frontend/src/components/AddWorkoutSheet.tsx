/**
 * Add a workout by hand (Today → Workouts ＋): activity, duration on a wheel, effort, and an
 * optional distance (it sets the pace). Relish shows its calorie estimate as you choose
 * ((MET − 1) × weight × hours, from the server), or you enter what your watch says and Relish
 * takes off its own resting calories for those minutes.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatNumber, useT } from '../i18n';
import {
  activityLabel,
  clockLabel,
  DEFAULT_DURATION_INDEX,
  distanceMeters,
  DURATION_MINUTES,
  durationLabel,
  effortHint,
  effortLabel,
  watchCalories,
  WORKOUT_ACTIVITIES,
  WORKOUT_EFFORTS
} from '../lib/add-workout';
import { addManualWorkout, estimateWorkout } from '../lib/api';
import { addToDayLabel } from '../lib/meal-slots';
import { tc } from '../theme/palette';
import type { WorkoutActivity, WorkoutEffort, WorkoutEstimate } from '../types';
import { WheelPicker } from './WheelPicker';


export function AddWorkoutSheet({
  accessToken,
  logDate,
  dayName,
  metric,
  onAdded,
  onClose
}: {
  accessToken: string;
  logDate: string;
  /** "today" or a weekday name, for the button. */
  dayName: string;
  /** Distances in km instead of miles. */
  metric: boolean;
  onAdded(): void;
  onClose(): void;
}) {
  const t = useT();
  const durationColumn = {
    key: 'minutes',
    values: DURATION_MINUTES,
    labels: DURATION_MINUTES.map(String),
    unit: 'min',
    accessibilityLabel: t('workouts.sheet.durationA11y')
  };
  const [activity, setActivity] = useState<WorkoutActivity>('walk');
  const [name, setName] = useState('');
  const [durationIndex, setDurationIndex] = useState(DEFAULT_DURATION_INDEX);
  const [effort, setEffort] = useState<WorkoutEffort>('moderate');
  const [distance, setDistance] = useState('');
  const [useWatch, setUseWatch] = useState(false);
  const [watch, setWatch] = useState('');
  const [estimate, setEstimate] = useState<WorkoutEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const unit = metric ? 'km' : 'mi';
  const chosen = WORKOUT_ACTIVITIES.find((option) => option.id === activity)!;
  const minutes = DURATION_MINUTES[durationIndex];
  const meters = chosen.distance ? distanceMeters(distance, unit) : null;
  const watchTotal = useWatch ? watchCalories(watch) : null;

  // The estimate follows every choice, a moment after the last change.
  useEffect(() => {
    const id = ++requestId.current;
    setEstimating(true);
    const timer = setTimeout(() => {
      estimateWorkout(
        { activity, duration_minutes: minutes, effort, logged_on: logDate, ...(meters ? { distance_m: meters } : {}) },
        accessToken
      )
        .then((result) => {
          if (id === requestId.current) {
            setEstimate(result);
          }
        })
        .catch(() => {
          if (id === requestId.current) {
            setEstimate(null);
          }
        })
        .finally(() => {
          if (id === requestId.current) {
            setEstimating(false);
          }
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [activity, minutes, effort, meters, logDate, accessToken]);

  const canSave = !saving && (!useWatch || watchTotal !== null) && (activity !== 'other' || name.trim().length > 0);

  async function save() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addManualWorkout(
        {
          activity,
          duration_minutes: minutes,
          effort,
          logged_on: logDate,
          logged_at: clockLabel(),
          ...(meters ? { distance_m: meters } : {}),
          ...(activity === 'other' && name.trim() ? { title: name.trim() } : {}),
          ...(watchTotal !== null ? { device_calories_total: watchTotal } : {})
        },
        accessToken
      );
      onAdded();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('workouts.sheet.error'));
      setSaving(false);
    }
  }

  const kcal = (value: number) => formatNumber(value, undefined, t.locale);
  const basisText = estimate
    ? estimate.basis === 'pace'
      ? t('workouts.sheet.fromPace', { met: kcal(estimate.met) })
      : t('workouts.sheet.fromEffort', {
          effort: effortLabel(effort, t).toLowerCase(),
          activity: activityLabel(chosen.id, t).toLowerCase(),
          met: kcal(estimate.met)
        })
    : '';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('workouts.sheet.title')}</Text>

            <View style={styles.activities} accessibilityRole="radiogroup" accessibilityLabel={t('workouts.sheet.activity')}>
              {WORKOUT_ACTIVITIES.map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.activity, option.id === activity && styles.activityActive]}
                  onPress={() => setActivity(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: option.id === activity }}
                  accessibilityLabel={activityLabel(option.id, t)}
                >
                  <Text style={styles.activityIcon}>{option.icon}</Text>
                  <Text style={[styles.activityLabel, option.id === activity && styles.activityLabelActive]}>
                    {activityLabel(option.id, t)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {activity === 'other' ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('workouts.sheet.namePlaceholder')}
                placeholderTextColor={tc.fg_8a97a8}
                maxLength={60}
                accessibilityLabel={t('workouts.sheet.nameA11y')}
              />
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {t('workouts.sheet.howLong')} <Text style={styles.fieldValue}>{durationLabel(minutes, t)}</Text>
              </Text>
              <WheelPicker columns={[durationColumn]} indexes={[durationIndex]} onChange={(_, row) => setDurationIndex(row)} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('workouts.sheet.effort')}</Text>
              <View style={styles.efforts} accessibilityRole="radiogroup" accessibilityLabel={t('workouts.sheet.effort')}>
                {WORKOUT_EFFORTS.map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.effort, option === effort && styles.effortActive]}
                    onPress={() => setEffort(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: option === effort }}
                  >
                    <Text style={[styles.effortLabel, option === effort && styles.effortLabelActive]}>{effortLabel(option, t)}</Text>
                    <Text style={[styles.effortHint, option === effort && styles.effortHintActive]}>{effortHint(option, t)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {chosen.distance ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('workouts.sheet.distance')}</Text>
                <View style={styles.distanceRow}>
                  <TextInput
                    style={[styles.input, styles.distanceInput]}
                    value={distance}
                    onChangeText={(text) => setDistance(text.replace(/[^0-9.,]/g, ''))}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="0.0"
                    placeholderTextColor={tc.fg_8a97a8}
                    accessibilityLabel={unit === 'mi' ? t('workouts.sheet.distanceMiles') : t('workouts.sheet.distanceKm')}
                  />
                  <Text style={styles.unit}>{unit}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.estimate} accessibilityLiveRegion="polite">
              {useWatch ? (
                <>
                  <Text style={styles.estimateLabel}>{t('workouts.sheet.watchTotal')}</Text>
                  <View style={styles.distanceRow}>
                    <TextInput
                      style={[styles.input, styles.distanceInput]}
                      value={watch}
                      onChangeText={(text) => setWatch(text.replace(/[^0-9,]/g, ''))}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      placeholder="0"
                      placeholderTextColor={tc.fg_8a97a8}
                      autoFocus
                      accessibilityLabel={t('workouts.sheet.watchA11y')}
                    />
                    <Text style={styles.unit}>kcal</Text>
                  </View>
                  <Text style={styles.estimateNote}>
                    {t('workouts.sheet.watchNote')}
                    {estimate ? t('workouts.sheet.ownEstimate', { value: kcal(estimate.active_calories) }) : ''}
                  </Text>
                  <Pressable onPress={() => setUseWatch(false)} accessibilityRole="button">
                    <Text style={styles.link}>{t('workouts.sheet.useEstimate')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.estimateValue}>
                    {estimate
                      ? t('workouts.sheet.estimate', { value: kcal(estimate.active_calories) })
                      : estimating
                        ? t('workouts.sheet.estimating')
                        : '—'}
                  </Text>
                  {estimate ? (
                    <Text style={styles.estimateNote}>
                      {basisText}
                      {estimate.weight_known
                        ? t('workouts.sheet.atWeight', {
                            weight: metric ? `${Math.round(estimate.weight_lbs * 0.45359237)} kg` : `${Math.round(estimate.weight_lbs)} lb`
                          })
                        : t('workouts.sheet.typicalWeight')}
                    </Text>
                  ) : null}
                  <Pressable onPress={() => setUseWatch(true)} accessibilityRole="button">
                    <Text style={styles.link}>{t('workouts.sheet.myWatch')}</Text>
                  </Pressable>
                </>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.primary, !canSave && styles.disabled]}
              onPress={() => void save()}
              disabled={!canSave}
              accessibilityRole="button"
            >
              <Text style={styles.primaryLabel}>{saving ? t('common.adding') : addToDayLabel(dayName, t)}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
              <Text style={styles.secondaryLabel}>{t('common.cancel')}</Text>
            </Pressable>
          </ScrollView>
          <div style={{ height: 'max(12px, env(safe-area-inset-bottom))' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: tc.backdrop },
  sheet: {
    backgroundColor: tc.bg_ffffff,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '92%'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 16 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  activities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activity: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.line_d7dee7
  },
  activityActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  activityIcon: { fontSize: 26 },
  activityLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '700' },
  activityLabelActive: { color: tc.fg_ffffff },
  field: { gap: 8 },
  fieldLabel: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700' },
  fieldValue: { color: tc.fg_132536 },
  efforts: { flexDirection: 'row', gap: 8 },
  effort: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7, gap: 2 },
  effortActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  effortLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  effortLabelActive: { color: tc.fg_ffffff },
  effortHint: { color: tc.fg_7a8797, fontSize: 11 },
  effortHintActive: { color: tc.fg_ffffff, opacity: 0.8 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    fontSize: 16,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distanceInput: { width: 120 },
  unit: { color: tc.fg_5c6d80, fontSize: 15, fontWeight: '600' },
  estimate: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: tc.bg_f3f6fb },
  estimateLabel: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700' },
  estimateValue: { color: tc.fg_132536, fontSize: 22, fontWeight: '800' },
  estimateNote: { color: tc.fg_5c6d80, fontSize: 13, lineHeight: 18 },
  link: { color: tc.fg_0f766e, fontSize: 14, fontWeight: '700', paddingVertical: 2 },
  error: { color: tc.fg_b42318, fontSize: 14 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
