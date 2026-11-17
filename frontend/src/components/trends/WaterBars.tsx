/**
 * Water each day: one see-through bar as tall as the goal, filled with what was drunk (blue),
 * a darker blue above the goal. Days with nothing logged have no bar. On 1W each bar shows its
 * glasses; the header shows the latest day (or the one tapped).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { useT } from '../../i18n';
import { glasses, waterSummary, type WaterDay } from '../../lib/water';
import { usePalette } from '../../theme/appearance';
import { tc } from '../../theme/palette';

const HEIGHT = 92;
const PAD = { top: 14, bottom: 4, left: 40, right: 6 };
const LABEL_SLOT = 26;

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WaterBars({ days, goalMl, metric, today }: { days: WaterDay[]; goalMl: number; metric: boolean; today: string }) {
  const pal = usePalette();
  // Only the summary shared with Today is translated so far; the rest of Trends is pass 2.
  const t = useT();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const logged = days.filter((day) => day.ml > 0);
  const max = Math.max(goalMl, ...logged.map((day) => day.ml), 250) * 1.05;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(22, slot * 0.7));
  const radius = Math.min(3, barW / 2);
  const y = (value: number) => PAD.top + (1 - value / max) * innerH;
  const tapped = logged.find((day) => day.date === selected) ?? null;
  const shown = tapped ?? logged.at(-1) ?? null;
  const detail = shown ? `${shown.date === today ? 'Today' : shortDate(shown.date)} · ${waterSummary(shown.ml, goalMl, metric, t)}` : 'nothing logged';

  return (
    <View style={styles.block}>
      <Text style={[styles.detail, tapped && styles.detailPicked]}>{detail}</Text>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={`Water: ${detail}`}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {days.map((day, index) => {
              if (day.ml <= 0) {
                return null;
              }
              const left = PAD.left + slot * index + (slot - barW) / 2;
              const within = Math.min(day.ml, goalMl);
              const extra = Math.max(0, day.ml - goalMl);
              const dim = tapped !== null && tapped.date !== day.date;
              return (
                <G key={day.date} opacity={dim ? 0.45 : 1}>
                  <Rect x={left} y={y(goalMl)} width={barW} height={Math.max(0, y(0) - y(goalMl))} rx={radius}
                    fill={pal.fg_2563eb} fillOpacity={0.12} stroke={pal.fg_2563eb} strokeOpacity={0.45} strokeWidth={barW >= 5 ? 1.2 : 0.8} />
                  <Rect x={left} y={y(within)} width={barW} height={Math.max(1, y(0) - y(within))} rx={radius} fill={pal.fg_2563eb} />
                  {extra > 0 ? (
                    <Rect x={left} y={y(day.ml)} width={barW} height={Math.max(1, y(goalMl) - y(day.ml))} rx={radius} fill={pal.fg_1e3a8a} />
                  ) : null}
                  {slot >= LABEL_SLOT ? (
                    <SvgText x={left + barW / 2} y={Math.max(10, y(Math.max(day.ml, goalMl)) - 3)} fontSize={10} fontWeight="600"
                      fill={pal.fg_5c6d80} textAnchor="middle">
                      {`${glasses(day.ml)}`}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
        {width > 0 && logged.length > 0 ? (
          <>
            <Text style={[styles.axis, { top: y(goalMl) - 7 }]}>{glasses(goalMl)}</Text>
            <View style={[StyleSheet.absoluteFill, styles.taps]}>
              {days.map((day) => (
                <Pressable
                  key={day.date}
                  style={styles.tap}
                  disabled={day.ml <= 0}
                  onPress={() => setSelected((current) => (current === day.date ? null : day.date))}
                  accessibilityRole="button"
                  accessibilityLabel={day.ml > 0 ? `${shortDate(day.date)}: ${waterSummary(day.ml, goalMl, metric, t)}` : `${shortDate(day.date)}: nothing logged`}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  detail: { color: tc.fg_5c6d80, fontSize: 13 },
  detailPicked: { color: tc.fg_17324d, fontWeight: '700' },
  axis: { position: 'absolute', left: 0, width: PAD.left - 8, textAlign: 'right', color: tc.fg_7a8797, fontSize: 10 },
  taps: { flexDirection: 'row', left: PAD.left, right: PAD.right },
  tap: { flex: 1 }
});
