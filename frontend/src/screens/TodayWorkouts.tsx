import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useT } from '../i18n';
import { workoutSourceLabel } from '../lib/garmin';
import type { ExerciseEntry, PlannedExerciseEntry } from '../types';
import { styles } from './shared/styles';
import { formatStoredClock } from '../lib/app-format';

export interface TodayWorkoutsProps {
  setOpenSheet: (sheet: 'add-workout') => void;
  homeOpenPlannedWorkouts: PlannedExerciseEntry[];
  homeCompletedExerciseEntries: ExerciseEntry[];
  selectedHomeDate: string;
  todayKey: string;
  togglePlannedExerciseCompletion: (entry: PlannedExerciseEntry) => Promise<void>;
  plannedExerciseUpdatingId: string | null;
  confirmDeleteKey: string | null;
  setConfirmDeleteKey: Dispatch<SetStateAction<string | null>>;
  removePlannedExerciseEntry: (entry: PlannedExerciseEntry) => Promise<void>;
  setWorkoutDetailId: Dispatch<SetStateAction<string | null>>;
  removeExerciseEntry: (entry: ExerciseEntry) => Promise<void>;
  entryActionBusyKey: string | null;
}

export function TodayWorkouts({
  setOpenSheet,
  homeOpenPlannedWorkouts,
  homeCompletedExerciseEntries,
  selectedHomeDate,
  todayKey,
  togglePlannedExerciseCompletion,
  plannedExerciseUpdatingId,
  confirmDeleteKey,
  setConfirmDeleteKey,
  removePlannedExerciseEntry,
  setWorkoutDetailId,
  removeExerciseEntry,
  entryActionBusyKey
}: TodayWorkoutsProps): ReactElement {
  const t = useT();
  return (
    <View style={styles.homeSection}>
      <View style={styles.todaySectionHeader}>
        <Text style={styles.detailTitle}>{t('workouts.title')}</Text>
        <Pressable
          style={styles.todayAddButton}
          onPress={() => setOpenSheet('add-workout')}
          accessibilityRole="button"
          accessibilityLabel={t('workouts.add')}
        >
          <Text style={styles.todayAddButtonLabel}>+</Text>
        </Pressable>
      </View>
      {homeOpenPlannedWorkouts.length === 0 && homeCompletedExerciseEntries.length === 0 ? (
        <View style={styles.todayEmpty}>
          <Text style={styles.dailyHomeEmptyState}>
            {selectedHomeDate === todayKey ? t('workouts.emptyToday') : t('workouts.emptyDay')}
          </Text>
          <Text style={styles.todayHint}>{t('workouts.emptyHint')}</Text>
        </View>
      ) : null}
      {homeOpenPlannedWorkouts.map((entry) => {
        const deleteKey = `planned:${entry.id}`;
        return (
          <View key={entry.id} style={styles.todayRow}>
            <View style={styles.listRowCopyFlex}>
              <Text style={styles.todayRowTag}>{t('workouts.planned')}</Text>
              <Text style={styles.listTitle}>{entry.title}</Text>
              <Text style={styles.listCaption}>
                {formatStoredClock(entry.planned_at, t.locale)} · {t('common.minutes', { minutes: entry.duration_minutes })} ·{' '}
                {t('common.kcal', { value: entry.calories_burned })}
              </Text>
            </View>
            <Pressable
              style={styles.inlinePillButton}
              onPress={() => void togglePlannedExerciseCompletion(entry)}
              disabled={plannedExerciseUpdatingId === entry.id}
              accessibilityRole="button"
              accessibilityLabel={t('workouts.markDone', { name: entry.title })}
            >
              <Text style={styles.inlinePillButtonLabel}>
                {plannedExerciseUpdatingId === entry.id ? t('common.saving') : t('workouts.done')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
              onPress={() => {
                if (confirmDeleteKey === deleteKey) {
                  setConfirmDeleteKey(null);
                  void removePlannedExerciseEntry(entry);
                } else {
                  setConfirmDeleteKey(deleteKey);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={
                confirmDeleteKey === deleteKey ? t('common.confirmSkipItem', { name: entry.title }) : t('common.skipItem', { name: entry.title })
              }
            >
              <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                {confirmDeleteKey === deleteKey ? t('common.skipConfirm') : '✕'}
              </Text>
            </Pressable>
          </View>
        );
      })}
      {homeCompletedExerciseEntries.map((entry) => {
        const deleteKey = `exercise:${entry.id}`;
        return (
          <View key={entry.id} style={styles.todayRow}>
            <Pressable
              style={styles.todayRowMain}
              onPress={() => setWorkoutDetailId(entry.id)}
              accessibilityRole="button"
              accessibilityLabel={t('workouts.showDetail', { name: entry.title })}
            >
              <View style={styles.listRowCopyFlex}>
                <Text style={styles.listTitle}>{entry.title}</Text>
                <Text style={styles.listCaption}>
                  {formatStoredClock(entry.logged_at, t.locale)} · {t('common.minutes', { minutes: entry.duration_minutes })}
                  {workoutSourceLabel(entry.source) ? ` · ${workoutSourceLabel(entry.source)}` : ''}
                </Text>
              </View>
              <Text style={styles.listMetric}>{t('common.kcal', { value: entry.calories_burned })} ›</Text>
            </Pressable>
            <Pressable
              style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
              onPress={() => void removeExerciseEntry(entry)}
              disabled={entryActionBusyKey === deleteKey}
              accessibilityRole="button"
              accessibilityLabel={
                confirmDeleteKey === deleteKey ? t('common.confirmDeleteItem', { name: entry.title }) : t('common.deleteItem', { name: entry.title })
              }
            >
              <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                {confirmDeleteKey === deleteKey ? t('common.deleteConfirm') : '✕'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
