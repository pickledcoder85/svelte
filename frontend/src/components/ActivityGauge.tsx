/**
 * Setup step 2: a half-circle dial for the five activity levels. The arc fills to the chosen
 * level; drag the handle (or tap the dial) and it snaps to the nearest level. The level's name
 * sits inside the dial and its description underneath, so one spot shows whichever is chosen.
 * Web only (the app ships as a PWA): pointer events on the dial, and a slider for VoiceOver.
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
  isOnDialBand,
  pointOnArc,
  positionForIndex,
  positionForPoint,
  type ActivityLevel
} from '../lib/activity-gauge';
import { usePalette } from '../theme/appearance';
import { tc } from '../theme/palette';

const STROKE = 18;
const HANDLE_RADIUS = 15;
const MAX_WIDTH = 320;
// How far from the arc a touch still counts, for a finger-sized target.
const TOUCH_SLOP = STROKE / 2 + 14;
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

export function ActivityGauge({ value, onChange }: { value: ActivityLevel; onChange(level: ActivityLevel): void }) {
  const pal = usePalette();
  // Start from the screen width so the dial's space is reserved on the first frame; onLayout
  // then gives the exact width.
  const [width, setWidth] = useState(() => Math.max(0, Dimensions.get('window').width - 72));
  const dialRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const index = activityIndex(value);
  const level = ACTIVITY_LEVELS[index];
  const size = Math.min(width, MAX_WIDTH);
  const cx = size / 2;
  const r = size / 2 - HANDLE_RADIUS - 4;
  const cy = r + HANDLE_RADIUS + 4;
  const height = cy + HANDLE_RADIUS + 4;
  const position = positionForIndex(index);
  const handle = pointOnArc(cx, cy, r, position);

  function choose(nextIndex: number) {
    const clamped = Math.min(ACTIVITY_LEVELS.length - 1, Math.max(0, nextIndex));
    if (clamped !== index) {
      onChange(ACTIVITY_LEVELS[clamped].id);
    }
  }

  function pointFor(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = dialRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
  }

  function chooseFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointFor(event);
    if (point) {
      choose(indexForPosition(positionForPoint(cx, cy, point)));
    }
  }

  // The label in the middle is a separate layer that lets the page scroll.
  const innerRadius = r - STROKE / 2 - 6;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowUp: index + 1,
      ArrowRight: index + 1,
      ArrowDown: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: ACTIVITY_LEVELS.length - 1
    };
    if (event.key in steps) {
      event.preventDefault();
      choose(steps[event.key]);
    }
  }

  return (
    <View style={styles.wrap} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {size > 0 ? (
        <div style={{ position: 'relative', width: size, height }}>
          <div
            ref={dialRef}
            role="slider"
            tabIndex={0}
            aria-label="How active you are most days"
            aria-valuemin={1}
            aria-valuemax={ACTIVITY_LEVELS.length}
            aria-valuenow={index + 1}
            aria-valuetext={`${level.title}, ${index + 1} of ${ACTIVITY_LEVELS.length}`}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
              const point = pointFor(event);
              // Only the arc and handle respond, so a finger elsewhere never jumps the level.
              if (!event.isPrimary || !point || !isOnDialBand(cx, cy, r, point, TOUCH_SLOP)) {
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
              position: 'absolute',
              inset: 0,
              // The page must not scroll while a finger drags along the dial.
              touchAction: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              borderRadius: 12
            }}
          >
            <Svg width={size} height={height}>
              <Path d={arcPath(cx, cy, r, 0, 1)} stroke={pal.line_dbe3ec} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
              <Path d={arcPath(cx, cy, r, 0, position)} stroke={pal.brand_primary} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
              {ACTIVITY_LEVELS.map((option, optionIndex) => {
                const stop = pointOnArc(cx, cy, r, positionForIndex(optionIndex));
                return (
                  <Circle
                    key={option.id}
                    cx={stop.x}
                    cy={stop.y}
                    r={3}
                    fill={optionIndex < index ? pal.fg_ffffff : pal.fg_9aa6b8}
                    opacity={optionIndex === index ? 0 : 0.9}
                  />
                );
              })}
              <Circle cx={handle.x} cy={handle.y} r={HANDLE_RADIUS} fill={pal.bg_ffffff} stroke={pal.brand_primary} strokeWidth={4} />
            </Svg>
          </div>
          <div
            aria-hidden="true"
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
              // A sibling of the dial, so a finger here scrolls the page instead of choosing.
              touchAction: 'pan-y',
              fontFamily: FONT,
              userSelect: 'none'
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
  }
});
