import { describe, expect, it } from 'vitest';

import { demoRangeSeries } from '../mock-data';
import {
  buildTrendChartGeometry,
  chartPeak,
  remainingCalories,
  selectRangeSeries
} from './dashboard';

describe('dashboard helpers', () => {
  it('selects the matching range series', () => {
    expect(selectRangeSeries(demoRangeSeries, '1M').label).toBe('This month');
  });

  it('calculates remaining calories without going negative', () => {
    expect(remainingCalories(2100, 1685)).toBe(415);
    expect(remainingCalories(2100, 2600)).toBe(0);
  });

  it('uses the larger of the chart points and target as the chart peak', () => {
    expect(chartPeak(demoRangeSeries[0].points, 2100)).toBe(2100);
    expect(chartPeak(demoRangeSeries[1].points, 1000)).toBe(1605);
  });

  it('builds line chart geometry with connected points and a target guide', () => {
    const geometry = buildTrendChartGeometry(demoRangeSeries[1].points, 14800, 320, 160);

    expect(geometry.nodes).toHaveLength(7);
    expect(geometry.segments).toHaveLength(6);
    expect(geometry.targetY).toBeGreaterThan(0);
    expect(geometry.targetY).toBeLessThan(160);
    expect(geometry.segments[0].width).toBeGreaterThan(0);
  });
});
