import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { useT } from '../i18n';
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
  const t = useT();
  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>{t('workoutPlan.eyebrow')}</Text>
        <Text style={styles.panelTitle}>{t('workoutPlan.title')}</Text>
        <Text style={styles.panelDetail}>{t('workoutPlan.detail')}</Text>

        <View style={styles.inlinePillRow}>
          <Text style={styles.inlinePillText}>{t('workoutPlan.planningFor', { date: formatHomeDateLabel(selectedHomeDate, todayKey, t) })}</Text>
        </View>

        {plannedExerciseEditingId ? (
          <View style={styles.searchRow}>
            <View style={styles.inlinePillRow}>
              <Text style={styles.inlinePillText}>{t('workoutPlan.editing')}</Text>
            </View>
            <Pressable style={styles.inlinePillButton} onPress={resetPlannedExerciseDrafts}>
              <Text style={styles.inlinePillButtonLabel}>{t('workoutPlan.cancelEdit')}</Text>
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
                <Text style={styles.exercisePresetLabel}>{t(`workoutPlan.presets.${preset.id}`)}</Text>
                <Text style={styles.exercisePresetMeta}>
                  {t('workoutPlan.presetMeta', { minutes: preset.minutes, calories: preset.calories })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={plannedExerciseTitleDraft}
            onChangeText={setPlannedExerciseTitleDraft}
            placeholder={t('workoutPlan.titlePlaceholder')}
            placeholderTextColor={tc.fg_7c8aa5}
            style={styles.searchInput}
            autoCorrect={false}
          />
          <Pressable style={styles.primaryButton} onPress={() => void addPlannedExerciseEntry()}>
            <Text style={styles.primaryButtonLabel}>
              {plannedExerciseSaving ? t('workoutPlan.saving') : plannedExerciseEditingId ? t('workoutPlan.update') : t('workoutPlan.plan')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={plannedExerciseMinutesDraft}
            onChangeText={setPlannedExerciseMinutesDraft}
            placeholder={t('workoutPlan.minutesPlaceholder')}
            placeholderTextColor={tc.fg_7c8aa5}
            style={styles.searchInput}
            keyboardType="numeric"
            autoCorrect={false}
          />
          <View style={styles.metricTileCompact}>
            <Text style={styles.metricLabel}>{t('workoutPlan.estimatedBurn')}</Text>
            <Text style={styles.metricValue}>{t('common.kcal', { value: estimatedPlannedExerciseCalories })}</Text>
          </View>
        </View>

        <View style={styles.listActionRow}>
          <Pressable
            style={[styles.inlinePillButton, plannedExerciseWarmupEnabled ? styles.inlinePillButtonComplete : null]}
            onPress={() => setPlannedExerciseWarmupEnabled((current) => !current)}
          >
            <Text style={[styles.inlinePillButtonLabel, plannedExerciseWarmupEnabled ? styles.inlinePillButtonLabelComplete : null]}>
              {plannedExerciseWarmupEnabled ? t('workoutPlan.removeWarmup') : t('workoutPlan.addWarmup')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.inlinePillButton, plannedExerciseCooldownEnabled ? styles.inlinePillButtonComplete : null]}
            onPress={() => setPlannedExerciseCooldownEnabled((current) => !current)}
          >
            <Text style={[styles.inlinePillButtonLabel, plannedExerciseCooldownEnabled ? styles.inlinePillButtonLabelComplete : null]}>
              {plannedExerciseCooldownEnabled ? t('workoutPlan.removeCooldown') : t('workoutPlan.addCooldown')}
            </Text>
          </Pressable>
        </View>

        {plannedExerciseWarmupEnabled ? (
          <View style={styles.searchRow}>
            <TextInput
              value={plannedExerciseWarmupMinutesDraft}
              onChangeText={setPlannedExerciseWarmupMinutesDraft}
              placeholder={t('workoutPlan.warmupPlaceholder')}
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
              placeholder={t('workoutPlan.cooldownPlaceholder')}
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
          <MetricTile label={t('workoutPlan.minutes')} value={t('common.minutes', { minutes: plannedExerciseMinutesDraft })} compact />
          <MetricTile label={t('workoutPlan.estimatedBurn')} value={t('common.kcal', { value: estimatedPlannedExerciseCalories })} compact />
        </View>

        <View style={styles.foodList}>
          {plannedExerciseEntries.length > 0 ? (
            plannedExerciseEntries.map((entry) => (
              <View key={entry.id} style={styles.foodRow}>
                <View style={styles.foodRowCopy}>
                  <Text style={styles.listTitle}>{entry.title}</Text>
                  <Text style={styles.listCaption}>
                    {formatHomeDateLabel(entry.planned_on, todayKey, t)} · {t('common.minutes', { minutes: entry.duration_minutes })} ·{' '}
                    {t(`workoutPlan.intensity.${entry.intensity}`)} ·{' '}
                    {entry.completed_at ? t('workoutPlan.completed', { time: formatCompletionTimeLabel(entry.completed_at, t) }) : entry.planned_at}
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
                  <Text style={styles.listMetric}>{t('common.kcal', { value: entry.calories_burned })}</Text>
                  <View style={styles.listActionRow}>
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => beginPlannedExerciseEdit(entry)}
                      disabled={plannedExerciseDeletingId === entry.id || plannedExerciseUpdatingId === entry.id}
                    >
                      <Text style={styles.inlinePillButtonLabel}>{t('workoutPlan.edit')}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.inlinePillButton}
                      onPress={() => void removePlannedExerciseEntry(entry)}
                      disabled={plannedExerciseDeletingId === entry.id || plannedExerciseUpdatingId === entry.id}
                    >
                      <Text style={styles.inlinePillButtonLabel}>
                        {plannedExerciseDeletingId === entry.id ? t('workoutPlan.deleting') : t('workoutPlan.delete')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.inlinePillButton, entry.completed_at ? styles.inlinePillButtonComplete : null]}
                      onPress={() => void togglePlannedExerciseCompletion(entry)}
                      disabled={plannedExerciseUpdatingId === entry.id || plannedExerciseDeletingId === entry.id}
                    >
                      <Text style={[styles.inlinePillButtonLabel, entry.completed_at ? styles.inlinePillButtonLabelComplete : null]}>
                        {plannedExerciseUpdatingId === entry.id
                          ? t('workoutPlan.saving')
                          : entry.completed_at
                            ? t('workoutPlan.undo')
                            : t('workoutPlan.complete')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>{t('workoutPlan.emptyTitle')}</Text>
              <Text style={styles.detailSubtitle}>{t('workoutPlan.emptyHint')}</Text>
            </View>
          )}
        </View>
      </View>

    </>
  );
}
