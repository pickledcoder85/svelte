/**
 * Wheel ("rolodex") pickers for body measurements in setup: which columns each field has, where
 * the wheels start, and how a selection turns back into the setup drafts (plain strings, in the
 * chosen units, so the existing validation and unit conversion keep working).
 */
import type { BodyDrafts, UnitSystem } from './body-units';

/** Height of one wheel row in px; the wheel shows five rows with the middle one selected. */
export const WHEEL_ROW_HEIGHT = 44;
export const WHEEL_VISIBLE_ROWS = 5;

export type BodyField = 'height' | 'weight' | 'goalWeight' | 'age';

export type WheelColumn = {
  key: string;
  values: number[];
  /** Text for each row, for example "5" or ".4". */
  labels: string[];
  /** Unit shown beside the wheel, for example "ft". */
  unit: string;
  accessibilityLabel: string;
};

export type WheelDrafts = BodyDrafts & { age: string; goalWeight: string };

export function wheelRange(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

/** Index of the value closest to `value`, clamped to the list. */
export function nearestIndex(values: number[], value: number): number {
  if (values.length === 0) {
    return 0;
  }
  let best = 0;
  values.forEach((candidate, index) => {
    if (Math.abs(candidate - value) < Math.abs(values[best] - value)) {
      best = index;
    }
  });
  return best;
}

/** The row a wheel has settled on for a scroll offset. */
export function indexForOffset(offset: number, count: number, rowHeight: number = WHEEL_ROW_HEIGHT): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(count - 1, Math.max(0, Math.round(offset / rowHeight)));
}

const WEIGHT_RANGE: Record<UnitSystem, [number, number]> = { imperial: [70, 450], metric: [30, 205] };

function column(
  key: string,
  values: number[],
  unit: string,
  accessibilityLabel: string,
  label: (value: number) => string = String
): WheelColumn {
  return { key, values, labels: values.map(label), unit, accessibilityLabel };
}

/** Weight is picked in whole pounds or kilograms; tenths are more precision than setup needs. */
function weightColumns(units: UnitSystem, name: string): WheelColumn[] {
  const [min, max] = WEIGHT_RANGE[units];
  const metric = units === 'metric';
  return [column('weight', wheelRange(min, max), metric ? 'kg' : 'lb', `${name}, ${metric ? 'kilograms' : 'pounds'}`)];
}

export function wheelColumns(field: BodyField, units: UnitSystem): WheelColumn[] {
  switch (field) {
    case 'height':
      return units === 'metric'
        ? [column('cm', wheelRange(120, 220), 'cm', 'Height, centimetres')]
        : [column('feet', wheelRange(3, 7), 'ft', 'Height, feet'), column('inches', wheelRange(0, 11), 'in', 'Height, inches')];
    case 'weight':
      return weightColumns(units, 'Weight');
    case 'goalWeight':
      return weightColumns(units, 'Goal weight');
    case 'age':
      return [column('age', wheelRange(13, 100), 'years', 'Age, years')];
  }
}

function positive(value: string): number | null {
  const parsed = Number(value.trim());
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const STARTING_WEIGHT: Record<UnitSystem, number> = { imperial: 165, metric: 75 };

/**
 * Where each wheel starts: the current value when there is one, otherwise a typical value
 * (5 ft 7 in or 170 cm, 165 lb or 75 kg, age 30). An empty goal weight starts 10 lb (5 kg)
 * below the current weight for "lose" and above it for "gain".
 */
export type GoalDirection = 'lose' | 'maintain' | 'gain';

/** How far an empty goal weight starts from the current weight, so Done is already valid. */
const GOAL_STEP: Record<UnitSystem, number> = { imperial: 10, metric: 5 };

export function initialWheelIndexes(
  field: BodyField,
  units: UnitSystem,
  drafts: WheelDrafts,
  goal: GoalDirection = 'maintain'
): number[] {
  const columns = wheelColumns(field, units);
  const at = (columnIndex: number, value: number) => nearestIndex(columns[columnIndex].values, value);

  if (field === 'height') {
    if (units === 'metric') {
      return [at(0, positive(drafts.heightCm) ?? 170)];
    }
    const feet = positive(drafts.heightFeet);
    const inches = Number(drafts.heightInches.trim() || '0');
    return feet === null ? [at(0, 5), at(1, 7)] : [at(0, feet), at(1, Number.isFinite(inches) ? inches : 0)];
  }
  if (field === 'age') {
    return [at(0, positive(drafts.age) ?? 30)];
  }
  const own = positive(field === 'weight' ? drafts.weight : drafts.goalWeight);
  const current = positive(drafts.weight);
  const step = goal === 'lose' ? -GOAL_STEP[units] : goal === 'gain' ? GOAL_STEP[units] : 0;
  const fallback = field === 'goalWeight' && current !== null ? current + step : null;
  return [at(0, Math.round(own ?? fallback ?? STARTING_WEIGHT[units]))];
}

/** The draft fields a picker selection sets. */
export function draftsFromWheel(field: BodyField, units: UnitSystem, indexes: number[]): Partial<WheelDrafts> {
  const values = wheelColumns(field, units).map((wheel, index) => wheel.values[indexes[index] ?? 0]);
  switch (field) {
    case 'height':
      return units === 'metric'
        ? { heightCm: String(values[0]) }
        : { heightFeet: String(values[0]), heightInches: String(values[1]) };
    case 'age':
      return { age: String(values[0]) };
    case 'weight':
    case 'goalWeight':
      return field === 'weight' ? { weight: String(values[0]) } : { goalWeight: String(values[0]) };
  }
}

function trimNumber(value: string): string {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? String(Math.round(parsed * 10) / 10) : value.trim();
}

/** What a field shows, such as "5 ft 10 in", "165.4 lb", or "34 years"; empty when not set. */
export function formatBodyField(field: BodyField, units: UnitSystem, drafts: WheelDrafts): string {
  if (field === 'height') {
    if (units === 'metric') {
      return positive(drafts.heightCm) === null ? '' : `${trimNumber(drafts.heightCm)} cm`;
    }
    return positive(drafts.heightFeet) === null ? '' : `${drafts.heightFeet.trim()} ft ${drafts.heightInches.trim() || '0'} in`;
  }
  if (field === 'age') {
    return positive(drafts.age) === null ? '' : `${drafts.age.trim()} years`;
  }
  const value = field === 'weight' ? drafts.weight : drafts.goalWeight;
  // Whole numbers, matching the wheel (a value converted between lb and kg can have decimals).
  return positive(value) === null ? '' : `${Math.round(Number(value))} ${units === 'metric' ? 'kg' : 'lb'}`;
}
