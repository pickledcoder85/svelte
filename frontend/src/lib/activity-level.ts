/**
 * The activity level on setup step 2 ("Daily activity"). Two bars show energy at rest (BMR) and
 * with the chosen activity; a five-stop slider under them sets the level, and the activity bar
 * grows as it moves right.
 *
 * Slider positions run from t = 0 (left end) to t = 1 (right end). The five levels sit evenly
 * from end to end.
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
  return index < 0 ? 0 : index;
}

/** Where a level's stop sits along the slider: 0 for the first level, 1 for the last. */
export function positionForIndex(index: number): number {
  const last = ACTIVITY_LEVELS.length - 1;
  return Math.min(last, Math.max(0, index)) / last;
}

/** The level nearest a position along the slider. */
export function indexForPosition(t: number): number {
  const last = ACTIVITY_LEVELS.length - 1;
  return Math.min(last, Math.max(0, Math.round(t * last)));
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

export type ActivityBars = {
  /** Width of the at-rest (BMR) bar, 0 to 100. */
  rest: number;
  /** Width of the with-activity bar, 0 to 100. The first `rest` of it is the BMR part. */
  active: number;
  /** Calories the chosen activity adds on top of BMR. */
  fromActivity: number;
};

/**
 * Bar widths for the energy bars. Both are scaled to the most active level, so the activity
 * bar starts short at Sedentary and only fills the track at Extra active.
 */
export function activityBars(
  bmr: number,
  maintenance: number,
  maintenanceByLevel: Partial<Record<ActivityLevel, number>> | undefined
): ActivityBars {
  const top = Math.max(bmr, maintenance, ...Object.values(maintenanceByLevel ?? {}), 1);
  return {
    rest: Math.round((bmr / top) * 100),
    active: Math.round((maintenance / top) * 100),
    fromActivity: Math.max(0, Math.round(maintenance - bmr))
  };
}
