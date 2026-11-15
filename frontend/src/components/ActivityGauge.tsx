/**
 * Setup step 2. ActivityGauge is the readout: a half-circle dial whose arc fills to the chosen
 * level, with the level's name inside and its description underneath. ActivitySlider is the
 * control: a five-stop slider placed at the bottom of the card, so the thumb that moves it
 * never covers the text that changes. Web only (the app ships as a PWA).
 */
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  ACTIVITY_LEVELS,
  activityIndex,
  arcPath,
  indexForPosition,
  pointOnArc,
  positionForIndex,
  sliderPosition,
  type ActivityLevel
} from '../lib/activity-gauge';
import { usePalette } from '../theme/appearance';
import { tc } from '../theme/palette';

const STROKE = 18;
const MAX_WIDTH = 320;
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

/** The dial and caption for the chosen level. Display only: the slider below sets the level. */
export function ActivityGauge({ value }: { value: ActivityLevel }) {
  const pal = usePalette();
  // Start from the screen width so the dial's space is reserved on the first frame; onLayout
  // then gives the exact width.
  const [width, setWidth] = useState(() => Math.max(0, Dimensions.get('window').width - 72));

  const index = activityIndex(value);
  const level = ACTIVITY_LEVELS[index];
  const size = Math.min(width, MAX_WIDTH);
  const cx = size / 2;
  const r = size / 2 - STROKE / 2 - 4;
  const cy = r + STROKE / 2 + 4;
  const height = cy + STROKE / 2 + 4;
  const position = positionForIndex(index);
  const fillEnd = pointOnArc(cx, cy, r, position);
  const innerRadius = r - STROKE / 2 - 6;

  return (
    <View
      style={styles.wrap}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={`${level.title}, ${index + 1} of ${ACTIVITY_LEVELS.length}. ${level.description}, ${level.steps}.`}
    >
      {size > 0 ? (
        <div style={{ position: 'relative', width: size, height }} aria-hidden="true">
          <Svg width={size} height={height}>
            <Path d={arcPath(cx, cy, r, 0, 1)} stroke={pal.line_dbe3ec} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
            {position > 0 ? (
              <Path d={arcPath(cx, cy, r, 0, position)} stroke={pal.brand_primary} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
            ) : null}
            {/* The end of the fill; at the first level this dot is the whole fill. */}
            <Circle cx={fillEnd.x} cy={fillEnd.y} r={STROKE / 2} fill={pal.brand_primary} />
            {ACTIVITY_LEVELS.map((option, optionIndex) => {
              const stop = pointOnArc(cx, cy, r, positionForIndex(optionIndex));
              return (
                <Circle
                  key={option.id}
                  cx={stop.x}
                  cy={stop.y}
                  r={3}
                  fill={optionIndex <= index ? pal.fg_ffffff : pal.fg_9aa6b8}
                  opacity={0.9}
                />
              );
            })}
          </Svg>
          <div
            style={{
              position: 'absolute',
              left: cx - innerRadius * 0.85,
              width: innerRadius * 1.7,
              top: cy - innerRadius * 0.75,
              height: innerRadius * 0.75 + 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              fontFamily: FONT
            }}
          >
            <div style={{ color: tc.fg_7a8797, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              {index + 1} of {ACTIVITY_LEVELS.length}
            </div>
            <div style={{ color: tc.fg_132536, fontSize: 24, fontWeight: 800, marginTop: 2 }}>{level.title}</div>
          </div>
        </div>
      ) : null}
      <View style={styles.caption}>
        <Text style={styles.description} numberOfLines={1}>
          {level.description}
        </Text>
        <Text style={styles.steps} numberOfLines={1}>
          {level.steps}
        </Text>
      </View>
    </View>
  );
}

const HANDLE = 34;
const TRACK = 8;
/** Space at each end of the track, so the handle never hangs over the edge. */
const INSET = HANDLE / 2 + 2;
const SLIDER_HEIGHT = 52;

/** The five-stop slider that sets the level. Drag the handle or tap a stop; it snaps. */
export function ActivitySlider({ value, onChange }: { value: ActivityLevel; onChange(level: ActivityLevel): void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const index = activityIndex(value);
  const level = ACTIVITY_LEVELS[index];
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
        aria-label="Daily activity level"
        aria-valuemin={1}
        aria-valuemax={ACTIVITY_LEVELS.length}
        aria-valuenow={index + 1}
        aria-valuetext={`${level.title}, ${index + 1} of ${ACTIVITY_LEVELS.length}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (!event.isPrimary) {
            return;
          }
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          chooseFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) {
            chooseFromPointer(event);
          }
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
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
        <Text style={styles.sliderEndLabel}>{ACTIVITY_LEVELS[0].title}</Text>
        <Text style={styles.sliderEndLabel}>{ACTIVITY_LEVELS[last].title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8
  },
  // One line each, so the energy card below stays put whichever level is chosen.
  caption: {
    alignItems: 'center',
    gap: 2
  },
  description: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  steps: {
    color: tc.fg_5c6d80,
    fontSize: 14,
    textAlign: 'center'
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
