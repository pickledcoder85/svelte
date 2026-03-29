import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { DashboardMetricKey } from '../../types';

interface DashboardHeaderMetric {
  key: DashboardMetricKey;
  label: string;
  value: string;
  ringPercentage?: number;
  accentColor?: string;
}

export function DashboardHeaderMetrics({
  activeMetric,
  metrics,
  onSelect
}: {
  activeMetric: DashboardMetricKey;
  metrics: DashboardHeaderMetric[];
  onSelect: (metric: DashboardMetricKey) => void;
}): ReactElement {
  return (
    <View style={styles.wrap}>
      {metrics.map((metric) => {
        const active = metric.key === activeMetric;
        const radius = 15;
        const circumference = 2 * Math.PI * radius;
        const percent = Math.max(0, Math.min(metric.ringPercentage ?? 0, 100));
        const offset = circumference - (percent / 100) * circumference;

        return (
          <Pressable
            key={metric.key}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => onSelect(metric.key)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.label, active && styles.labelActive]}>{metric.label}</Text>
              {metric.ringPercentage !== undefined ? (
                <View style={styles.ringWrap}>
                  <Svg width={42} height={42}>
                    <Circle cx="21" cy="21" r={radius} stroke={active ? '#4d6278' : '#dbe3ec'} strokeWidth="6" fill="none" />
                    <Circle
                      cx="21"
                      cy="21"
                      r={radius}
                      stroke={metric.accentColor ?? '#132536'}
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="21,21"
                    />
                  </Svg>
                </View>
              ) : null}
            </View>
            <Text style={[styles.value, active && styles.valueActive]}>{metric.value}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  card: {
    flexGrow: 1,
    minWidth: 110,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dee7',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10
  },
  cardActive: {
    backgroundColor: '#132536',
    borderColor: '#132536'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  label: {
    color: '#6b7b90',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1
  },
  labelActive: {
    color: '#d8e1ed'
  },
  value: {
    color: '#132536',
    fontSize: 19,
    fontWeight: '800'
  },
  valueActive: {
    color: '#ffffff'
  },
  ringWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
