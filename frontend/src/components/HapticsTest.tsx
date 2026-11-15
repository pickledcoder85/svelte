/**
 * Temporary diagnostic (Settings): which kinds of switch haptics does this iPhone allow a
 * web app? 1) a real switch flipped by finger, 2) the hidden switch the app uses, 3) the
 * visible switch clicked from code. Remove once haptics are settled.
 */
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hapticTap } from '../lib/haptics';
import { tc } from '../theme/palette';

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

export function HapticsTest() {
  const visibleLabel = useRef<HTMLLabelElement | null>(null);
  const button = {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 700,
    padding: '10px 14px',
    borderRadius: 12,
    border: `1px solid ${tc.line_d7dee7}`,
    background: tc.bg_ffffff,
    color: tc.fg_132536
  } as const;
  return (
    <View style={styles.wrap}>
      <Text style={styles.step}>1. Flip this switch with your finger. Feel a click?</Text>
      <label
        ref={visibleLabel}
        style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT, color: tc.fg_132536, fontSize: 15 }}
      >
        {/* The `switch` attribute is new in Safari 17.4; iOS 18+ gives it a haptic. */}
        <input type="checkbox" {...({ switch: '' } as Record<string, string>)} style={{ width: 40, height: 24 }} />
        Real switch
      </label>
      <Text style={styles.step}>2. The hidden switch the app uses:</Text>
      <button type="button" style={button} onClick={() => hapticTap()}>
        Tick (hidden)
      </button>
      <Text style={styles.step}>3. The visible switch above, clicked from code:</Text>
      <button type="button" style={button} onClick={() => visibleLabel.current?.click()}>
        Tick (visible)
      </button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10
  },
  step: {
    color: tc.fg_5c6d80,
    fontSize: 14
  }
});
