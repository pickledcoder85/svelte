/** Sub-tabs at the top of a tab with several screens (Log: Diary · Foods · Scan). */
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { AppSection } from '../types';
import { tc } from '../theme/palette';

export function SubTabs({
  items,
  active,
  onSelect
}: {
  items: Array<{ id: AppSection; label: string }>;
  active: AppSection;
  onSelect(section: AppSection): void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <Pressable
            key={item.id}
            style={[styles.chip, selected && styles.chipActive]}
            onPress={() => onSelect(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    backgroundColor: tc.bg_ffffff
  },
  chipActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  label: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  labelActive: { color: tc.fg_ffffff }
});
