/**
 * History below the charts: one row per day, newest first, with what was eaten against the
 * allowance and the day's workouts. Tap a day to open its meals (by meal) and exercise; ✕
 * deletes a food (tap twice to confirm), and a workout opens its detail.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { groupByMeal } from '../../lib/meal-slots';
import { historyDayLabel, type DayPoint } from '../../lib/trends';
import { tc } from '../../theme/palette';
import type { ExerciseEntry, FoodLogEntry, FoodLogSummary } from '../../types';

export function DayHistory({
  days,
  logs,
  exercise,
  today,
  onDeleteFood,
  onOpenWorkout
}: {
  /** Newest first. */
  days: DayPoint[];
  logs: FoodLogSummary[];
  exercise: ExerciseEntry[];
  today: string;
  onDeleteFood(log: FoodLogSummary, entry: FoodLogEntry): Promise<void>;
  onOpenWorkout(id: string): void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([today]));
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const byDate = new Map(logs.map((log) => [log.date, log]));

  const toggle = (date: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });

  return (
    <View style={styles.list}>
      {days.map((day) => {
        const log = byDate.get(day.date);
        const workouts = exercise.filter((entry) => entry.logged_on === day.date);
        const expanded = open.has(day.date);
        const share = day.allowance > 0 ? Math.min(1, day.eaten / day.allowance) : 0;
        const over = day.allowance > 0 && day.eaten > day.allowance * 1.1;
        const empty = !day.logged && workouts.length === 0;
        return (
          <View key={day.date} style={styles.day}>
            <Pressable
              style={styles.header}
              onPress={() => toggle(day.date)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${historyDayLabel(day.date, today)}: ${day.eaten} of ${day.allowance} kcal`}
            >
              <View style={styles.headerTop}>
                <Text style={styles.dayLabel}>{historyDayLabel(day.date, today)}</Text>
                <Text style={[styles.dayValue, over && styles.over]}>
                  {day.logged ? `${day.eaten.toLocaleString('en-US')} / ${day.allowance.toLocaleString('en-US')} kcal` : 'Nothing logged'}
                </Text>
                <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
              </View>
              {day.logged ? (
                <View style={styles.track}>
                  <View style={[styles.fill, over && styles.fillOver, { width: `${Math.round(share * 100)}%` }]} />
                </View>
              ) : null}
              {workouts.length > 0 || day.logged ? (
                <Text style={styles.meta}>
                  {[
                    day.logged ? `P ${day.macros.protein}g · C ${day.macros.carbs}g · F ${day.macros.fat}g` : null,
                    workouts.length > 0 ? `${workouts.length} workout${workouts.length === 1 ? '' : 's'} · ${day.workoutCalories} kcal` : null
                  ]
                    .filter(Boolean)
                    .join('   ')}
                </Text>
              ) : null}
            </Pressable>

            {expanded && !empty ? (
              <View style={styles.body}>
                {log
                  ? groupByMeal(log.entries).map((group) => (
                      <View key={group.slot} style={styles.group}>
                        <View style={styles.groupHeader}>
                          <Text style={styles.groupLabel}>{group.label}</Text>
                          <Text style={styles.groupLabel}>{group.calories.toLocaleString('en-US')} kcal</Text>
                        </View>
                        {group.entries.map((entry) => {
                          const key = `${day.date}:${entry.id}`;
                          return (
                            <View key={entry.id} style={styles.row}>
                              <Text style={styles.rowName} numberOfLines={2}>
                                {entry.food_name}
                              </Text>
                              <Text style={styles.rowValue}>{Math.round(entry.calories)}</Text>
                              <Pressable
                                style={[styles.remove, confirm === key && styles.removeConfirm]}
                                disabled={busy === key}
                                onPress={() => {
                                  if (confirm !== key) {
                                    setConfirm(key);
                                    return;
                                  }
                                  setConfirm(null);
                                  setBusy(key);
                                  void onDeleteFood(log, entry).finally(() => setBusy(null));
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={confirm === key ? `Confirm deleting ${entry.food_name}` : `Delete ${entry.food_name}`}
                              >
                                <Text style={[styles.removeLabel, confirm === key && styles.removeConfirmLabel]}>{confirm === key ? 'Delete?' : '✕'}</Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    ))
                  : null}
                {workouts.length > 0 ? (
                  <View style={styles.group}>
                    <Text style={styles.groupLabel}>Workouts</Text>
                    {workouts.map((entry) => (
                      <Pressable key={entry.id} style={styles.row} onPress={() => onOpenWorkout(entry.id)} accessibilityRole="button">
                        <Text style={styles.rowName} numberOfLines={1}>
                          {entry.title}
                          {entry.source === 'garmin' ? ' · Garmin' : ''}
                        </Text>
                        <Text style={styles.rowValue}>
                          {entry.duration_minutes} min · {entry.calories_burned} kcal ›
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  day: { borderRadius: 14, backgroundColor: tc.bg_f6f9fc, overflow: 'hidden' },
  header: { padding: 12, gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '800', flex: 1 },
  dayValue: { color: tc.fg_132536, fontSize: 14, fontWeight: '700' },
  over: { color: tc.fg_b45309 },
  chevron: { color: tc.fg_7a8797, fontSize: 13, width: 14, textAlign: 'right' },
  track: { height: 6, borderRadius: 999, backgroundColor: tc.bg_e2e8f0, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: tc.brand_primary },
  fillOver: { backgroundColor: tc.fg_f59e0b },
  meta: { color: tc.fg_6b7b90, fontSize: 12 },
  body: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  group: { gap: 2 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  groupLabel: { color: tc.fg_5c6d80, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.line_e2e8f0 },
  rowName: { color: tc.fg_132536, fontSize: 14, flex: 1 },
  rowValue: { color: tc.fg_132536, fontSize: 13, fontWeight: '700' },
  remove: { minWidth: 30, height: 30, paddingHorizontal: 6, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: tc.bg_eef2f6 },
  removeConfirm: { backgroundColor: tc.bg_fff4f0 },
  removeLabel: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '700' },
  removeConfirmLabel: { color: tc.fg_b42318 }
});
