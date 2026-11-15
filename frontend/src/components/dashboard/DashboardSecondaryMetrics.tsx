import { tc } from '../../theme/palette';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function DashboardSecondaryMetrics({
  adherence,
  currentWeight,
  missingInputs,
  weeklyChange
}: {
  adherence: string;
  currentWeight: string;
  missingInputs: string[];
  weeklyChange: string;
}): ReactElement {
  return (
    <View style={styles.wrap}>
      <View style={styles.summaryCard}>
        <Text style={styles.eyebrow}>Secondary metrics</Text>
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Current weight</Text>
            <Text style={styles.metricValue}>{currentWeight}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Weekly change</Text>
            <Text style={styles.metricValue}>{weeklyChange}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Adherence</Text>
            <Text style={styles.metricValue}>{adherence}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.eyebrow}>Needs input</Text>
        {missingInputs.length > 0 ? (
          <View style={styles.missingList}>
            {missingInputs.map((item) => (
              <Text key={item} style={styles.missingItem}>
                {item}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.quietText}>Core dashboard inputs are present for the current view.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12
  },
  summaryCard: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 16,
    gap: 12
  },
  eyebrow: {
    color: tc.fg_0f766e,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  metricCell: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: tc.bg_f7fafc,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4
  },
  metricLabel: {
    color: tc.fg_6b7b90,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '800'
  },
  missingList: {
    gap: 8
  },
  missingItem: {
    color: tc.fg_132536,
    fontSize: 13,
    lineHeight: 18
  },
  quietText: {
    color: tc.fg_66778c,
    fontSize: 13,
    lineHeight: 18
  }
});
