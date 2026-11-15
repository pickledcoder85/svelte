import { tc } from '../../theme/palette';
import { usePalette } from '../../theme/appearance';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { DashboardRange, DashboardTrendPoint } from '../../types';

const intradayAxisTicks = ['12a', '6a', '12p', '6p', '12a'];

export function DashboardHeroChart({
  caption,
  controls,
  detail,
  flat = false,
  legendLabel,
  plannedLabel,
  plannedValue,
  points,
  range,
  targetLabel,
  targetValue,
  title
}: {
  caption?: string | null;
  controls?: ReactElement | null;
  detail?: string | null;
  flat?: boolean;
  legendLabel: string;
  plannedLabel?: string | null;
  plannedValue?: number | null;
  points: DashboardTrendPoint[];
  range: DashboardRange;
  targetLabel: string;
  targetValue: number;
  title: string;
}): ReactElement {
  const pal = usePalette();
  const [width, setWidth] = useState(0);
  const chartHeight = 240;
  const padding = { top: 16, right: 16, bottom: 24, left: 20 };

  const geometry = useMemo(() => {
    if (width <= 0) {
      return null;
    }

    const peak = Math.max(targetValue, plannedValue ?? 0, ...points.map((point) => point.calories), 1);
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
    const targetLinePath = `M ${padding.left} ${targetY} L ${width - padding.right} ${targetY}`;
    const plannedY =
      plannedValue && plannedValue > 0 ? padding.top + (1 - plannedValue / peak) * plotHeight : null;
    const plannedLinePath =
      plannedY !== null ? `M ${padding.left} ${plannedY} L ${width - padding.right} ${plannedY}` : null;
    const gridValues = [0, 0.33, 0.66, 1].map((value) => {
      const y = padding.top + (1 - value) * plotHeight;
      const label = Math.round(peak * value);
      return { y, label };
    });
    const majorXValues = nodes.map((point) => point.x);

    return { areaPath, gridValues, linePath, majorXValues, nodes, plannedLinePath, plannedY, targetLinePath, targetY };
  }, [chartHeight, padding.bottom, padding.left, padding.right, padding.top, plannedValue, points, targetValue, width]);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(Math.max(event.nativeEvent.layout.width, 260));
  }

  return (
    <View style={[styles.card, flat && styles.cardFlat]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          {controls}
        </View>
        <View style={styles.headerMeta}>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.legendLine} />
              <Text style={styles.legendLabel}>{legendLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendGuide} />
              <Text style={styles.legendLabel}>{targetLabel}</Text>
            </View>
            {plannedLabel && plannedValue !== null && plannedValue !== undefined ? (
              <View style={styles.legendItem}>
                <View style={styles.legendPlannedGuide} />
                <Text style={styles.legendLabel}>{plannedLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.chartWrap} onLayout={handleLayout}>
        {geometry ? (
          <Svg width={width} height={chartHeight}>
            <Defs>
              <LinearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={pal.fg_132536} stopOpacity="0.26" />
                <Stop offset="100%" stopColor={pal.fg_132536} stopOpacity="0.04" />
              </LinearGradient>
            </Defs>

            {geometry.gridValues.map((grid) => (
              <Line
                key={`grid-${grid.label}-${grid.y}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={grid.y}
                y2={grid.y}
                stroke={pal.line_edf1f5}
                strokeDasharray="4 6"
                strokeWidth="1"
              />
            ))}

            <Path
              d={geometry.targetLinePath}
              fill="none"
              stroke={pal.fg_8ea0b6}
              strokeDasharray="6 6"
              strokeWidth="1.5"
            />
            {geometry.plannedLinePath ? (
              <Path
                d={geometry.plannedLinePath}
                fill="none"
                stroke={pal.fg_0f766e}
                strokeDasharray="3 5"
                strokeWidth="1.5"
              />
            ) : null}

            <Path d={geometry.areaPath} fill="url(#heroArea)" />

            {geometry.majorXValues.map((x, index) => (
              <Line
                key={`major-x-${index}-${x}`}
                x1={x}
                x2={x}
                y1={padding.top}
                y2={chartHeight - padding.bottom}
                stroke={pal.line_dce5ef}
                strokeDasharray="4 6"
                strokeWidth="1"
              />
            ))}

            <Path d={geometry.linePath} fill="none" stroke={pal.fg_132536} strokeWidth="3" />

            {geometry.nodes.map((point) => (
              <Circle
                key={`${point.label}-${point.calories}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={pal.fg_132536}
                stroke={pal.bg_ffffff}
                strokeWidth="2"
              />
            ))}
          </Svg>
        ) : null}
      </View>

      <View style={styles.footer}>
        {range === '1D' ? (
          <View
            style={[
              styles.labelRow,
              { paddingLeft: padding.left, paddingRight: padding.right }
            ]}>
            {intradayAxisTicks.map((tick) => (
              <View key={tick} style={styles.labelItem}>
                <Text style={styles.labelCaption}>{tick}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.labelRow}>
            {points.map((point) => (
              <View key={point.label} style={styles.labelItem}>
                <Text style={styles.labelValue}>{point.calories}</Text>
                <Text style={styles.labelCaption}>{point.label}</Text>
              </View>
            ))}
          </View>
        )}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 16,
    gap: 14
  },
  cardFlat: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: tc.line_dbe3ec,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 18
  },
  header: {
    gap: 8
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap'
  },
  headerMeta: {
    gap: 10
  },
  title: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  detail: {
    color: tc.fg_66778c,
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
    // Same token as the plotted line, so the key matches in both modes.
    backgroundColor: tc.fg_132536
  },
  legendGuide: {
    width: 18,
    height: 0,
    borderTopWidth: 2,
    borderTopColor: tc.line_8ea0b6,
    borderStyle: 'dashed'
  },
  legendPlannedGuide: {
    width: 18,
    height: 0,
    borderTopWidth: 2,
    borderTopColor: tc.fg_0f766e,
    borderStyle: 'dashed'
  },
  legendLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700'
  },
  chartWrap: {
    minHeight: 240,
    backgroundColor: tc.bg_f7fafc,
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
    color: tc.fg_132536,
    fontSize: 11,
    fontWeight: '700'
  },
  labelCaption: {
    color: tc.fg_6b7b90,
    fontSize: 11
  },
  caption: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    lineHeight: 17
  }
});
