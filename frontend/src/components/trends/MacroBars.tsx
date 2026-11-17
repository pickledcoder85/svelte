/**
 * One macro over time, like the calorie chart: one see-through bar per logged day, as tall as
 * that day's target (it grows on workout days), filled with the grams eaten in the macro's own
 * colour, and a darker shade for anything over the target, above the outline. Days with nothing
 * logged have no bar. Tap a day to see "Nov 14 · 85 of 120 g · 71%".
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

import { macroCounts, type MacroDay, type MacroKey } from '../../lib/trends';
import { usePalette } from '../../theme/appearance';
import { tc } from '../../theme/palette';

const HEIGHT = 84;
const PAD = { top: 4, bottom: 4, left: 40, right: 6 };
const LABELS: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MacroBars({ macro, days, baseTarget }: { macro: MacroKey; days: MacroDay[]; baseTarget: number }) {
  const pal = usePalette();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const fill = { protein: pal.fg_0f766e, carbs: pal.fg_ea580c, fat: pal.fg_2563eb }[macro];
  const over = { protein: pal.fg_134e4a, carbs: pal.fg_9a3412, fat: pal.fg_1e3a8a }[macro];
  const logged = days.filter((day) => day.percent !== null);
  const counts = macroCounts(days);
  const max = Math.max(10, baseTarget, ...logged.map((day) => Math.max(day.eaten, day.target))) * 1.05;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(22, slot * 0.7));
  const radius = Math.min(3, barW / 2);
  const y = (value: number) => PAD.top + (1 - value / max) * innerH;
  const picked = logged.find((day) => day.date === selected) ?? null;
  const average = logged.length ? Math.round(logged.reduce((sum, day) => sum + day.eaten, 0) / logged.length) : 0;

  const detail = picked
    ? `${shortDate(picked.date)} · ${Math.round(picked.eaten)} of ${Math.round(picked.target)} g · ${Math.round((picked.eaten / Math.max(1, picked.target)) * 100)}%`
    : logged.length
      ? `avg ${average} g · on target ${counts.on} · over ${counts.over} · under ${counts.under}`
      : 'nothing logged';

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.label}>
          <Text style={{ color: fill }}>■</Text> {LABELS[macro]} <Text style={styles.target}>{Math.round(baseTarget)} g</Text>
        </Text>
        <Text style={[styles.counts, picked && styles.countsPicked]}>{detail}</Text>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={`${LABELS[macro]}: ${detail}`}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {days.map((day, index) => {
              if (day.percent === null) {
                return null;
              }
              const left = PAD.left + slot * index + (slot - barW) / 2;
              const within = Math.min(day.eaten, day.target);
              const extra = Math.max(0, day.eaten - day.target);
              const dim = picked !== null && picked.date !== day.date;
              return (
                <G key={day.date} opacity={dim ? 0.45 : 1}>
                  <Rect x={left} y={y(day.target)} width={barW} height={Math.max(0, y(0) - y(day.target))} rx={radius}
                    fill={fill} fillOpacity={0.12} stroke={fill} strokeOpacity={0.45} strokeWidth={barW >= 5 ? 1.2 : 0.8} />
                  {within > 0 ? (
                    <Rect x={left} y={y(within)} width={barW} height={Math.max(1, y(0) - y(within))} rx={radius} fill={fill} />
                  ) : null}
                  {extra > 0 ? (
                    <Rect x={left} y={y(day.eaten)} width={barW} height={Math.max(1, y(day.target) - y(day.eaten))} rx={radius} fill={over} />
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
            {baseTarget > 0 && logged.length > 0 ? (
              <Text style={[styles.axis, { top: y(baseTarget) - 7 }]}>{Math.round(baseTarget)}</Text>
            ) : null}
            {/* Tap targets: one per day, the full height. */}
            <View style={[StyleSheet.absoluteFill, styles.taps]}>
              {days.map((day) => (
                <Pressable
                  key={day.date}
                  style={styles.tap}
                  disabled={day.percent === null}
                  onPress={() => setSelected((current) => (current === day.date ? null : day.date))}
                  accessibilityRole="button"
                  accessibilityLabel={
                    day.percent === null ? `${shortDate(day.date)}: nothing logged` : `${shortDate(day.date)}: ${Math.round(day.eaten)} of ${Math.round(day.target)} g`
                  }
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
  block: { gap: 4, marginTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  label: { color: tc.fg_17324d, fontSize: 14, fontWeight: '700' },
  target: { color: tc.fg_7a8797, fontSize: 12, fontWeight: '400' },
  counts: { color: tc.fg_5c6d80, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  countsPicked: { color: tc.fg_17324d, fontWeight: '700' },
  axis: { position: 'absolute', left: 0, width: PAD.left - 8, textAlign: 'right', color: tc.fg_7a8797, fontSize: 10 },
  taps: { flexDirection: 'row', left: PAD.left, right: PAD.right },
  tap: { flex: 1 }
});
