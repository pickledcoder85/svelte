import { resolveColor, tc } from '../../theme/palette';
import { useAppearance, usePalette } from '../../theme/appearance';
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
  ringText?: string;
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
  const pal = usePalette();
  const { scheme } = useAppearance();
  // In dark mode the selected card is bright green, so its ring is drawn dark to stay visible.
  const darkActive = scheme === 'dark';
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
              <Text style={[styles.value, active && styles.valueActive]}>{metric.value}</Text>
            </View>
            {metric.ringPercentage !== undefined ? (
              <View style={styles.ringSection}>
                <View style={styles.ringWrap}>
                  <Svg width={62} height={62}>
                    <Circle cx="31" cy="31" r={radius} stroke={active ? (darkActive ? 'rgba(16,23,15,0.22)' : pal.line_4d6278) : pal.line_dbe3ec} strokeWidth="7" fill="none" />
                    <Circle
                      cx="31"
                      cy="31"
                      r={radius}
                      stroke={active && darkActive ? '#10170f' : resolveColor(metric.accentColor ?? tc.fg_132536, pal)}
                      strokeWidth="7"
                      fill="none"
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      rotation="-90"
                      origin="31,31"
                    />
                  </Svg>
                  <View style={styles.ringCenter}>
                    <Text style={[styles.ringCenterText, active && styles.ringCenterTextActive]}>
                      {metric.ringText ?? `${Math.round(percent)}%`}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
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
    backgroundColor: tc.bg_ffffff,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10
  },
  cardActive: {
    backgroundColor: tc.bg_132536,
    borderColor: tc.line_132536
  },
  cardHeader: {
    gap: 8
  },
  label: {
    color: tc.fg_6b7b90,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  labelActive: {
    color: tc.fg_d8e1ed
  },
  value: {
    color: tc.fg_132536,
    fontSize: 17,
    fontWeight: '800'
  },
  valueActive: {
    color: tc.fg_ffffff
  },
  ringSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2
  },
  ringWrap: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ringCenterText: {
    color: tc.fg_132536,
    fontSize: 13,
    fontWeight: '800'
  },
  ringCenterTextActive: {
    color: tc.fg_ffffff
  }
});
