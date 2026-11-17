/**
 * One bar per logged day: its height is the day's allowance (the base target plus the workout
 * calories added), see-through, and it fills with what was eaten (amber for anything above the
 * allowance). Days with nothing logged have no bar. No gridlines: one small label marks the base
 * target.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { formatDate, formatNumber, useT } from '../../i18n';
import type { DayPoint } from '../../lib/trends';
import { usePalette } from '../../theme/appearance';
import { tc } from '../../theme/palette';

const HEIGHT = 160;
const PAD = { top: 8, bottom: 20, left: 40, right: 6 };

export function CalorieBars({ days }: { days: DayPoint[] }) {
  const pal = usePalette();
  const t = useT();
  const shortDate = (date: string | undefined) => formatDate(new Date(`${date}T00:00:00`), { month: 'short', day: 'numeric' }, t.locale);
  const [width, setWidth] = useState(0);
  const max = Math.max(500, ...days.map((day) => Math.max(day.eaten, day.allowance))) * 1.05;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(28, slot * 0.7));
  const radius = Math.min(4, barW / 2);
  const y = (value: number) => PAD.top + (1 - value / max) * innerH;
  const base = days.find((day) => day.baseTarget > 0)?.baseTarget ?? 0;
  const outline = barW >= 5 ? 1.2 : 0.8;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={t('trends.calorieChart.a11y')}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {base > 0 ? (
            <Line x1={PAD.left - 5} x2={PAD.left - 1} y1={y(base)} y2={y(base)} stroke={pal.fg_7a8797} strokeWidth={1.5} />
          ) : null}
          {days.map((day, index) => {
            const left = PAD.left + slot * index + (slot - barW) / 2;
            const within = Math.min(day.eaten, day.allowance);
            const over = Math.max(0, day.eaten - day.allowance);
            if (!day.logged) {
              return null;
            }
            return (
              <G key={day.date}>
                {day.allowance > 0 ? (
                  <Rect x={left} y={y(day.allowance)} width={barW} height={Math.max(0, y(0) - y(day.allowance))} rx={radius}
                    fill={pal.brand_primary} fillOpacity={0.1} stroke={pal.fg_8a97a8} strokeOpacity={0.55} strokeWidth={outline} />
                ) : null}
                {within > 0 ? (
                  <Rect x={left} y={y(within)} width={barW} height={Math.max(1, y(0) - y(within))} rx={radius} fill={pal.brand_primary} />
                ) : null}
                {over > 0 ? (
                  <Rect x={left} y={y(day.eaten)} width={barW} height={Math.max(1, y(day.allowance) - y(day.eaten))} rx={radius} fill={pal.fg_f59e0b} />
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      {width > 0 ? (
        <>
          {base > 0 ? <Text style={[styles.axis, { top: y(base) - 8 }]}>{formatNumber(base, undefined, t.locale)}</Text> : null}
          <View style={styles.footer}>
            <Text style={styles.small}>{shortDate(days[0]?.date)}</Text>
            <Text style={styles.small}>
              <Text style={{ color: pal.brand_primary }}>■</Text> {t('trends.calorieChart.eaten')}  □ {t('trends.calorieChart.allowance')}  <Text style={{ color: pal.fg_f59e0b }}>■</Text>{' '}
              {t('trends.calorieChart.over')}
            </Text>
            <Text style={styles.small}>{shortDate(days.at(-1)?.date)}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { position: 'absolute', left: 0, width: PAD.left - 8, textAlign: 'right', color: tc.fg_7a8797, fontSize: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -16, paddingLeft: PAD.left },
  small: { color: tc.fg_7a8797, fontSize: 11 }
});
