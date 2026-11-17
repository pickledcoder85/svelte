import type { ReactElement } from 'react';
import { type DimensionValue, Pressable, Text, View } from 'react-native';

import { recipeScaleLabel } from '../lib/nutrition';
import type { ScaleStop } from '../screens/shared/constants';
import { styles } from '../screens/shared/styles';

export function ScaleStopSelector({
  label,
  helperText,
  value,
  values,
  onChange
}: {
  label: string;
  helperText?: string;
  value: ScaleStop;
  values: readonly ScaleStop[];
  onChange: (value: ScaleStop) => void;
}): ReactElement {
  const activeIndex = Math.max(values.indexOf(value), 0);
  const fillWidth = (values.length > 1 ? `${(activeIndex / (values.length - 1)) * 100}%` : '100%') as DimensionValue;

  return (
    <View style={styles.scaleSelectorCard}>
      <View style={styles.scaleSelectorHeader}>
        <View>
          <Text style={styles.scaleSelectorLabel}>{label}</Text>
          {helperText ? <Text style={styles.scaleSelectorHint}>{helperText}</Text> : null}
        </View>
        <Text style={styles.scaleSelectorValue}>{recipeScaleLabel(value)}</Text>
      </View>
      <View style={styles.scaleSelectorRailWrap}>
        <View style={styles.scaleSelectorRail} />
        <View style={[styles.scaleSelectorRailFill, { width: fillWidth }]} />
        <View style={styles.scaleSelectorStops}>
          {values.map((option) => {
            const active = option === value;

            return (
              <Pressable
                key={option}
                style={styles.scaleSelectorStop}
                onPress={() => onChange(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={recipeScaleLabel(option)}
              >
                <View style={[styles.scaleSelectorDot, active && styles.scaleSelectorDotActive]} />
                <Text style={[styles.scaleSelectorStopLabel, active && styles.scaleSelectorStopLabelActive]}>
                  {recipeScaleLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
