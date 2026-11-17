import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { formatCompletionTimeLabel, formatHomeDateLabel } from '../lib/app-format';
import { defaultCooldownTitle, defaultWarmupTitle } from '../lib/planned-workouts';
import { tc } from '../theme/palette';
import type { PlannedExerciseEntry, PlannedWorkoutSession } from '../types';
import { exercisePresets } from './shared/constants';
import { styles } from './shared/styles';

export interface WorkoutPlanScreenProps {
  selectedHomeDate: string;
  todayKey: string;
  plannedExerciseEditingId: string | null;
  activePlannedExercisePreset: (typeof exercisePresets)[number];
  plannedExerciseTitleDraft: string;
  setPlannedExerciseTitleDraft: Dispatch<SetStateAction<string>>;
  plannedExerciseMinutesDraft: string;
  setPlannedExerciseMinutesDraft: Dispatch<SetStateAction<string>>;
  plannedExerciseSaving: boolean;
  estimatedPlannedExerciseCalories: number;
  plannedExerciseWarmupEnabled: boolean;
  setPlannedExerciseWarmupEnabled: Dispatch<SetStateAction<boolean>>;
  plannedExerciseCooldownEnabled: boolean;
  setPlannedExerciseCooldownEnabled: Dispatch<SetStateAction<boolean>>;
  plannedExerciseWarmupMinutesDraft: string;
  setPlannedExerciseWarmupMinutesDraft: Dispatch<SetStateAction<string>>;
  plannedExerciseCooldownMinutesDraft: string;
  setPlannedExerciseCooldownMinutesDraft: Dispatch<SetStateAction<string>>;
  plannedExerciseEntries: PlannedExerciseEntry[];
  plannedWorkoutSessions: PlannedWorkoutSession[];
  plannedExerciseDeletingId: string | null;
  plannedExerciseUpdatingId: string | null;
  resetPlannedExerciseDrafts: () => void;
  addPlannedExerciseEntry: () => Promise<void>;
  beginPlannedExerciseEdit: (entry: PlannedExerciseEntry) => void;
  removePlannedExerciseEntry: (entry: PlannedExerciseEntry) => Promise<void>;
  togglePlannedExerciseCompletion: (entry: PlannedExerciseEntry) => Promise<void>;
}

export function WorkoutPlanScreen({
  selectedHomeDate,
  todayKey,
  plannedExerciseEditingId,
  activePlannedExercisePreset,
  plannedExerciseTitleDraft,
  setPlannedExerciseTitleDraft,
  plannedExerciseMinutesDraft,
  setPlannedExerciseMinutesDraft,
  plannedExerciseSaving,
  estimatedPlannedExerciseCalories,
  plannedExerciseWarmupEnabled,
  setPlannedExerciseWarmupEnabled,
  plannedExerciseCooldownEnabled,
  setPlannedExerciseCooldownEnabled,
  plannedExerciseWarmupMinutesDraft,
  setPlannedExerciseWarmupMinutesDraft,
  plannedExerciseCooldownMinutesDraft,
  setPlannedExerciseCooldownMinutesDraft,
  plannedExerciseEntries,
  plannedWorkoutSessions,
  plannedExerciseDeletingId,
  plannedExerciseUpdatingId,
  resetPlannedExerciseDrafts,
  addPlannedExerciseEntry,
  beginPlannedExerciseEdit,
  removePlannedExerciseEntry,
  togglePlannedExerciseCompletion
}: WorkoutPlanScreenProps): ReactElement {
  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Planned exercise</Text>
        <Text style={styles.panelTitle}>Plan a workout for the selected Home date</Text>
        <Text style={styles.panelDetail}>
          Save a future or same-day training session so Home can show planned movement separately from completed tracker logs.
        </Text>

        <View style={styles.inlinePillRow}>
          <Text style={styles.inlinePillText}>Planning for {formatHomeDateLabel(selectedHomeDate, todayKey)}</Text>
        </View>

        {plannedExerciseEditingId ? (
          <View style={styles.searchRow}>
            <View style={styles.inlinePillRow}>
              <Text style={styles.inlinePillText}>Editing planned session</Text>
            </View>
            <Pressable style={styles.inlinePillButton} onPress={resetPlannedExerciseDrafts}>
              <Text style={styles.inlinePillButtonLabel}>Cancel edit</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.exercisePresetGrid}>
          {exercisePresets.map((preset) => {
            const active = preset.id === activePlannedExercisePreset.id;
            return (
              <Pressable
                key={`planned-${preset.id}`}
                style={[styles.exercisePresetCard, active && styles.exercisePresetCardActive]}
                onPress={() => {
                  setPlannedExerciseTitleDraft(preset.title);
                  setPlannedExerciseMinutesDraft(preset.minutes);
                }}
              >
                <Image source={preset.image} style={styles.exercisePresetImage} resizeMode="contain" />
                <Text style={styles.exercisePresetLabel}>{preset.label}</Text>
                <Text style={styles.exercisePresetMeta}>
                  {preset.minutes} min · est. {preset.calories} kcal
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={plannedExerciseTitleDraft}
            onChangeText={setPlannedExerciseTitleDraft}
            placeholder="Swim, walk, lift..."
            placeholderTextColor={tc.fg_7c8aa5}
            style={styles.searchInput}
            autoCorrect={false}
          />
          <Pressable style={styles.primaryButton} onPress={() => void addPlannedExerciseEntry()}>
            <Text style={styles.primaryButtonLabel}>
              {plannedExerciseSaving ? 'Saving...' : plannedExerciseEditingId ? 'Update plan' : 'Plan exercise'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={plannedExerciseMinutesDraft}
            onChangeText={setPlannedExerciseMinutesDraft}
            placeholder="Main set minutes"
            placeholderTextColor={tc.fg_7c8aa5}
            style={styles.searchInput}
            keyboardType="numeric"
            autoCorrect={false}
          />
          <View style={styles.metricTileCompact}>
            <Text style={styles.metricLabel}>Estimated burn</Text>
            <Text style={styles.metricValue}>{estimatedPlannedExerciseCalories} kcal</Text>
          </View>
        </View>

        <View style={styles.listActionRow}>
          <Pressable
            style={[styles.inlinePillButton, plannedExerciseWarmupEnabled ? styles.inlinePillButtonComplete : null]}
            onPress={() => setPlannedExerciseWarmupEnabled((current) => !current)}
          >
            <Text style={[styles.inlinePillButtonLabel, plannedExerciseWarmupEnabled ? styles.inlinePillButtonLabelComplete : null]}>
              {plannedExerciseWarmupEnabled ? 'Remove warmup' : 'Add warmup'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.inlinePillButton, plannedExerciseCooldownEnabled ? styles.inlinePillButtonComplete : null]}
            onPress={() => setPlannedExerciseCooldownEnabled((current) => !current)}
          >
            <Text style={[styles.inlinePillButtonLabel, plannedExerciseCooldownEnabled ? styles.inlinePillButtonLabelComplete : null]}>
              {plannedExerciseCooldownEnabled ? 'Remove cooldown' : 'Add cooldown'}
            </Text>
          </Pressable>
        </View>

        {plannedExerciseWarmupEnabled ? (
          <View style={styles.searchRow}>
            <TextInput
              value={plannedExerciseWarmupMinutesDraft}
              onChangeText={setPlannedExerciseWarmupMinutesDraft}
              placeholder="Warmup minutes"
              placeholderTextColor={tc.fg_7c8aa5}
              style={styles.searchInput}
              keyboardType="numeric"
              autoCorrect={false}
            />
            <View style={styles.inlinePillRow}>
              <Text style={styles.inlinePillText}>{defaultWarmupTitle(activePlannedExercisePreset.id)}</Text>
            </View>
          </View>
        ) : null}

        {plannedExerciseCooldownEnabled ? (
          <View style={styles.searchRow}>
            <TextInput
              value={plannedExerciseCooldownMinutesDraft}
              onChangeText={setPlannedExerciseCooldownMinutesDraft}
              placeholder="Cooldown minutes"
              placeholderTextColor={tc.fg_7c8aa5}
              style={styles.searchInput}
              keyboardType="numeric"
              autoCorrect={false}
            />
            <View style={styles.inlinePillRow}>
              <Text style={styles.inlinePillText}>{defaultCooldownTitle(activePlannedExercisePreset.id)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.metricRow}>
          <MetricTile label="Minutes" value={`${plannedExerciseMinutesDraft} min`} compact />
          <MetricTile label="Estimated burn" value={`${estimatedPlannedExerciseCalories} kcal`} compact />
        </View>

        <View style={styles.foodList}>
          {plannedExerciseEntries.length > 0 ? (
            plannedExerciseEntries.map((entry) => (
              <View key={entry.id} style={styles.foodRow}>
                <View style={styles.foodRowCopy}>
                  <Text style={styles.listTitle}>{entry.title}</Text>
                  <Text style={styles.listCaption}>
                    {formatHomeDateLabel(entry.planned_on, todayKey)} · {entry.duration_minutes} min · {entry.intensity} · {entry.completed_at ? `Completed ${formatCompletionTimeLabel(entry.completed_at)}` : entry.planned_at}
                  </Text>
                  {plannedWorkoutSessions.find((session) => session.id === entry.id)?.blocks.length ? (
                    <Text style={styles.listCaption}>
                      {plannedWorkoutSessions
                        .find((session) => session.id === entry.id)
                        ?.blocks.map((block) => `${block.title}: ${block.segments.map((segment) => segment.title).join(', ')}`)
                        .join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.listRowActions}>
                  <Text style={styles.listMetric}>{entry.calories_burned} kcal</Text>
                  <View style={styles.listActionRow}>
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => beginPlannedExerciseEdit(entry)}
                      disabled={plannedExerciseDeletingId === entry.id || plannedExerciseUpdatingId === entry.id}
                    >
                      <Text style={styles.inlinePillButtonLabel}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => void removePlannedExerciseEntry(entry)}
                      disabled={plannedExerciseDeletingId === entry.id || plannedExerciseUpdatingId === entry.id}
                    >
                      <Text style={styles.inlinePillButtonLabel}>
                        {plannedExerciseDeletingId === entry.id ? 'Deleting...' : 'Delete'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.inlinePillButton, entry.completed_at ? styles.inlinePillButtonComplete : null]}
                      onPress={() => void togglePlannedExerciseCompletion(entry)}
                      disabled={plannedExerciseUpdatingId === entry.id || plannedExerciseDeletingId === entry.id}
                    >
                      <Text style={[styles.inlinePillButtonLabel, entry.completed_at ? styles.inlinePillButtonLabelComplete : null]}>
                        {plannedExerciseUpdatingId === entry.id
                          ? 'Saving...'
                          : entry.completed_at
                            ? 'Undo'
                            : 'Complete'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>No planned sessions yet</Text>
              <Text style={styles.detailSubtitle}>
                Add a workout above to populate Home with future planned exercise.
              </Text>
            </View>
          )}
        </View>
      </View>

    </>
  );
}
