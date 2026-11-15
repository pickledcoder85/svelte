/**
 * One layout for every setup field: a title, a fixed gap, then the control. Use FieldGroup
 * around any control (buttons, a picker field) so titles and gaps always match.
 */
import { tc } from '../theme/palette';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const FIELD_HEIGHT = 50;
/** Shared look for field boxes and same-row buttons (the Sex choice). */
export const FIELD_BOX = {
  backgroundColor: tc.bg_f8fafc,
  borderColor: tc.line_cbd5e1,
  borderRadius: 18,
  borderWidth: 1
} as const;

export function FieldGroup({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

/** A field that shows its value (unit included) and opens a picker when tapped. */
export function PickerField({
  label,
  value,
  placeholder,
  onPress,
  accessibilityLabel,
  style
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress(): void;
  accessibilityLabel: string;
  style?: object;
}) {
  return (
    <FieldGroup label={label} style={style}>
      <Pressable
        style={({ pressed }) => [styles.box, pressed && styles.boxPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${value || 'not set'}`}
        accessibilityHint="Opens a picker"
      >
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </Pressable>
    </FieldGroup>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6
  },
  label: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  box: {
    height: FIELD_HEIGHT,
    justifyContent: 'center',
    ...FIELD_BOX,
    paddingHorizontal: 16
  },
  boxPressed: {
    backgroundColor: tc.bg_eef2f6
  },
  value: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '600'
  },
  placeholder: {
    color: tc.fg_9aa6b8,
    fontWeight: '400'
  }
});
