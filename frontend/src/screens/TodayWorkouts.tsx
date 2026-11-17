import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { workoutSourceLabel } from '../lib/garmin';
import type { ExerciseEntry, PlannedExerciseEntry } from '../types';
import { styles } from './shared/styles';

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
  return (
    <View style={styles.homeSection}>
      <View style={styles.todaySectionHeader}>
        <Text style={styles.detailTitle}>Workouts</Text>
        <Pressable
          style={styles.todayAddButton}
          onPress={() => setOpenSheet('add-workout')}
          accessibilityRole="button"
          accessibilityLabel="Add a workout"
        >
          <Text style={styles.todayAddButtonLabel}>+</Text>
        </Pressable>
      </View>
      {homeOpenPlannedWorkouts.length === 0 && homeCompletedExerciseEntries.length === 0 ? (
        <View style={styles.todayEmpty}>
          <Text style={styles.dailyHomeEmptyState}>No workouts {selectedHomeDate === todayKey ? 'today' : 'this day'}.</Text>
          <Text style={styles.todayHint}>Garmin workouts show up here on their own, or tap + to add one.</Text>
        </View>
      ) : null}
      {homeOpenPlannedWorkouts.map((entry) => {
        const deleteKey = `planned:${entry.id}`;
        return (
          <View key={entry.id} style={styles.todayRow}>
            <View style={styles.listRowCopyFlex}>
              <Text style={styles.todayRowTag}>Planned</Text>
              <Text style={styles.listTitle}>{entry.title}</Text>
              <Text style={styles.listCaption}>
                {entry.planned_at} · {entry.duration_minutes} min · {entry.calories_burned} kcal
              </Text>
            </View>
            <Pressable
              style={styles.inlinePillButton}
              onPress={() => void togglePlannedExerciseCompletion(entry)}
              disabled={plannedExerciseUpdatingId === entry.id}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${entry.title} done`}
            >
              <Text style={styles.inlinePillButtonLabel}>{plannedExerciseUpdatingId === entry.id ? 'Saving…' : '✓ Done'}</Text>
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
              accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm skipping ${entry.title}` : `Skip ${entry.title}`}
            >
              <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                {confirmDeleteKey === deleteKey ? 'Skip?' : '✕'}
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
              accessibilityLabel={`${entry.title}: show how its calories are counted`}
            >
              <View style={styles.listRowCopyFlex}>
                <Text style={styles.listTitle}>{entry.title}</Text>
                <Text style={styles.listCaption}>
                  {entry.logged_at} · {entry.duration_minutes} min
                  {workoutSourceLabel(entry.source) ? ` · ${workoutSourceLabel(entry.source)}` : ''}
                </Text>
              </View>
              <Text style={styles.listMetric}>{entry.calories_burned} kcal ›</Text>
            </Pressable>
            <Pressable
              style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
              onPress={() => void removeExerciseEntry(entry)}
              disabled={entryActionBusyKey === deleteKey}
              accessibilityRole="button"
              accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm deleting ${entry.title}` : `Delete ${entry.title}`}
            >
              <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                {confirmDeleteKey === deleteKey ? 'Delete?' : '✕'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
