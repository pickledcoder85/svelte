/**
 * A bottom sheet with wheels, like the iOS pickers: Cancel and Done in a toolbar, the dimmed
 * page behind it. Nothing changes until Done.
 */
import { tc } from '../theme/palette';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { WheelColumn } from '../lib/wheel-picker';
import { WheelPicker } from './WheelPicker';

export function PickerSheet({
  title,
  columns,
  initialIndexes,
  onDone,
  onCancel,
  clearLabel,
  onClear,
  note
}: {
  title: string;
  columns: WheelColumn[];
  initialIndexes: number[];
  onDone(indexes: number[]): void;
  onCancel(): void;
  /** For optional fields: a button that empties the field. */
  clearLabel?: string;
  onClear?(): void;
  /** A line under the toolbar, e.g. the last weigh-in. */
  note?: string | null;
}) {
  const [indexes, setIndexes] = useState(initialIndexes);
  // 0 = open, 1 = closed. The dim fades while the opaque sheet slides, both ways, as on iOS.
  const progress = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [progress]);

  function close(then: () => void) {
    if (closing.current) {
      return;
    }
    closing.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false
    }).start(() => then());
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close(onCancel)}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPress} onPress={() => close(onCancel)} accessibilityLabel="Cancel" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View style={styles.toolbar}>
            <View style={styles.toolbarSide}>
              <Pressable onPress={() => close(onCancel)} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={[styles.toolbarSide, styles.toolbarSideEnd]}>
              <Pressable onPress={() => close(() => onDone(indexes))} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
          </View>
          {note ? <Text style={styles.note}>{note}</Text> : null}
          <View style={styles.wheels}>
            <WheelPicker
              columns={columns}
              indexes={indexes}
              onChange={(columnIndex, row) =>
                setIndexes((current) => current.map((value, index) => (index === columnIndex ? row : value)))
              }
            />
          </View>
          {onClear ? (
            <Pressable style={styles.clear} onPress={() => close(onClear)} accessibilityRole="button">
              <Text style={styles.clearLabel}>{clearLabel ?? 'Clear'}</Text>
            </Pressable>
          ) : null}
          {/* Keeps the wheels above the iPhone home indicator (the inset can read 0 without
              viewport-fit=cover, so there is a fixed minimum). */}
          <div style={{ height: 'max(28px, env(safe-area-inset-bottom))' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tc.backdrop
  },
  backdropPress: {
    flex: 1
  },
  sheet: {
    backgroundColor: tc.bg_ffffff,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center'
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tc.line_d8e1eb
  },
  // Equal side slots keep the title centred on the sheet, not between the two buttons.
  toolbarSide: {
    flex: 1,
    alignItems: 'flex-start'
  },
  toolbarSideEnd: {
    alignItems: 'flex-end'
  },
  title: {
    color: tc.fg_132536,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700'
  },
  cancel: {
    color: tc.fg_5c6d80,
    fontSize: 16
  },
  done: {
    color: tc.fg_0f766e,
    fontSize: 16,
    fontWeight: '800'
  },
  wheels: {
    paddingVertical: 12
  },
  note: {
    color: tc.fg_5c6d80,
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 12,
    paddingHorizontal: 18
  },
  clear: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  clearLabel: {
    color: tc.fg_b42318,
    fontSize: 15,
    fontWeight: '600'
  }
});
