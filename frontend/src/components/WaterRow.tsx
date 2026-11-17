/** Today's water: "5 of 8 glasses · 1.25 L", a filling bar, ＋ 1 glass (long press: a bottle), and undo. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
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
  const t = useT();
  const share = goalMl > 0 ? Math.min(1, totalMl / goalMl) : 0;
  const reached = goalMl > 0 && totalMl >= goalMl;
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {t('water.title')}
          {reached ? ' ✓' : ''}
        </Text>
        <Text style={styles.summary}>{waterSummary(totalMl, goalMl, metric, t)}</Text>
        <View style={styles.track} accessibilityLabel={t('water.progress', { percent: Math.round(share * 100) })}>
          <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
        {canUndo ? (
          <Pressable onPress={onUndo} disabled={busy} accessibilityRole="button" accessibilityLabel={t('water.undoLastA11y')}>
            <Text style={styles.undo}>{t('water.undoLast')}</Text>
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
          accessibilityLabel={t('water.addGlassA11y')}
          accessibilityHint={t('water.addGlassHint')}
        >
          <Text style={styles.addLabel}>{t('water.addGlass')}</Text>
        </Pressable>
        <Pressable
          style={[styles.bottle, busy && styles.disabled]}
          onPress={() => onAdd(BOTTLE_ML)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('water.addBottleA11y')}
        >
          <Text style={styles.bottleLabel}>{t('water.addBottle')}</Text>
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
