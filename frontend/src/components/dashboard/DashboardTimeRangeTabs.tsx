import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardRange } from '../../types';

export function DashboardTimeRangeTabs({
  activeRange,
  onChange,
  ranges
}: {
  activeRange: DashboardRange;
  onChange: (range: DashboardRange) => void;
  ranges: readonly DashboardRange[];
}): ReactElement {
  return (
    <View style={styles.wrap}>
      {ranges.map((range) => {
        const active = range === activeRange;
        return (
          <Pressable
            key={range}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(range)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{range}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#edf1f5'
  },
  tabActive: {
    backgroundColor: '#132536'
  },
  label: {
    color: '#132536',
    fontSize: 12,
    fontWeight: '700'
  },
  labelActive: {
    color: '#ffffff'
  }
});
