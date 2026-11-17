/**
 * Setup step 2 ("Daily activity"). ActivityEnergyBars shows energy at rest (BMR) and with the
 * chosen activity; the activity bar grows as the level rises. ActivityCaption names the level.
 * ActivitySlider, placed under them by the thumb, sets it. Web only (the app ships as a PWA).
 */
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatNumber, useT, type TFunction } from '../i18n';
import {
  ACTIVITY_LEVELS,
  activityBars,
  activityIndex,
  activityLevelText,
  indexForPosition,
  positionForIndex,
  sliderPosition,
  type ActivityLevel
} from '../lib/activity-level';
import { tc } from '../theme/palette';

function kcal(value: number, t: TFunction): string {
  return t('common.kcal', { value: formatNumber(Math.round(value), undefined, t.locale) });
}

/** The two energy bars. Both are scaled to the most active level, so the lower bar can grow. */
export function ActivityEnergyBars({
  bmr,
  maintenance,
  maintenanceByLevel
}: {
  /** Null until the numbers arrive: the bars keep their space, empty, so nothing jumps. */
  bmr: number | null;
  maintenance: number | null;
  maintenanceByLevel?: Partial<Record<ActivityLevel, number>>;
}) {
  const t = useT();
  const ready = bmr !== null && maintenance !== null;
  const bars = ready ? activityBars(bmr, maintenance, maintenanceByLevel) : { rest: 0, active: 0, fromActivity: 0 };
  return (
    <View style={styles.bars}>
      <View style={styles.barBlock}>
        <View style={styles.barLabelRow}>
          <Text style={styles.barLabel}>{t('setup.activity.atRest')}</Text>
          <Text style={styles.barValue}>{bmr !== null ? kcal(bmr, t) : '—'}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barRest, { width: `${bars.rest}%` }]} />
        </View>
      </View>
      <View style={styles.barBlock}>
        <View style={styles.barLabelRow}>
          <Text style={styles.barLabel}>{t('setup.activity.withActivity')}</Text>
          <Text style={styles.barValue}>{maintenance !== null ? kcal(maintenance, t) : '—'}</Text>
        </View>
        <View style={styles.barTrack}>
          {/* The whole bar is the day's total: the green start is the at-rest part, amber is activity. */}
          <View style={[styles.barActive, { width: `${bars.active}%` }]} />
          <View style={[styles.barRest, styles.barRestOverlay, { width: `${Math.min(bars.rest, bars.active)}%` }]} />
        </View>
        <Text style={styles.barNote}>{ready ? t('setup.activity.fromActivity', { value: kcal(bars.fromActivity, t) }) : ' '}</Text>
      </View>
    </View>
  );
}

/** The chosen level's name, description, and rough step count: one block that swaps. */
export function ActivityCaption({ value }: { value: ActivityLevel }) {
  const t = useT();
  const index = activityIndex(value);
  const level = activityLevelText(ACTIVITY_LEVELS[index].id, t);
  return (
    <View
      style={styles.caption}
      accessibilityLabel={t('setup.activity.captionLabel', {
        level: level.title,
        index: index + 1,
        total: ACTIVITY_LEVELS.length,
        description: level.description,
        steps: level.steps
      })}
    >
      <Text style={styles.captionTitle}>{level.title}</Text>
      <Text style={styles.captionDetail} numberOfLines={1}>
        {level.description}
      </Text>
      <Text style={styles.captionSteps} numberOfLines={1}>
        {level.steps}
      </Text>
    </View>
  );
}

const HANDLE = 34;
const TRACK = 8;
/** Space at each end of the track, so the handle never hangs over the edge. */
const INSET = HANDLE / 2 + 2;
const SLIDER_HEIGHT = 52;
/** Sideways movement (px) before a touch counts as dragging the handle. */
const DRAG_THRESHOLD = 6;

/** The five-stop slider that sets the level. Drag the handle or tap a stop; it snaps. */
export function ActivitySlider({ value, onChange }: { value: ActivityLevel; onChange(level: ActivityLevel): void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  // A touch only changes the level once it moves sideways (a drag) or lifts in place (a tap).
  // A touch that turns into a page scroll is cancelled and the level it started with returns.
  const gesture = useRef<{ startIndex: number; x: number; y: number; dragging: boolean } | null>(null);
  const t = useT();
  const index = activityIndex(value);
  const level = activityLevelText(ACTIVITY_LEVELS[index].id, t);
  const last = ACTIVITY_LEVELS.length - 1;
  const position = positionForIndex(index);

  function choose(nextIndex: number) {
    const clamped = Math.min(last, Math.max(0, nextIndex));
    if (clamped !== index) {
      onChange(ACTIVITY_LEVELS[clamped].id);
    }
  }

  function chooseFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) {
      choose(indexForPosition(sliderPosition(event.clientX - rect.left, rect.width, INSET)));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowUp: index + 1,
      ArrowRight: index + 1,
      ArrowDown: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: last
    };
    if (event.key in steps) {
      event.preventDefault();
      choose(steps[event.key]);
    }
  }

  /** CSS left for a position along the track, inside the insets. */
  const leftFor = (t: number) => `calc(${INSET}px + (100% - ${INSET * 2}px) * ${t})`;

  return (
    <View style={styles.sliderWrap}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t('setup.activity.sliderLabel')}
        aria-valuemin={1}
        aria-valuemax={ACTIVITY_LEVELS.length}
        aria-valuenow={index + 1}
        aria-valuetext={t('setup.activity.levelPosition', { level: level.title, index: index + 1, total: ACTIVITY_LEVELS.length })}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (!event.isPrimary) {
            return;
          }
          gesture.current = { startIndex: index, x: event.clientX, y: event.clientY, dragging: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current) {
            return;
          }
          if (!current.dragging && Math.abs(event.clientX - current.x) >= DRAG_THRESHOLD) {
            current.dragging = true;
          }
          if (current.dragging) {
            chooseFromPointer(event);
          }
        }}
        onPointerUp={(event) => {
          // A tap (no drag) picks the stop under the finger.
          if (gesture.current && !gesture.current.dragging) {
            chooseFromPointer(event);
          }
          gesture.current = null;
        }}
        onPointerCancel={() => {
          // The browser took the touch for scrolling: put the level back.
          const current = gesture.current;
          gesture.current = null;
          if (current && current.startIndex !== index) {
            onChange(ACTIVITY_LEVELS[current.startIndex].id);
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: SLIDER_HEIGHT,
          // Sideways drags move the handle; up-and-down swipes still scroll the page.
          touchAction: 'pan-y',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
          borderRadius: 12
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: INSET,
            right: INSET,
            top: (SLIDER_HEIGHT - TRACK) / 2,
            height: TRACK,
            borderRadius: 999,
            backgroundColor: tc.line_dbe3ec
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: INSET,
            width: `calc((100% - ${INSET * 2}px) * ${position})`,
            top: (SLIDER_HEIGHT - TRACK) / 2,
            height: TRACK,
            borderRadius: 999,
            backgroundColor: tc.brand_primary
          }}
        />
        {ACTIVITY_LEVELS.map((option, optionIndex) => (
          <div
            key={option.id}
            style={{
              position: 'absolute',
              left: leftFor(positionForIndex(optionIndex)),
              top: SLIDER_HEIGHT / 2,
              width: 6,
              height: 6,
              marginLeft: -3,
              marginTop: -3,
              borderRadius: 999,
              backgroundColor: optionIndex <= index ? tc.fg_ffffff : tc.fg_9aa6b8
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: leftFor(position),
            top: SLIDER_HEIGHT / 2,
            width: HANDLE,
            height: HANDLE,
            marginLeft: -HANDLE / 2,
            marginTop: -HANDLE / 2,
            borderRadius: 999,
            boxSizing: 'border-box',
            backgroundColor: tc.bg_ffffff,
            border: `4px solid ${tc.brand_primary}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
          }}
        />
      </div>
      <View style={styles.sliderEnds}>
        <Text style={styles.sliderEndLabel}>{activityLevelText(ACTIVITY_LEVELS[0].id, t).title}</Text>
        <Text style={styles.sliderEndLabel}>{activityLevelText(ACTIVITY_LEVELS[last].id, t).title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    gap: 14
  },
  barBlock: {
    gap: 6
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  barLabel: {
    color: tc.fg_5c6d80,
    fontSize: 14,
    fontWeight: '600'
  },
  barValue: {
    color: tc.fg_132536,
    fontSize: 17,
    fontWeight: '800'
  },
  barTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: tc.line_dbe3ec,
    overflow: 'hidden'
  },
  barRest: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: tc.brand_primary
  },
  // The thin card-coloured edge separates the two parts even where green and amber are equally
  // bright (dark mode, colour-blind users).
  barRestOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRightWidth: 2,
    borderRightColor: tc.bg_ffffff,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  // What activity adds, in a warm colour that stands apart from the green at-rest part.
  barActive: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: tc.brand_accent
  },
  barNote: {
    color: tc.fg_b45309,
    fontSize: 13,
    fontWeight: '700'
  },
  caption: {
    gap: 2
  },
  captionTitle: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  captionDetail: {
    color: tc.fg_132536,
    fontSize: 15
  },
  captionSteps: {
    color: tc.fg_5c6d80,
    fontSize: 14
  },
  sliderWrap: {
    gap: 2
  },
  sliderEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2
  },
  sliderEndLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '600'
  }
});
