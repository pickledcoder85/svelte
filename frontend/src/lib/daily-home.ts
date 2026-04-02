import type {
  ExerciseEntry,
  FoodLogSummary,
  MacroTargets,
  MealPlanDay,
  UserGoal,
  UserProfile
} from '../types';

export interface DailyTargetSummary {
  calorieTarget: number;
  intakeCalories: number;
  exerciseCalories: number;
  netCalories: number;
  remainingCalories: number;
  macroTargets: MacroTargets;
  macroPercentages: MacroTargets;
  fiberTarget: number;
}

export interface DailyMealPlanSummary {
  hasPlan: boolean;
  dayLabel: string | null;
  focus: string | null;
  plannedMeals: number;
  completedMeals: number;
  plannedCalories: number;
  nextMealTitle: string | null;
}

export interface DailyExerciseSummary {
  sessionCount: number;
  totalMinutes: number;
  totalCalories: number;
}

export function calculateMacroPercentages(targets: MacroTargets): MacroTargets {
  const totalMacroCalories = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
  if (totalMacroCalories <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round(((targets.protein * 4) / totalMacroCalories) * 100),
    carbs: Math.round(((targets.carbs * 4) / totalMacroCalories) * 100),
    fat: Math.round(((targets.fat * 9) / totalMacroCalories) * 100)
  };
}

export function buildDailyTargetSummary({
  goal,
  profile,
  foodLog,
  exerciseEntries
}: {
  goal: UserGoal | null;
  profile: UserProfile | null;
  foodLog: FoodLogSummary;
  exerciseEntries: ExerciseEntry[];
}): DailyTargetSummary {
  const calorieTarget = Math.round(goal?.calorie_goal ?? profile?.initial_calorie_target ?? 0);
  const macroTargets = {
    protein: Math.round(goal?.protein_goal ?? profile?.protein_target_g ?? 0),
    carbs: Math.round(goal?.carbs_goal ?? profile?.carbs_target_g ?? 0),
    fat: Math.round(goal?.fat_goal ?? profile?.fat_target_g ?? 0)
  };
  const intakeCalories = Math.round(foodLog.totals.calories ?? 0);
  const exerciseCalories = Math.round(
    exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)
  );
  const netCalories = intakeCalories - exerciseCalories;

  return {
    calorieTarget,
    intakeCalories,
    exerciseCalories,
    netCalories,
    remainingCalories: calorieTarget - netCalories,
    macroTargets,
    macroPercentages: calculateMacroPercentages(macroTargets),
    fiberTarget: Math.round(goal?.fiber_goal ?? profile?.fiber_target_g ?? 0)
  };
}

export function buildDailyMealPlanSummary(
  mealPlanDay: MealPlanDay | null,
  eatenSlots: Record<string, string>
): DailyMealPlanSummary {
  if (!mealPlanDay) {
    return {
      hasPlan: false,
      dayLabel: null,
      focus: null,
      plannedMeals: 0,
      completedMeals: 0,
      plannedCalories: 0,
      nextMealTitle: null
    };
  }

  const completedMeals = mealPlanDay.slots.filter((slot) => Boolean(eatenSlots[slot.id])).length;
  const nextMeal = mealPlanDay.slots.find((slot) => !eatenSlots[slot.id]) ?? null;

  return {
    hasPlan: true,
    dayLabel: mealPlanDay.label,
    focus: mealPlanDay.focus,
    plannedMeals: mealPlanDay.slots.length,
    completedMeals,
    plannedCalories: mealPlanDay.slots.reduce((sum, slot) => sum + slot.calories, 0),
    nextMealTitle: nextMeal?.title ?? null
  };
}

export function buildDailyExerciseSummary(exerciseEntries: ExerciseEntry[]): DailyExerciseSummary {
  return {
    sessionCount: exerciseEntries.length,
    totalMinutes: exerciseEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0),
    totalCalories: exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)
  };
}
