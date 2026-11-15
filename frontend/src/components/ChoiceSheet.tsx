/**
 * A bottom sheet that asks the user to choose between two actions (for example the warning
 * when a calorie target is below the recommended minimum). Tapping outside dismisses it
 * without choosing.
 */
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { tc } from '../theme/palette';

export function ChoiceSheet({
  title,
  children,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onDismiss
}: {
  title: string;
  children: ReactNode;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary(): void;
  onSecondary(): void;
  onDismiss(): void;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);

  function close(then: () => void) {
    if (closing.current) {
      return;
    }
    closing.current = true;
    Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(
      () => then()
    );
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 520] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close(onDismiss)}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPress} onPress={() => close(onDismiss)} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.body}>{children}</View>
          <Pressable style={[styles.button, styles.primary]} onPress={() => close(onPrimary)} accessibilityRole="button">
            <Text style={styles.primaryLabel}>{primaryLabel}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={() => close(onSecondary)} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
          </Pressable>
          {/* Clear of the iPhone home indicator. */}
          <div style={{ height: 'max(20px, env(safe-area-inset-bottom))' }} />
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
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
    marginBottom: 4
  },
  title: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  body: {
    gap: 8
  },
  button: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: 'center'
  },
  primary: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  primaryLabel: {
    color: tc.fg_ffffff,
    fontSize: 16,
    fontWeight: '800'
  },
  secondary: {
    backgroundColor: tc.bg_ffffff,
    borderColor: tc.line_d7dee7
  },
  secondaryLabel: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '700'
  }
});
