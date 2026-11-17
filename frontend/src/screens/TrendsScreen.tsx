import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalorieBars } from '../components/trends/CalorieBars';
import { DayHistory } from '../components/trends/DayHistory';
import { MacroBars } from '../components/trends/MacroBars';
import { WaterBars } from '../components/trends/WaterBars';
import { WeightTrendChart } from '../components/trends/WeightTrendChart';
import { formatNumber, useT } from '../i18n';
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
  const t = useT();
  const number = (value: number) => formatNumber(value, undefined, t.locale);
  return (
    <View style={styles.dashboardStack}>
      <View style={styles.homeSection}>
        <View style={styles.todaySectionHeader}>
          <Text style={styles.detailTitle}>{t('trends.title')}</Text>
          <View style={styles.trendRangeRow} accessibilityRole="tablist">
            {TREND_RANGES.map((range) => (
              <Pressable
                key={range}
                style={[styles.trendRange, trendRange === range && styles.trendRangeActive]}
                onPress={() => setTrendRange(range)}
                accessibilityRole="tab"
                accessibilityState={{ selected: trendRange === range }}
              >
                <Text style={[styles.trendRangeLabel, trendRange === range && styles.trendRangeLabelActive]}>{t(`trends.ranges.${range}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {trendsError ? <Text style={styles.settingsError}>{trendsError}</Text> : null}
      </View>

      {/* Weight: weigh-ins and the smoothed trend, with the goal. */}
      <View style={styles.homeSection}>
        <View style={styles.todaySectionHeader}>
          <Text style={styles.detailTitle}>{t('trends.weight')}</Text>
          <Text style={styles.trendHeadline}>
            {trendWeight.latest !== null ? `${number(trendWeight.latest)} ${trendUnit}` : '—'}
          </Text>
        </View>
        <Text style={styles.todayHint}>
          {[
            trendWeight.rate !== null
              ? t('trends.trendRate', {
                  rate: `${trendWeight.rate > 0 ? '+' : trendWeight.rate < 0 ? '−' : '±'}${number(Math.abs(trendWeight.rate))}`,
                  unit: trendUnit
                })
              : t('trends.weighMore'),
            trendWeight.toGoal !== null ? t('trends.toGoal', { value: number(trendWeight.toGoal), unit: trendUnit }) : null
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
          <Text style={styles.trendProjectionLabel}>{t('trends.projection')}</Text>
          <View style={styles.trendRangeRow} accessibilityRole="tablist">
            {PROJECTION_HORIZONS.map((horizon) => (
              <Pressable
                key={horizon}
                style={[styles.trendRange, weightHorizon === horizon && styles.trendRangeActive]}
                onPress={() => setWeightHorizon(horizon)}
                accessibilityRole="tab"
                accessibilityState={{ selected: weightHorizon === horizon }}
                accessibilityLabel={t('trends.projectAhead', { count: Number(horizon.replace('M', '')) })}
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
          <Text style={styles.detailTitle}>{t('trends.calories')}</Text>
          <Text style={styles.trendHeadline}>
            {trendCalories.loggedDays > 0 ? t('trends.average', { value: number(trendCalories.averageEaten) }) : '—'}
          </Text>
        </View>
        <Text style={styles.todayHint}>
          {trendCalories.loggedDays > 0
            ? t('trends.calorieSummary', {
                logged: trendCalories.loggedDays,
                total: trendDays.length,
                allowance: number(trendCalories.averageAllowance),
                onTarget: trendCalories.daysOnTarget
              }) + (trendCalories.daysOver ? t('trends.calorieOver', { count: trendCalories.daysOver }) : '')
            : t('trends.nothingInRange')}
        </Text>
        <CalorieBars days={trendDays} />
      </View>

      {/* Macros: each day above or below its target. */}
      <View style={styles.homeSection}>
        <Text style={styles.detailTitle}>{t('trends.macros')}</Text>
        <Text style={styles.todayHint}>{t('trends.macrosHint')}</Text>
        {(['protein', 'carbs', 'fat'] as const).map((macro) => (
          <MacroBars key={macro} macro={macro} days={trendMacroDays[macro]} baseTarget={dailyHomeTargets.macroTargets[macro]} today={todayKey} />
        ))}
      </View>

      {/* Water: each day against the goal. */}
      <View style={styles.homeSection}>
        <Text style={styles.detailTitle}>{t('trends.water')}</Text>
        <WaterBars
          days={trendWaterDays}
          goalMl={profile?.water_goal_ml ?? DEFAULT_WATER_GOAL_ML}
          metric={profile?.units === 'metric'}
          today={todayKey}
        />
      </View>

      {/* History: every day in the range, newest first. */}
      <View style={styles.homeSection}>
        <Text style={styles.detailTitle}>{t('trends.history')}</Text>
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
