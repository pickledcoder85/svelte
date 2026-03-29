import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { DashboardRange, DashboardTrendPoint } from '../../types';

export function DashboardHeroChart({
  detail,
  legendLabel,
  points,
  range,
  targetLabel,
  targetValue,
  title
}: {
  detail: string;
  legendLabel: string;
  points: DashboardTrendPoint[];
  range: DashboardRange;
  targetLabel: string;
  targetValue: number;
  title: string;
}): ReactElement {
  const [width, setWidth] = useState(0);
  const chartHeight = 240;
  const padding = { top: 16, right: 16, bottom: 24, left: 20 };

  const geometry = useMemo(() => {
    if (width <= 0) {
      return null;
    }

    const peak = Math.max(targetValue, ...points.map((point) => point.calories), 1);
    const plotWidth = Math.max(width - padding.left - padding.right, 1);
    const plotHeight = Math.max(chartHeight - padding.top - padding.bottom, 1);
    const count = Math.max(points.length - 1, 1);

    const nodes = points.map((point, index) => {
      const x = padding.left + (index / count) * plotWidth;
      const y = padding.top + (1 - point.calories / peak) * plotHeight;
      return { ...point, x, y };
    });

    const linePath = nodes
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath = `${linePath} L ${nodes.at(-1)?.x ?? padding.left} ${chartHeight - padding.bottom} L ${nodes[0]?.x ?? padding.left} ${chartHeight - padding.bottom} Z`;
    const targetY = padding.top + (1 - targetValue / peak) * plotHeight;
    const gridValues = [0, 0.33, 0.66, 1].map((value) => {
      const y = padding.top + (1 - value) * plotHeight;
      const label = Math.round(peak * value);
      return { y, label };
    });

    return { areaPath, gridValues, linePath, nodes, targetY };
  }, [chartHeight, padding.bottom, padding.left, padding.right, padding.top, points, targetValue, width]);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(Math.max(event.nativeEvent.layout.width, 260));
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Overview</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.detail}>{detail}</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.legendLine} />
              <Text style={styles.legendLabel}>{legendLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendGuide} />
              <Text style={styles.legendLabel}>{targetLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.chartWrap} onLayout={handleLayout}>
        {geometry ? (
          <Svg width={width} height={chartHeight}>
            <Defs>
              <LinearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#132536" stopOpacity="0.26" />
                <Stop offset="100%" stopColor="#132536" stopOpacity="0.04" />
              </LinearGradient>
            </Defs>

            {geometry.gridValues.map((grid) => (
              <Line
                key={`grid-${grid.label}-${grid.y}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={grid.y}
                y2={grid.y}
                stroke="#edf1f5"
                strokeDasharray="4 6"
                strokeWidth="1"
              />
            ))}

            <Line
              x1={padding.left}
              x2={width - padding.right}
              y1={geometry.targetY}
              y2={geometry.targetY}
              stroke="#8ea0b6"
              strokeDasharray="6 6"
              strokeWidth="1.5"
            />

            <Path d={geometry.areaPath} fill="url(#heroArea)" />
            <Path d={geometry.linePath} fill="none" stroke="#132536" strokeWidth="3" />

            {geometry.nodes.map((point) => (
              <Circle
                key={`${point.label}-${point.calories}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#132536"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
          </Svg>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.labelRow}>
          {points.map((point) => (
            <View key={point.label} style={styles.labelItem}>
              <Text style={styles.labelValue}>{point.calories}</Text>
              <Text style={styles.labelCaption}>{point.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.caption}>{targetLabel}: {targetValue.toLocaleString()}</Text>
        {range === '1D' ? (
          <Text style={styles.caption}>Intraday event plotting will replace this placeholder once meal and exercise timestamps are modeled end to end.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d7dee7',
    padding: 16,
    gap: 14
  },
  header: {
    gap: 8
  },
  headerCopy: {
    gap: 4
  },
  headerMeta: {
    gap: 10
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  title: {
    color: '#132536',
    fontSize: 20,
    fontWeight: '800'
  },
  detail: {
    color: '#66778c',
    fontSize: 13,
    lineHeight: 18
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  legendLine: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#132536'
  },
  legendGuide: {
    width: 18,
    height: 0,
    borderTopWidth: 2,
    borderTopColor: '#8ea0b6',
    borderStyle: 'dashed'
  },
  legendLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700'
  },
  chartWrap: {
    minHeight: 240,
    backgroundColor: '#f7fafc',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center'
  },
  footer: {
    gap: 4
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  labelItem: {
    flex: 1,
    alignItems: 'center'
  },
  labelValue: {
    color: '#132536',
    fontSize: 11,
    fontWeight: '700'
  },
  labelCaption: {
    color: '#6b7b90',
    fontSize: 11
  },
  caption: {
    color: '#6b7b90',
    fontSize: 12,
    lineHeight: 17
  }
});
