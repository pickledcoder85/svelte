/** A bottom sheet for one workout: what the source recorded next to what Relish counts. */
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import type { DetailRow, WorkoutDetail } from '../lib/workout-detail';
import { tc } from '../theme/palette';

function Rows({ rows }: { rows: DetailRow[] }) {
  return (
    <View style={styles.rows}>
      {rows.map((row) => (
        <View key={row.label} style={[styles.row, row.strong && styles.rowStrong]}>
          <Text style={[styles.rowLabel, row.strong && styles.strong]}>{row.label}</Text>
          <Text style={[styles.rowValue, row.strong && styles.strong]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function WorkoutDetailSheet({ detail, onClose }: { detail: WorkoutDetail; onClose(): void }) {
  const t = useT();
  const progress = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);

  function close() {
    if (closing.current) {
      return;
    }
    closing.current = true;
    Animated.timing(progress, { toValue: 1, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(onClose);
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 620] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.fill} onPress={close} accessibilityLabel={t('common.close')} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.8 }} contentContainerStyle={styles.body}>
            <View style={styles.header}>
              <Text style={styles.title}>{detail.title}</Text>
              <Text style={styles.subtitle}>
                {detail.subtitle}
                {detail.sourceLabel ? t('workouts.detail.from', { source: detail.sourceLabel }) : ''}
              </Text>
            </View>
            {detail.recorded ? (
              <View style={styles.section}>
                <Text style={styles.eyebrow}>{t('workouts.detail.recorded', { source: detail.sourceLabel ?? '' })}</Text>
                <Rows rows={detail.recorded} />
              </View>
            ) : null}
            <View style={styles.section}>
              <Text style={styles.eyebrow}>{t('workouts.detail.relishCounts')}</Text>
              <Rows rows={detail.relish} />
            </View>
            {detail.notes.map((note) => (
              <Text key={note} style={styles.note}>
                {note}
              </Text>
            ))}
            <Pressable style={styles.done} onPress={close} accessibilityRole="button">
              <Text style={styles.doneLabel}>{t('common.done')}</Text>
            </Pressable>
          </ScrollView>
          <div style={{ height: 'max(12px, env(safe-area-inset-bottom))' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: tc.backdrop },
  fill: { flex: 1 },
  sheet: {
    backgroundColor: tc.bg_ffffff,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  header: { gap: 4 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  subtitle: { color: tc.fg_5c6d80, fontSize: 14 },
  section: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: tc.bg_f6f9fc },
  eyebrow: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  rows: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  rowStrong: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.line_d7dee7, paddingTop: 7 },
  rowLabel: { color: tc.fg_132536, fontSize: 15, flexShrink: 1 },
  rowValue: { color: tc.fg_132536, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '800' },
  note: { color: tc.fg_6b7b90, fontSize: 13, lineHeight: 18 },
  done: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: tc.bg_eef2f6, marginTop: 4 },
  doneLabel: { color: tc.fg_132536, fontSize: 16, fontWeight: '700' }
});
