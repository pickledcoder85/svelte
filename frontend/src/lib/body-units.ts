/**
 * Units for body measurements during setup. The server always stores height in cm and weight
 * in lb; these helpers convert what the user types in either system.
 */

export type UnitSystem = 'imperial' | 'metric';

export const CM_PER_INCH = 2.54;
export const LB_PER_KG = 2.20462262;

// Countries that use pounds and feet/inches for body measurements.
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Imperial for US-style locales (for example "en-US"), metric otherwise. */
export function defaultUnitSystemForLocale(locale: string | null | undefined): UnitSystem {
  const region = (locale ?? '').split(/[-_]/)[1]?.toUpperCase();
  return region && IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
}

export function deviceLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
  } catch {
    return null;
  }
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function parsePositive(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegative(value: string): number | null {
  if (value.trim() === '') {
    return 0;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export type BodyDrafts = {
  heightFeet: string;
  heightInches: string;
  heightCm: string;
  weight: string;
};

/** Height in cm and weight in lb from the drafts, or null if anything is missing or invalid. */
export function bodyMeasurementsFromDrafts(
  units: UnitSystem,
  drafts: BodyDrafts
): { height_cm: number; weight_lbs: number } | null {
  const weight = parsePositive(drafts.weight);
  if (weight === null) {
    return null;
  }
  let heightCm: number | null;
  if (units === 'metric') {
    heightCm = parsePositive(drafts.heightCm);
  } else {
    const feet = parsePositive(drafts.heightFeet);
    const inches = parseNonNegative(drafts.heightInches);
    heightCm = feet === null || inches === null || inches >= 12 ? null : (feet * 12 + inches) * CM_PER_INCH;
  }
  if (heightCm === null) {
    return null;
  }
  return {
    height_cm: round(heightCm, 1),
    weight_lbs: round(units === 'metric' ? weight * LB_PER_KG : weight, 1)
  };
}

/** Converts what has been typed so far when the user switches unit systems. Empty stays empty. */
export function convertBodyDrafts(drafts: BodyDrafts, from: UnitSystem, to: UnitSystem): BodyDrafts {
  if (from === to) {
    return drafts;
  }
  const weight = parsePositive(drafts.weight);
  const convertedWeight =
    weight === null ? drafts.weight : String(round(to === 'metric' ? weight / LB_PER_KG : weight * LB_PER_KG, 1));

  if (to === 'metric') {
    const feet = parsePositive(drafts.heightFeet);
    const inches = parseNonNegative(drafts.heightInches);
    const heightCm =
      feet === null || inches === null ? drafts.heightCm : String(Math.round((feet * 12 + inches) * CM_PER_INCH));
    return { ...drafts, heightCm, weight: convertedWeight };
  }

  const cm = parsePositive(drafts.heightCm);
  if (cm === null) {
    return { ...drafts, weight: convertedWeight };
  }
  const totalInches = Math.round(cm / CM_PER_INCH);
  return {
    ...drafts,
    heightFeet: String(Math.floor(totalInches / 12)),
    heightInches: String(totalInches % 12),
    weight: convertedWeight
  };
}
