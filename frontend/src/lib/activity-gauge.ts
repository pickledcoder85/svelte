/**
 * The activity-level gauge on setup step 2: five levels around a half-circle dial. The arc
 * fills to the chosen level and a handle sits on it; dragging snaps to the nearest level.
 *
 * Positions run from t = 0 (left end of the dial) to t = 1 (right end). Each level owns one
 * fifth of the arc and its handle sits in the middle of that fifth.
 */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';

/** Daily movement only; workouts are logged separately. Step counts are rough guides. */
export const ACTIVITY_LEVELS: Array<{ id: ActivityLevel; title: string; description: string }> = [
  { id: 'sedentary', title: 'Sedentary', description: 'Desk job, little walking (under about 5,000 steps)' },
  { id: 'light', title: 'Light', description: 'Some walking, on your feet now and then (about 5,000–7,500 steps)' },
  { id: 'moderate', title: 'Moderate', description: 'On your feet a good part of the day (about 7,500–10,000 steps)' },
  {
    id: 'very_active',
    title: 'Very active',
    description: 'On your feet most of the day, like retail, nursing, or teaching (about 10,000–15,000 steps)'
  },
  {
    id: 'extra_active',
    title: 'Extra active',
    description: 'Physical work all day, like construction or farm work (15,000+ steps)'
  }
];

export function activityIndex(level: ActivityLevel): number {
  const index = ACTIVITY_LEVELS.findIndex((option) => option.id === level);
  return index < 0 ? 2 : index;
}

/** Where a level's handle sits along the arc (0 to 1). */
export function positionForIndex(index: number): number {
  const count = ACTIVITY_LEVELS.length;
  const clamped = Math.min(count - 1, Math.max(0, index));
  return (clamped + 0.5) / count;
}

/** The level for a position along the arc. */
export function indexForPosition(t: number): number {
  const count = ACTIVITY_LEVELS.length;
  return Math.min(count - 1, Math.max(0, Math.floor(t * count)));
}

export type Point = { x: number; y: number };

/** A point on the dial for position t. The dial is the top half of a circle. */
export function pointOnArc(cx: number, cy: number, r: number, t: number): Point {
  const angle = Math.PI * (1 - t); // t = 0 is the left end (180 degrees), t = 1 the right end
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

/**
 * The arc position closest to a touch. Touches below the dial's centre line count as the
 * nearer end, so dragging past either end stays on the first or last level.
 */
export function positionForPoint(cx: number, cy: number, point: Point): number {
  const dx = point.x - cx;
  const dy = cy - point.y;
  if (dy <= 0) {
    return dx < 0 ? 0 : 1;
  }
  const angle = Math.atan2(dy, dx); // 0 (right) .. PI (left)
  return Math.min(1, Math.max(0, 1 - angle / Math.PI));
}

/**
 * Whether a touch is on the dial's band (within `slop` of the arc, above the bottom of the
 * stroke). Touches elsewhere in the box are ignored so they don't jump the level.
 */
export function isOnDialBand(cx: number, cy: number, r: number, point: Point, slop: number): boolean {
  if (point.y > cy + slop) {
    return false;
  }
  const distance = Math.hypot(point.x - cx, point.y - cy);
  return Math.abs(distance - r) <= slop;
}

/** SVG path for the arc between two positions (clockwise, over the top). */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const start = pointOnArc(cx, cy, r, Math.min(from, to));
  const end = pointOnArc(cx, cy, r, Math.max(from, to));
  const round = (value: number) => Math.round(value * 100) / 100;
  return `M ${round(start.x)} ${round(start.y)} A ${r} ${r} 0 0 1 ${round(end.x)} ${round(end.y)}`;
}

/** Maintenance calories for a level from the preview, falling back to the preview's own value. */
export function maintenanceForLevel(
  preview: { maintenance_calories: number; maintenance_by_activity?: Partial<Record<ActivityLevel, number>> } | null,
  level: ActivityLevel
): number | null {
  if (!preview) {
    return null;
  }
  return preview.maintenance_by_activity?.[level] ?? preview.maintenance_calories;
}
