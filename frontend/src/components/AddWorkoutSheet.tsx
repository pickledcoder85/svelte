/**
 * Add a workout by hand (Today → Workouts ＋): activity, duration on a wheel, effort, and an
 * optional distance (it sets the pace). Relish shows its calorie estimate as you choose
 * ((MET − 1) × weight × hours, from the server), or you enter what your watch says and Relish
 * takes off its own resting calories for those minutes.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  clockLabel,
  DEFAULT_DURATION_INDEX,
  distanceMeters,
  DURATION_MINUTES,
  durationLabel,
  watchCalories,
  WORKOUT_ACTIVITIES,
  WORKOUT_EFFORTS
} from '../lib/add-workout';
import { addManualWorkout, estimateWorkout } from '../lib/api';
import { tc } from '../theme/palette';
import type { WorkoutActivity, WorkoutEffort, WorkoutEstimate } from '../types';
import { WheelPicker } from './WheelPicker';

const DURATION_COLUMN = {
  key: 'minutes',
  values: DURATION_MINUTES,
  labels: DURATION_MINUTES.map(String),
  unit: 'min',
  accessibilityLabel: 'Duration in minutes'
};

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
      setError(saveError instanceof Error ? saveError.message : 'Unable to add the workout.');
      setSaving(false);
    }
  }

  const effortLabel = WORKOUT_EFFORTS.find((option) => option.id === effort)!.label.toLowerCase();
  const basisText = estimate
    ? estimate.basis === 'pace'
      ? `from your pace · MET ${estimate.met}`
      : `${effortLabel} ${chosen.label.toLowerCase()} · MET ${estimate.met}`
    : '';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Add a workout</Text>

            <View style={styles.activities} accessibilityRole="radiogroup" accessibilityLabel="Activity">
              {WORKOUT_ACTIVITIES.map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.activity, option.id === activity && styles.activityActive]}
                  onPress={() => setActivity(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: option.id === activity }}
                  accessibilityLabel={option.label}
                >
                  <Text style={styles.activityIcon}>{option.icon}</Text>
                  <Text style={[styles.activityLabel, option.id === activity && styles.activityLabelActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            {activity === 'other' ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="What was it? e.g. Pickleball"
                placeholderTextColor={tc.fg_8a97a8}
                maxLength={60}
                accessibilityLabel="Workout name"
              />
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                How long <Text style={styles.fieldValue}>{durationLabel(minutes)}</Text>
              </Text>
              <WheelPicker columns={[DURATION_COLUMN]} indexes={[durationIndex]} onChange={(_, row) => setDurationIndex(row)} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Effort</Text>
              <View style={styles.efforts} accessibilityRole="radiogroup" accessibilityLabel="Effort">
                {WORKOUT_EFFORTS.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[styles.effort, option.id === effort && styles.effortActive]}
                    onPress={() => setEffort(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: option.id === effort }}
                  >
                    <Text style={[styles.effortLabel, option.id === effort && styles.effortLabelActive]}>{option.label}</Text>
                    <Text style={[styles.effortHint, option.id === effort && styles.effortHintActive]}>{option.hint}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {chosen.distance ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Distance (optional, sets the pace)</Text>
                <View style={styles.distanceRow}>
                  <TextInput
                    style={[styles.input, styles.distanceInput]}
                    value={distance}
                    onChangeText={(text) => setDistance(text.replace(/[^0-9.,]/g, ''))}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="0.0"
                    placeholderTextColor={tc.fg_8a97a8}
                    accessibilityLabel={`Distance in ${unit === 'mi' ? 'miles' : 'kilometers'}`}
                  />
                  <Text style={styles.unit}>{unit}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.estimate} accessibilityLiveRegion="polite">
              {useWatch ? (
                <>
                  <Text style={styles.estimateLabel}>Your watch’s total</Text>
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
                      accessibilityLabel="Calories your watch says"
                    />
                    <Text style={styles.unit}>kcal</Text>
                  </View>
                  <Text style={styles.estimateNote}>
                    Relish takes off your resting calories for these minutes (your target already counts them).
                    {estimate ? ` Its own estimate: ≈ ${estimate.active_calories.toLocaleString('en-US')} kcal active.` : ''}
                  </Text>
                  <Pressable onPress={() => setUseWatch(false)} accessibilityRole="button">
                    <Text style={styles.link}>Use Relish’s estimate</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.estimateValue}>
                    {estimate ? `≈ ${estimate.active_calories.toLocaleString('en-US')} kcal active` : estimating ? 'Estimating…' : '—'}
                  </Text>
                  {estimate ? (
                    <Text style={styles.estimateNote}>
                      {basisText}
                      {estimate.weight_known
                        ? ` · at ${metric ? `${Math.round(estimate.weight_lbs * 0.45359237)} kg` : `${Math.round(estimate.weight_lbs)} lb`}`
                        : ' · using a typical weight (weigh in for a better estimate)'}
                    </Text>
                  ) : null}
                  <Pressable onPress={() => setUseWatch(true)} accessibilityRole="button">
                    <Text style={styles.link}>My watch says…</Text>
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
              <Text style={styles.primaryLabel}>{saving ? 'Adding…' : `Add to ${dayName}`}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
              <Text style={styles.secondaryLabel}>Cancel</Text>
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
