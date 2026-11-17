/**
 * A bottom sheet listing actions (the ＋ quick actions, the avatar's account menu). Tapping an
 * action closes the sheet and runs it; tapping outside just closes it.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { tc } from '../theme/palette';

export type SheetAction = { id: string; label: string; detail?: string; icon?: string; onPress(): void };

export function ActionSheet({ title, actions, onClose }: { title?: string; actions: SheetAction[]; onClose(): void }) {
  const t = useT();
  const progress = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);

  function close(then?: () => void) {
    if (closing.current) {
      return;
    }
    closing.current = true;
    Animated.timing(progress, { toValue: 1, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => {
      onClose();
      then?.();
    });
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.fill} onPress={() => close()} accessibilityLabel={t('common.close')} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {actions.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => close(action.onPress)}
              accessibilityRole="button"
            >
              {action.icon ? (
                <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
                  {action.icon}
                </Text>
              ) : null}
              <View style={styles.copy}>
                <Text style={styles.label}>{action.label}</Text>
                {action.detail ? <Text style={styles.detail}>{action.detail}</Text> : null}
              </View>
            </Pressable>
          ))}
          <div style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
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
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 4,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center'
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: tc.line_d7dee7,
    marginBottom: 8
  },
  title: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 8, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14 },
  rowPressed: { backgroundColor: tc.bg_eef2f6 },
  icon: { fontSize: 26, width: 34, textAlign: 'center' },
  copy: { flex: 1, gap: 2 },
  label: { color: tc.fg_132536, fontSize: 17, fontWeight: '700' },
  detail: { color: tc.fg_5c6d80, fontSize: 13 }
});
