/**
 * One macro on Today: the ring fills with the share of the target eaten; past 100% a deep-red
 * second lap runs over the full ring (amber would vanish on the orange carbs ring). Grams in the middle ("86 g of 120"), and the % (or how
 * far over) below the label.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { macroRing } from '../lib/macro-ring';
import { resolveColor, tc } from '../theme/palette';
import { usePalette } from '../theme/appearance';

const SIZE = 84;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MacroRing({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
  const pal = usePalette();
  const ring = macroRing(consumed, target);
  const arc = (share: number, stroke: string, width = STROKE) =>
    share > 0 ? (
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={stroke}
        strokeWidth={width}
        fill="none"
        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        strokeDashoffset={CIRCUMFERENCE * (1 - share)}
        strokeLinecap={share >= 1 ? 'butt' : 'round'}
        rotation={-90}
        origin={`${SIZE / 2},${SIZE / 2}`}
      />
    ) : null;

  return (
    <View
      style={styles.card}
      accessibilityLabel={`${label}: ${Math.round(consumed)} of ${Math.round(target)} grams${ring.over ? `, ${ring.footer} over` : ''}`}
    >
      <View style={styles.wrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={pal.line_dbe3ec} strokeWidth={STROKE} fill="none" />
          {arc(ring.firstLap, resolveColor(color, pal))}
          {arc(ring.overLap, pal.fg_b91c1c, STROKE - 2)}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.grams, ring.over && styles.over]}>{Math.round(consumed)} g</Text>
          <Text style={styles.of}>of {Math.round(target)}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.footer, ring.over && styles.over]}>{ring.over ? `⚠ ${ring.footer}` : ring.footer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', gap: 4 },
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  grams: { color: tc.fg_132536, fontSize: 17, fontWeight: '800' },
  of: { color: tc.fg_6b7b90, fontSize: 11, fontWeight: '600', marginTop: -1 },
  label: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  footer: { color: tc.fg_6b7b90, fontSize: 12, fontWeight: '700' },
  over: { color: tc.fg_b45309 }
});
