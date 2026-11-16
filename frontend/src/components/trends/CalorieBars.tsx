/**
 * Calories eaten each day as bars against that day's allowance (the tick on each bar). Green
 * within 10% of the allowance, amber when over, muted when under; no bar on days with nothing
 * logged. The dashed line is the average eaten on logged days.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import type { DayPoint } from '../../lib/trends';
import { usePalette } from '../../theme/appearance';
import { tc } from '../../theme/palette';

const HEIGHT = 160;
const PAD = { top: 8, bottom: 20, left: 40, right: 6 };

export function CalorieBars({ days, average }: { days: DayPoint[]; average: number }) {
  const pal = usePalette();
  const [width, setWidth] = useState(0);
  const max = Math.max(500, ...days.map((day) => Math.max(day.eaten, day.allowance))) * 1.08;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(28, slot * 0.68));
  const y = (value: number) => PAD.top + (1 - value / max) * innerH;
  const color = (day: DayPoint) =>
    day.allowance > 0 && day.eaten > day.allowance * 1.1
      ? pal.fg_f59e0b
      : day.allowance > 0 && day.eaten >= day.allowance * 0.9
        ? pal.brand_primary
        : pal.bg_7fa38c;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel="Calories eaten each day against the allowance">
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {[max / 1.08, max / 2.16].map((value) => (
            <Line key={value} x1={PAD.left} x2={width - PAD.right} y1={y(value)} y2={y(value)} stroke={pal.line_e2e8f0} strokeWidth={1} />
          ))}
          {days.map((day, index) => {
            const cx = PAD.left + slot * index + slot / 2;
            return (
              <G key={day.date}>
                {day.logged ? (
                  <Rect x={cx - barW / 2} y={y(day.eaten)} width={barW} height={Math.max(1, y(0) - y(day.eaten))} rx={Math.min(4, barW / 2)} fill={color(day)} />
                ) : null}
                {day.allowance > 0 ? (
                  <Line x1={cx - barW / 2 - 1} x2={cx + barW / 2 + 1} y1={y(day.allowance)} y2={y(day.allowance)} stroke={pal.fg_17324d} strokeWidth={2} />
                ) : null}
              </G>
            );
          })}
          {average > 0 ? (
            <Line x1={PAD.left} x2={width - PAD.right} y1={y(average)} y2={y(average)} stroke={pal.fg_5c6d80} strokeWidth={1.2} strokeDasharray="4 4" />
          ) : null}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      {width > 0 ? (
        <>
          {[max / 1.08, max / 2.16].map((value) => (
            <Text key={`l${value}`} style={[styles.axis, { top: y(value) - 8 }]}>
              {Math.round(value / 100) * 100}
            </Text>
          ))}
          <View style={styles.footer}>
            <Text style={styles.small}>{new Date(`${days[0]?.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.small}>▮ eaten  — allowance  - - average</Text>
            <Text style={styles.small}>{new Date(`${days.at(-1)?.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right', color: tc.fg_7a8797, fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -16, paddingLeft: PAD.left },
  small: { color: tc.fg_7a8797, fontSize: 11 }
});
