/**
 * iOS-style scrolling wheels for the web app. Each wheel is a scroll-snap list, so on iPhone
 * Safari it gets native momentum scrolling and settles exactly on a row. The middle row is the
 * selection; rows fade towards the edges.
 */
import type { CSSProperties, KeyboardEvent } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { indexForOffset, WHEEL_ROW_HEIGHT, WHEEL_VISIBLE_ROWS, type WheelColumn } from '../lib/wheel-picker';

const PAD_ROWS = Math.floor(WHEEL_VISIBLE_ROWS / 2);
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

export function WheelPicker({
  columns,
  indexes,
  onChange
}: {
  columns: WheelColumn[];
  indexes: number[];
  onChange(columnIndex: number, rowIndex: number): void;
}) {
  return (
    <div style={frameStyle}>
      <div style={bandStyle} aria-hidden="true" />
      {columns.map((column, columnIndex) => (
        <div key={column.key} style={columnStyle}>
          <Wheel column={column} index={indexes[columnIndex] ?? 0} onChange={(row) => onChange(columnIndex, row)} />
          {column.unit ? <div style={unitStyle}>{column.unit}</div> : null}
        </div>
      ))}
    </div>
  );
}

function Wheel({ column, index, onChange }: { column: WheelColumn; index: number; onChange(row: number): void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(index);
  // Where a keyboard step is heading, so quick presses during a smooth scroll all count.
  const targetRef = useRef<number | null>(null);
  const count = column.values.length;

  // Start at the given row. Later changes come from the user scrolling this wheel.
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = index * WHEEL_ROW_HEIGHT;
    }
    setCurrent(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column.key, count]);

  function handleScroll() {
    const element = ref.current;
    if (!element) {
      return;
    }
    const row = indexForOffset(element.scrollTop, count);
    if (targetRef.current === row) {
      targetRef.current = null;
    }
    if (row !== current) {
      setCurrent(row);
      onChange(row);
    }
  }

  function scrollToRow(row: number) {
    const clamped = Math.min(count - 1, Math.max(0, row));
    targetRef.current = clamped;
    ref.current?.scrollTo({ top: clamped * WHEEL_ROW_HEIGHT, behavior: 'smooth' });
  }

  // Spinbutton keys follow the value: ArrowUp is a bigger number (the row below).
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = targetRef.current ?? current;
    const steps: Record<string, number> = { ArrowUp: from + 1, ArrowDown: from - 1, PageUp: from + 10, PageDown: from - 10, Home: 0, End: count - 1 };
    if (event.key in steps) {
      event.preventDefault();
      scrollToRow(steps[event.key]);
    }
  }

  return (
    <div
      ref={ref}
      className="relish-wheel"
      style={wheelStyle}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="spinbutton"
      aria-label={column.accessibilityLabel}
      aria-valuenow={column.values[current]}
      aria-valuemin={column.values[0]}
      aria-valuemax={column.values[count - 1]}
      aria-valuetext={`${column.labels[current]}${column.unit ? ` ${column.unit}` : ''}`}
    >
      <div style={{ height: PAD_ROWS * WHEEL_ROW_HEIGHT }} />
      {column.labels.map((label, row) => (
        <div
          key={label}
          style={row === current ? selectedRowStyle : rowStyle}
          onClick={() => scrollToRow(row)}
        >
          {label}
        </div>
      ))}
      <div style={{ height: PAD_ROWS * WHEEL_ROW_HEIGHT }} />
    </div>
  );
}

const WHEEL_HEIGHT = WHEEL_ROW_HEIGHT * WHEEL_VISIBLE_ROWS;
const FADE = 'linear-gradient(to bottom, transparent 0%, #000 32%, #000 68%, transparent 100%)';

const frameStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  height: WHEEL_HEIGHT,
  padding: '0 12px'
};

const bandStyle: CSSProperties = {
  position: 'absolute',
  left: 12,
  right: 12,
  top: PAD_ROWS * WHEEL_ROW_HEIGHT,
  height: WHEEL_ROW_HEIGHT,
  borderRadius: 10,
  backgroundColor: '#eef2f6',
  pointerEvents: 'none'
};

const columnStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: 104,
  minWidth: 0
};

const wheelStyle: CSSProperties = {
  flex: 1,
  height: WHEEL_HEIGHT,
  overflowY: 'scroll',
  scrollSnapType: 'y mandatory',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'none',
  maskImage: FADE,
  WebkitMaskImage: FADE,
  outline: 'none',
  textAlign: 'right',
  fontFamily: FONT,
  fontVariantNumeric: 'tabular-nums',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none'
};

const rowStyle: CSSProperties = {
  height: WHEEL_ROW_HEIGHT,
  lineHeight: `${WHEEL_ROW_HEIGHT}px`,
  scrollSnapAlign: 'center',
  padding: '0 2px',
  fontSize: 21,
  color: '#8a97a8',
  cursor: 'pointer'
};

const selectedRowStyle: CSSProperties = {
  ...rowStyle,
  color: '#132536',
  fontWeight: 600
};

const unitStyle: CSSProperties = {
  width: 44,
  paddingLeft: 6,
  fontFamily: FONT,
  fontSize: 17,
  fontWeight: 600,
  color: '#132536'
};
