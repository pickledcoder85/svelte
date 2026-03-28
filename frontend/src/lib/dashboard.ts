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

export interface TrendChartNode extends DashboardTrendPoint {
  x: number;
  y: number;
}

export interface TrendChartSegment {
  key: string;
  centerX: number;
  centerY: number;
  width: number;
  angle: number;
}

export interface TrendChartGeometry {
  peak: number;
  targetY: number;
  nodes: TrendChartNode[];
  segments: TrendChartSegment[];
}

export function buildTrendChartGeometry(
  points: DashboardTrendPoint[],
  targetCalories: number,
  frameWidth: number,
  frameHeight: number
): TrendChartGeometry {
  const peak = chartPeak(points, targetCalories);
  const horizontalPadding = 16;
  const verticalPadding = 18;
  const innerWidth = Math.max(frameWidth - horizontalPadding * 2, 1);
  const innerHeight = Math.max(frameHeight - verticalPadding * 2, 1);
  const safePeak = Math.max(peak, 1);
  const count = Math.max(points.length - 1, 1);

  const nodes = points.map((point, index) => {
    const x = horizontalPadding + (index / count) * innerWidth;
    const y = verticalPadding + (1 - point.calories / safePeak) * innerHeight;

    return { ...point, x, y };
  });

  const segments = nodes.slice(0, -1).map((point, index) => {
    const next = nodes[index + 1];
    const deltaX = next.x - point.x;
    const deltaY = next.y - point.y;
    const width = Math.max(Math.sqrt(deltaX ** 2 + deltaY ** 2), 1);
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    return {
      key: `${point.label}-${next.label}`,
      centerX: point.x + deltaX / 2,
      centerY: point.y + deltaY / 2,
      width,
      angle
    };
  });

  return {
    peak: safePeak,
    targetY: verticalPadding + (1 - targetCalories / safePeak) * innerHeight,
    nodes,
    segments
  };
}
