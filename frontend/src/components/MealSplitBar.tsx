/**
 * The meal split bar: one segment per meal or snack, with a handle between each pair. Drag a
 * handle (or tap near it) to move calories between the two blocks beside it; steps of 5%.
 * Each block's calories show underneath. Web only (the app is a PWA), like the activity slider.
 */
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BLOCK_LABELS, MEAL_PATTERNS, moveHandle, type BlockBudget, type MealsPerDay } from '../lib/meal-split';
import { usePalette } from '../theme/appearance';
import { tc } from '../theme/palette';

const BAR_HEIGHT = 44;
const HANDLE = 26;

export function MealSplitBar({
  count,
  split,
  budgets,
  onChange,
  onCommit
}: {
  count: MealsPerDay;
  split: number[];
  budgets: BlockBudget[];
  /** While dragging. */
  onChange(split: number[]): void;
  /** When the finger lifts (save then). */
  onCommit(split: number[]): void;
}) {
  const pal = usePalette();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ handle: number; start: number[] } | null>(null);
  const latest = useRef(split);
  latest.current = split;
  const [active, setActive] = useState<number | null>(null);
  const keys = MEAL_PATTERNS[count];

  // Boundaries between blocks, as percent along the bar.
  const boundaries = split.slice(0, -1).map((_, index) => split.slice(0, index + 1).reduce((sum, part) => sum + part, 0));

  const percentAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  const nearestHandle = (percent: number) =>
    boundaries.reduce((best, boundary, index) => (Math.abs(boundary - percent) < Math.abs(boundaries[best] - percent) ? index : best), 0);

  const colors = keys.map((key, index) =>
    key.endsWith('snack') ? pal.bg_7fa38c : index % 2 === 0 ? pal.brand_primary : pal.fg_0f766e
  );

  return (
    <View style={styles.wrap}>
      <div
        ref={trackRef}
        role="group"
        aria-label="Meal split"
        onPointerDown={(event) => {
          if (!event.isPrimary) {
            return;
          }
          const handle = nearestHandle(percentAt(event.clientX));
          dragging.current = { handle, start: latest.current };
          setActive(handle);
          event.currentTarget.setPointerCapture(event.pointerId);
          onChange(moveHandle(count, latest.current, handle, percentAt(event.clientX)));
        }}
        onPointerMove={(event) => {
          if (dragging.current) {
            onChange(moveHandle(count, latest.current, dragging.current.handle, percentAt(event.clientX)));
          }
        }}
        onPointerUp={() => {
          if (dragging.current) {
            onCommit(latest.current);
          }
          dragging.current = null;
          setActive(null);
        }}
        onPointerCancel={() => {
          // The browser took the touch for scrolling: put the split back.
          if (dragging.current) {
            onChange(dragging.current.start);
          }
          dragging.current = null;
          setActive(null);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: BAR_HEIGHT + HANDLE / 2,
          touchAction: 'pan-y',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', height: BAR_HEIGHT, borderRadius: 12, overflow: 'hidden' }}>
          {keys.map((key, index) => (
            <div
              key={key}
              style={{
                width: `${split[index]}%`,
                background: colors[index],
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.15,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                borderRight: index < keys.length - 1 ? '2px solid rgba(255,255,255,0.85)' : undefined
              }}
            >
              <span>{split[index]}%</span>
              {split[index] >= 20 ? <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>{BLOCK_LABELS[key].replace(' snack', '')}</span> : null}
            </div>
          ))}
        </div>
        {boundaries.map((boundary, index) => (
          <div
            key={index}
            aria-hidden
            style={{
              position: 'absolute',
              left: `calc(${boundary}% - ${HANDLE / 2}px)`,
              top: BAR_HEIGHT - HANDLE / 2,
              width: HANDLE,
              height: HANDLE,
              borderRadius: HANDLE / 2,
              background: '#ffffff',
              border: `2px solid ${active === index ? pal.fg_17324d : pal.line_cbd5e1}`,
              boxShadow: '0 1px 4px rgba(19,37,54,0.25)'
            }}
          />
        ))}
      </div>
      <View style={styles.list}>
        {budgets.map((block) => (
          <View key={block.key} style={styles.row}>
            <Text style={[styles.label, block.snack && styles.snack]}>{block.label}</Text>
            <Text style={styles.value}>
              {block.percent}% · {block.calories.toLocaleString('en-US')} kcal
              <Text style={styles.macros}>
                {'  '}P {block.macros.protein} · C {block.macros.carbs} · F {block.macros.fat}
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  list: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { color: tc.fg_132536, fontSize: 14, fontWeight: '700' },
  snack: { color: tc.fg_5c6d80, fontWeight: '600' },
  value: { color: tc.fg_132536, fontSize: 14, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  macros: { color: tc.fg_6b7b90, fontSize: 12, fontWeight: '600' }
});
