import type { DashboardRange, DashboardRangeSeries, DashboardTrendPoint } from '../types';

export function selectRangeSeries(
  series: DashboardRangeSeries[],
  activeRange: DashboardRange
): DashboardRangeSeries {
  return series.find((entry) => entry.range === activeRange) ?? series[0];
}

export function remainingCalories(targetCalories: number, caloriesConsumed: number): number {
  return Math.max(targetCalories - caloriesConsumed, 0);
}

export function chartPeak(points: DashboardTrendPoint[], targetCalories: number): number {
  const pointPeak = points.reduce((peak, point) => Math.max(peak, point.calories), 0);
  return Math.max(pointPeak, targetCalories);
}
