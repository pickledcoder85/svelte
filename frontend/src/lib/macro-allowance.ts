/**
 * A workout day's macro targets: the same split setup uses, at the day's allowance (the target
 * plus the workout calories added). Mirrors backend/app/services/calculations/macros.py
 * (`fat_share_for`, `macros_for_allowance`): protein comes from body weight, so it stays; fat
 * gets its share of the bigger number (never less than the base fat, which covers the per-kg
 * floor; growing by at most its share of the extra calories); carbs get the rest.
 */
import type { MacroTargets } from '../types';

const FAT_SHARE: Record<string, number> = { lose: 0.25, maintain: 0.3, gain: 0.25 };
const MAINTENANCE_FOCUS_FAT_SHARE: Record<string, number> = { steady: 0.3, build_muscle: 0.27, fuel_training: 0.22 };

export function fatShareFor(goalType: string | null | undefined, goalPace: string | null | undefined): number {
  if (goalType === 'maintain' && goalPace && goalPace in MAINTENANCE_FOCUS_FAT_SHARE) {
    return MAINTENANCE_FOCUS_FAT_SHARE[goalPace];
  }
  return FAT_SHARE[goalType ?? ''] ?? FAT_SHARE.lose;
}

export function macroAllowance(base: MacroTargets, baseCalories: number, allowance: number, fatShare: number): MacroTargets {
  const extra = allowance - baseCalories;
  if (!(extra > 0) || !(baseCalories > 0)) {
    return base;
  }
  // Its share of the allowance, but never more growth than its share of the extra calories.
  const fat = Math.max(base.fat, Math.min((allowance * fatShare) / 9, base.fat + (extra * fatShare) / 9));
  const carbs = base.carbs + Math.max(0, extra - (fat - base.fat) * 9) / 4;
  return { protein: base.protein, carbs: Math.round(carbs), fat: Math.round(fat) };
}
