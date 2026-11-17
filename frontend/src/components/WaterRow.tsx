/** Today's water: "5 of 8 glasses · 1.25 L", a filling bar, ＋ 1 glass (long press: a bottle), and undo. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BOTTLE_ML, GLASS_ML, waterSummary } from '../lib/water';
import { tc } from '../theme/palette';

export function WaterRow({
  totalMl,
  goalMl,
  metric,
  busy,
  canUndo,
  onAdd,
  onUndo
}: {
  totalMl: number;
  goalMl: number;
  metric: boolean;
  busy: boolean;
  canUndo: boolean;
  onAdd(ml: number): void;
  onUndo(): void;
}) {
  const share = goalMl > 0 ? Math.min(1, totalMl / goalMl) : 0;
  const reached = goalMl > 0 && totalMl >= goalMl;
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>
          💧 Water{reached ? ' ✓' : ''}
        </Text>
        <Text style={styles.summary}>{waterSummary(totalMl, goalMl, metric)}</Text>
        <View style={styles.track} accessibilityLabel={`Water: ${Math.round(share * 100)}% of today's goal`}>
          <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
        {canUndo ? (
          <Pressable onPress={onUndo} disabled={busy} accessibilityRole="button" accessibilityLabel="Undo the last drink">
            <Text style={styles.undo}>Undo last</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.buttons}>
        <Pressable
          style={[styles.add, busy && styles.disabled]}
          onPress={() => onAdd(GLASS_ML)}
          onLongPress={() => onAdd(BOTTLE_ML)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Add a glass of water"
          accessibilityHint="Press and hold to add a bottle"
        >
          <Text style={styles.addLabel}>＋ Glass</Text>
        </Pressable>
        <Pressable
          style={[styles.bottle, busy && styles.disabled]}
          onPress={() => onAdd(BOTTLE_ML)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Add a bottle of water"
        >
          <Text style={styles.bottleLabel}>＋ Bottle</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  copy: { flex: 1, gap: 4 },
  title: { color: tc.fg_132536, fontSize: 16, fontWeight: '700' },
  summary: { color: tc.fg_5c6d80, fontSize: 13 },
  track: { height: 8, borderRadius: 999, backgroundColor: tc.bg_e2e8f0, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: tc.fg_2563eb },
  undo: { color: tc.fg_0f766e, fontSize: 13, fontWeight: '700', paddingTop: 2 },
  buttons: { gap: 6 },
  add: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: tc.brand_primary, alignItems: 'center' },
  addLabel: { color: tc.fg_ffffff, fontSize: 15, fontWeight: '800' },
  bottle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7, alignItems: 'center' },
  bottleLabel: { color: tc.fg_132536, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
