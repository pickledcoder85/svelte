import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalorieBars } from '../components/trends/CalorieBars';
import { DayHistory } from '../components/trends/DayHistory';
import { MacroBars } from '../components/trends/MacroBars';
import { WaterBars } from '../components/trends/WaterBars';
import { WeightTrendChart } from '../components/trends/WeightTrendChart';
import type { DailyTargetSummary } from '../lib/daily-home';
import {
  PROJECTION_HORIZONS,
  TREND_RANGES,
  type CalorieSummary,
  type DayPoint,
  type MacroDay,
  type MacroKey,
  type PaceStatus,
  type ProjectionHorizon,
  type TrendRange,
  type WeightPoint
} from '../lib/trends';
import { DEFAULT_WATER_GOAL_ML, type WaterDay } from '../lib/water';
import type { ExerciseEntry, FoodLogEntry, FoodLogSummary, UserProfile } from '../types';
import { styles } from './shared/styles';

export interface TrendsScreenProps {
  trendRange: TrendRange;
  setTrendRange: Dispatch<SetStateAction<TrendRange>>;
  trendsError: string | null;
  trendWeight: { latest: number | null; rate: number | null; toGoal: number | null };
  trendUnit: 'kg' | 'lb';
  trendWeightPoints: WeightPoint[];
  trendStart: string;
  todayKey: string;
  profile: UserProfile | null;
  trendProjection: {
    trendRate: number | null;
    paceRate: number | null;
    days: number;
    lines: string[];
    status: PaceStatus | null;
  };
  weightHorizon: ProjectionHorizon;
  setWeightHorizon: Dispatch<SetStateAction<ProjectionHorizon>>;
  trendCalories: CalorieSummary;
  trendDays: DayPoint[];
  trendMacroDays: Record<MacroKey, MacroDay[]>;
  dailyHomeTargets: DailyTargetSummary;
  trendWaterDays: WaterDay[];
  trendLogs: FoodLogSummary[];
  exerciseEntries: ExerciseEntry[];
  deleteTrendFood: (log: FoodLogSummary, entry: FoodLogEntry) => Promise<void>;
  setWorkoutDetailId: Dispatch<SetStateAction<string | null>>;
}

export function TrendsScreen({
  trendRange,
  setTrendRange,
  trendsError,
  trendWeight,
  trendUnit,
  trendWeightPoints,
  trendStart,
  todayKey,
  profile,
  trendProjection,
  weightHorizon,
  setWeightHorizon,
  trendCalories,
  trendDays,
  trendMacroDays,
  dailyHomeTargets,
  trendWaterDays,
  trendLogs,
  exerciseEntries,
  deleteTrendFood,
  setWorkoutDetailId
}: TrendsScreenProps): ReactElement {
  return (
    <View style={styles.dashboardStack}>
      <View style={styles.homeSection}>
        <View style={styles.todaySectionHeader}>
          <Text style={styles.detailTitle}>Trends</Text>
          <View style={styles.trendRangeRow} accessibilityRole="tablist">
            {TREND_RANGES.map((range) => (
              <Pressable
                key={range}
                style={[styles.trendRange, trendRange === range && styles.trendRangeActive]}
                onPress={() => setTrendRange(range)}
                accessibilityRole="tab"
                accessibilityState={{ selected: trendRange === range }}
              >
                <Text style={[styles.trendRangeLabel, trendRange === range && styles.trendRangeLabelActive]}>{range}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {trendsError ? <Text style={styles.settingsError}>{trendsError}</Text> : null}
      </View>

      {/* Weight: weigh-ins and the smoothed trend, with the goal. */}
      <View style={styles.homeSection}>
        <View style={styles.todaySectionHeader}>
          <Text style={styles.detailTitle}>Weight</Text>
          <Text style={styles.trendHeadline}>
            {trendWeight.latest !== null ? `${trendWeight.latest} ${trendUnit}` : '—'}
          </Text>
        </View>
        <Text style={styles.todayHint}>
          {[
            trendWeight.rate !== null
              ? `Trend ${trendWeight.rate > 0 ? '+' : trendWeight.rate < 0 ? '−' : '±'}${Math.abs(trendWeight.rate)} ${trendUnit} a week`
              : 'Weigh in a few more days to see your weekly trend',
            trendWeight.toGoal !== null ? `${trendWeight.toGoal} ${trendUnit} to goal` : null
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <WeightTrendChart
          points={trendWeightPoints}
          start={trendStart}
          end={todayKey}
          goal={profile?.target_weight_lbs ?? null}
          unit={trendUnit}
          toUnit={(lbs) => (trendUnit === 'kg' ? Math.round(lbs * 0.45359237 * 10) / 10 : lbs)}
          projection={{ days: trendProjection.days, trendRate: trendProjection.trendRate, paceRate: trendProjection.paceRate }}
        />
        <View style={styles.trendProjectionRow}>
          <Text style={styles.trendProjectionLabel}>Projection</Text>
          <View style={styles.trendRangeRow} accessibilityRole="tablist">
            {PROJECTION_HORIZONS.map((horizon) => (
              <Pressable
                key={horizon}
                style={[styles.trendRange, weightHorizon === horizon && styles.trendRangeActive]}
                onPress={() => setWeightHorizon(horizon)}
                accessibilityRole="tab"
                accessibilityState={{ selected: weightHorizon === horizon }}
                accessibilityLabel={`Project ${horizon.replace('M', '')} month${horizon === '1M' ? '' : 's'} ahead`}
              >
                <Text style={[styles.trendRangeLabel, weightHorizon === horizon && styles.trendRangeLabelActive]}>{horizon}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {trendProjection.lines.map((line, index) => (
          <Text
            key={line}
            style={[
              index === 0 ? styles.trendProjectionText : styles.trendPaceText,
              index > 0 && trendProjection.status === 'on' && styles.trendPaceGood,
              index > 0 && (trendProjection.status === 'behind' || trendProjection.status === 'drifting') && styles.trendPaceWarn
            ]}
          >
            {line}
          </Text>
        ))}
      </View>

      {/* Calories: each day against its allowance. */}
      <View style={styles.homeSection}>
        <View style={styles.todaySectionHeader}>
          <Text style={styles.detailTitle}>Calories</Text>
          <Text style={styles.trendHeadline}>
            {trendCalories.loggedDays > 0 ? `${trendCalories.averageEaten.toLocaleString('en-US')} avg` : '—'}
          </Text>
        </View>
        <Text style={styles.todayHint}>
          {trendCalories.loggedDays > 0
            ? `${trendCalories.loggedDays} of ${trendDays.length} days logged · allowance avg ${trendCalories.averageAllowance.toLocaleString('en-US')} · ${trendCalories.daysOnTarget} on target${trendCalories.daysOver ? ` · ${trendCalories.daysOver} over` : ''}`
            : 'Nothing logged in this range yet.'}
        </Text>
        <CalorieBars days={trendDays} />
      </View>

      {/* Macros: each day above or below its target. */}
      <View style={styles.homeSection}>
        <Text style={styles.detailTitle}>Macros</Text>
        <Text style={styles.todayHint}>Each day’s bar is its target (bigger on workout days), filled with what you ate. Tap a day for its grams and %.</Text>
        {(['protein', 'carbs', 'fat'] as const).map((macro) => (
          <MacroBars key={macro} macro={macro} days={trendMacroDays[macro]} baseTarget={dailyHomeTargets.macroTargets[macro]} today={todayKey} />
        ))}
      </View>

      {/* Water: each day against the goal. */}
      <View style={styles.homeSection}>
        <Text style={styles.detailTitle}>Water</Text>
        <WaterBars
          days={trendWaterDays}
          goalMl={profile?.water_goal_ml ?? DEFAULT_WATER_GOAL_ML}
          metric={profile?.units === 'metric'}
          today={todayKey}
        />
      </View>

      {/* History: every day in the range, newest first. */}
      <View style={styles.homeSection}>
        <Text style={styles.detailTitle}>History</Text>
        <DayHistory
          days={[...trendDays].reverse()}
          logs={trendLogs}
          exercise={exerciseEntries}
          today={todayKey}
          onDeleteFood={deleteTrendFood}
          onOpenWorkout={setWorkoutDetailId}
        />
      </View>
    </View>
  );
}
