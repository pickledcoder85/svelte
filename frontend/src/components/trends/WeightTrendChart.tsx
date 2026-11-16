/** Weigh-ins as faint dots and the smoothed trend as a line, with the goal weight dashed. */
import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { WeightPoint } from '../../lib/trends';
import { usePalette } from '../../theme/appearance';
import { tc } from '../../theme/palette';

const HEIGHT = 170;
const PAD = { top: 10, bottom: 22, left: 40, right: 8 };

export function WeightTrendChart({
  points,
  start,
  end,
  goal,
  unit,
  toUnit
}: {
  points: WeightPoint[];
  start: string;
  end: string;
  goal: number | null;
  unit: string;
  /** Pounds to the shown unit. */
  toUnit(lbs: number): number;
}) {
  const pal = usePalette();
  const [width, setWidth] = useState(0);
  const shown = points.filter((point) => point.date >= start && point.date <= end);
  if (shown.length === 0) {
    return <Text style={styles.empty}>No weigh-ins in this range. Tap Weigh in to add today’s.</Text>;
  }
  const values = shown.flatMap((point) => [toUnit(point.weight), toUnit(point.trend)]);
  const goalValue = goal !== null ? toUnit(goal) : null;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (goalValue !== null && goalValue >= min - 5 && goalValue <= max + 5) {
    min = Math.min(min, goalValue);
    max = Math.max(max, goalValue);
  }
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const span = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`) || 1;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (date: string) => PAD.left + ((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / span) * innerW;
  const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * innerH;
  const trendPath = shown.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.date).toFixed(1)},${y(toUnit(point.trend)).toFixed(1)}`).join(' ');
  const label = (value: number) => `${Math.round(value)}`;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={`Weight trend, ${shown.length} weigh-ins`}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {[max, (max + min) / 2, min].map((value) => (
            <Line key={value} x1={PAD.left} x2={width - PAD.right} y1={y(value)} y2={y(value)} stroke={pal.line_e2e8f0} strokeWidth={1} />
          ))}
          {goalValue !== null && goalValue >= min && goalValue <= max ? (
            <Line x1={PAD.left} x2={width - PAD.right} y1={y(goalValue)} y2={y(goalValue)} stroke={pal.fg_0f766e} strokeWidth={1.5} strokeDasharray="5 4" />
          ) : null}
          {shown.map((point) => (
            <Circle key={point.date} cx={x(point.date)} cy={y(toUnit(point.weight))} r={2.6} fill={pal.fg_8a97a8} opacity={0.7} />
          ))}
          <Path d={trendPath} stroke={pal.brand_primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      {width > 0 ? (
        <>
          {[max, (max + min) / 2, min].map((value) => (
            <Text key={`l${value}`} style={[styles.axis, { top: y(value) - 8 }]}>
              {label(value)}
            </Text>
          ))}
          <View style={styles.footer}>
            <Text style={styles.axisDate}>{new Date(`${start}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.legend}>● weigh-ins  — trend{goalValue !== null ? '  - - goal' : ''} ({unit})</Text>
            <Text style={styles.axisDate}>{new Date(`${end}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: tc.fg_5c6d80, fontSize: 14, paddingVertical: 24, textAlign: 'center' },
  axis: { position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right', color: tc.fg_7a8797, fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -16, paddingLeft: PAD.left },
  axisDate: { color: tc.fg_7a8797, fontSize: 11 },
  legend: { color: tc.fg_7a8797, fontSize: 11 }
});
