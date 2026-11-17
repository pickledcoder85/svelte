/**
 * One macro over time: the middle line is the target; each day's bar goes up when over and down
 * when under, by how far off it was (percent of the target, capped at ±100%). Within ±10% is on
 * target (soft colour). The miss to watch is amber: short on protein (a minimum), over on carbs
 * or fat (limits). Days with nothing logged have no bar.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { macroCounts, macroMissIsBad, type MacroDay, type MacroKey } from '../../lib/trends';
import { usePalette } from '../../theme/appearance';
import { tc } from '../../theme/palette';

const HEIGHT = 74;
const PAD = { top: 4, bottom: 4, left: 40, right: 6 };
const CAP = 100;
const LABELS: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

export function MacroDeviationChart({ macro, days, target }: { macro: MacroKey; days: MacroDay[]; target: number }) {
  const pal = usePalette();
  const [width, setWidth] = useState(0);
  const counts = macroCounts(days);
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const half = (HEIGHT - PAD.top - PAD.bottom) / 2;
  const mid = PAD.top + half;
  const slot = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(22, slot * 0.7));
  const color = (day: MacroDay) =>
    day.status === 'on' ? pal.bg_7fa38c : macroMissIsBad(macro, day.status) ? pal.fg_f59e0b : pal.fg_8a97a8;
  const logged = counts.on + counts.over + counts.under;

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.label}>
          {LABELS[macro]} <Text style={styles.target}>{Math.round(target)} g</Text>
        </Text>
        <Text style={styles.counts}>
          {logged > 0 ? `on target ${counts.on} · over ${counts.over} · under ${counts.under}` : 'nothing logged'}
        </Text>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={`${LABELS[macro]}: on target ${counts.on} days, over ${counts.over}, under ${counts.under}`}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {days.map((day, index) => {
              if (day.percent === null) {
                return null;
              }
              const value = Math.max(-CAP, Math.min(CAP, day.percent));
              const size = Math.max(1.5, (Math.abs(value) / CAP) * half);
              const left = PAD.left + slot * index + (slot - barW) / 2;
              return (
                <Rect key={day.date} x={left} y={value >= 0 ? mid - size : mid} width={barW} height={size} rx={Math.min(2, barW / 2)} fill={color(day)} />
              );
            })}
            <Line x1={PAD.left} x2={width - PAD.right} y1={mid} y2={mid} stroke={pal.fg_5c6d80} strokeWidth={1} />
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
        {width > 0 ? (
          <>
            <Text style={[styles.axis, { top: PAD.top - 2 }]}>over</Text>
            <Text style={[styles.axis, { top: mid - 7 }]}>target</Text>
            <Text style={[styles.axis, { top: HEIGHT - PAD.bottom - 12 }]}>under</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4, marginTop: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  label: { color: tc.fg_17324d, fontSize: 14, fontWeight: '700' },
  target: { color: tc.fg_7a8797, fontSize: 12, fontWeight: '400' },
  counts: { color: tc.fg_5c6d80, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  axis: { position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right', color: tc.fg_7a8797, fontSize: 10 }
});
