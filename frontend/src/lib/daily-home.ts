import type { FoodLogSummary, MacroTargets, MealPlanDay, UserGoal, UserProfile } from '../types';

type ExerciseLike = {
  duration_minutes: number;
  calories_burned: number;
};

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
  plannedMacros: MacroTargets;
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
  exerciseEntries: ExerciseLike[];
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
      plannedMacros: { protein: 0, carbs: 0, fat: 0 },
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
    plannedMacros: mealPlanDay.slots.reduce(
      (totals, slot) => {
        const slotTotals = (slot.items ?? []).reduce(
          (itemTotals, item) => ({
            protein: itemTotals.protein + item.macros.protein,
            carbs: itemTotals.carbs + item.macros.carbs,
            fat: itemTotals.fat + item.macros.fat
          }),
          { protein: 0, carbs: 0, fat: 0 }
        );
        return {
          protein: Math.round((totals.protein + slotTotals.protein) * 10) / 10,
          carbs: Math.round((totals.carbs + slotTotals.carbs) * 10) / 10,
          fat: Math.round((totals.fat + slotTotals.fat) * 10) / 10
        };
      },
      { protein: 0, carbs: 0, fat: 0 }
    ),
    nextMealTitle: nextMeal?.title ?? null
  };
}

export function buildDailyExerciseSummary(exerciseEntries: ExerciseLike[]): DailyExerciseSummary {
  return {
    sessionCount: exerciseEntries.length,
    totalMinutes: exerciseEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0),
    totalCalories: exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0)
  };
}
