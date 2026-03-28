import { describe, expect, it } from 'vitest';

import { demoRangeSeries } from '../mock-data';
import { chartPeak, remainingCalories, selectRangeSeries } from './dashboard';

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
});
