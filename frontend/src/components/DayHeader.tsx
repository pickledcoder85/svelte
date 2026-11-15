/**
 * Today's date header: ‹ label › with thumb-sized arrows (one day each way, any day), and the
 * week underneath (tap a day; swipe sideways for the previous or next week). Tapping the label
 * on another day goes back to today.
 */
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { addDaysToDateKey } from '../lib/dates';
import { dayLabel, weekDays } from '../lib/week-strip';
import { usePalette } from '../theme/appearance';
import { tc } from '../theme/palette';

const SWIPE_PX = 40;

function Chevron({ left, color }: { left?: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DayHeader({
  selected,
  today,
  onSelect
}: {
  selected: string;
  today: string;
  onSelect(day: string): void;
}) {
  const pal = usePalette();
  const touchStartX = useRef<number | null>(null);
  const days = weekDays(selected, today);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable
          style={styles.arrow}
          onPress={() => onSelect(addDaysToDateKey(selected, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={6}
        >
          <Chevron left color={pal.fg_17324d} />
        </Pressable>
        <Pressable
          style={styles.labelButton}
          onPress={() => onSelect(today)}
          disabled={selected === today}
          accessibilityRole="button"
          accessibilityLabel={selected === today ? dayLabel(selected, today) : `${dayLabel(selected, today)}. Go to today`}
        >
          <Text style={styles.label} numberOfLines={1}>
            {dayLabel(selected, today)}
          </Text>
        </Pressable>
        <Pressable
          style={styles.arrow}
          onPress={() => onSelect(addDaysToDateKey(selected, 1))}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={6}
        >
          <Chevron color={pal.fg_17324d} />
        </Pressable>
      </View>
      <View
        style={styles.week}
        onTouchStart={(event) => {
          touchStartX.current = event.nativeEvent.pageX;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start === null) {
            return;
          }
          const moved = event.nativeEvent.pageX - start;
          if (Math.abs(moved) >= SWIPE_PX) {
            onSelect(addDaysToDateKey(selected, moved < 0 ? 7 : -7));
          }
        }}
        accessibilityRole="tablist"
      >
        {days.map((day) => (
          <Pressable
            key={day.key}
            style={[styles.day, day.isSelected && styles.daySelected]}
            onPress={() => onSelect(day.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: day.isSelected }}
            accessibilityLabel={dayLabel(day.key, today)}
          >
            <Text style={[styles.dayLetter, day.isFuture && styles.dayFuture, day.isSelected && styles.dayTextSelected]}>
              {day.letter}
            </Text>
            <Text
              style={[
                styles.dayDate,
                day.isFuture && styles.dayFuture,
                day.isToday && !day.isSelected && styles.dayToday,
                day.isSelected && styles.dayTextSelected
              ]}
            >
              {day.date}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tc.bg_eef2f6 },
  labelButton: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 },
  label: { color: tc.fg_132536, fontSize: 17, fontWeight: '800' },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14 },
  daySelected: { backgroundColor: tc.bg_17324d },
  dayLetter: { color: tc.fg_7a8797, fontSize: 12, fontWeight: '700' },
  dayDate: { color: tc.fg_132536, fontSize: 16, fontWeight: '700' },
  dayToday: { color: tc.fg_0f766e, fontWeight: '900' },
  dayFuture: { opacity: 0.55 },
  dayTextSelected: { color: tc.fg_ffffff, opacity: 1 }
});
