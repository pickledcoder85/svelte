/**
 * The activity level on setup step 2: a half-circle dial shows the chosen level (the arc fills
 * to it) and a slider at the bottom of the card sets it, snapping to the nearest of five levels.
 *
 * Positions run from t = 0 (left end of the dial) to t = 1 (right end). The five levels sit
 * evenly from end to end, so Sedentary is the empty start and Extra active fills the arc.
 */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';

/** Daily movement only; workouts are logged separately. Step counts are rough guides. */
export const ACTIVITY_LEVELS: Array<{ id: ActivityLevel; title: string; description: string; steps: string }> = [
  { id: 'sedentary', title: 'Sedentary', description: 'Mostly sitting', steps: '< 5,000 steps' },
  { id: 'light', title: 'Light', description: 'Some walking', steps: '5,000–7,500 steps' },
  { id: 'moderate', title: 'Moderate', description: 'On your feet often', steps: '7,500–10,000 steps' },
  { id: 'very_active', title: 'Very active', description: 'On your feet most of the day', steps: '10,000–15,000 steps' },
  { id: 'extra_active', title: 'Extra active', description: 'Physical work all day', steps: '15,000+ steps' }
];

export function activityIndex(level: ActivityLevel): number {
  const index = ACTIVITY_LEVELS.findIndex((option) => option.id === level);
  return index < 0 ? 2 : index;
}

/** Where a level's handle sits along the arc: 0 for the first level, 1 for the last. */
export function positionForIndex(index: number): number {
  const last = ACTIVITY_LEVELS.length - 1;
  return Math.min(last, Math.max(0, index)) / last;
}

/** The level nearest a position along the arc. */
export function indexForPosition(t: number): number {
  const last = ACTIVITY_LEVELS.length - 1;
  return Math.min(last, Math.max(0, Math.round(t * last)));
}

export type Point = { x: number; y: number };

/** A point on the dial for position t. The dial is the top half of a circle. */
export function pointOnArc(cx: number, cy: number, r: number, t: number): Point {
  const angle = Math.PI * (1 - t); // t = 0 is the left end (180 degrees), t = 1 the right end
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

/**
 * The position (0 to 1) for a touch on the slider. `inset` is the space kept at each end of
 * the track for the handle, so the first and last stops are reachable with a thumb.
 */
export function sliderPosition(x: number, width: number, inset: number): number {
  const span = width - inset * 2;
  if (span <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (x - inset) / span));
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
