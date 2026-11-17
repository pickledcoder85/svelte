import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { View } from 'react-native';

import { DayHeader } from '../components/DayHeader';
import { styles } from './shared/styles';
import { TodayMeals, type TodayMealsProps } from './TodayMeals';
import { TodayOverview, type TodayOverviewProps } from './TodayOverview';
import { TodayWater, type TodayWaterProps } from './TodayWater';
import { TodayWorkouts, type TodayWorkoutsProps } from './TodayWorkouts';

export type TodayScreenProps = Omit<TodayOverviewProps & TodayWaterProps & TodayWorkoutsProps & TodayMealsProps, 'setOpenSheet'> & {
  setSelectedHomeDate: Dispatch<SetStateAction<string>>;
  setOpenSheet: (sheet: 'add-workout' | 'add-food') => void;
};

export function TodayScreen(props: TodayScreenProps): ReactElement {
  const { selectedHomeDate, todayKey, setSelectedHomeDate } = props;
  return (
    <View style={styles.dashboardStack}>
      <View style={styles.homeSection}>
        <DayHeader selected={selectedHomeDate} today={todayKey} onSelect={setSelectedHomeDate} />
      </View>

      {/* Overview: calories left, the eaten bar, then the three macros. */}
      <TodayOverview
        dailyHomeTargets={props.dailyHomeTargets}
        homeCalorieBudget={props.homeCalorieBudget}
        profile={props.profile}
        handleSectionChange={props.handleSectionChange}
        homeConsumedMacros={props.homeConsumedMacros}
      />

      {/* Water: glasses against the daily goal. */}
      <TodayWater
        homeWaterMl={props.homeWaterMl}
        profile={props.profile}
        waterBusy={props.waterBusy}
        homeWaterToday={props.homeWaterToday}
        addHomeWater={props.addHomeWater}
        undoHomeWater={props.undoHomeWater}
      />

      {/* Workouts: planned first (done or skip), then what was recorded. */}
      <TodayWorkouts
        setOpenSheet={props.setOpenSheet}
        homeOpenPlannedWorkouts={props.homeOpenPlannedWorkouts}
        homeCompletedExerciseEntries={props.homeCompletedExerciseEntries}
        selectedHomeDate={selectedHomeDate}
        todayKey={todayKey}
        togglePlannedExerciseCompletion={props.togglePlannedExerciseCompletion}
        plannedExerciseUpdatingId={props.plannedExerciseUpdatingId}
        confirmDeleteKey={props.confirmDeleteKey}
        setConfirmDeleteKey={props.setConfirmDeleteKey}
        removePlannedExerciseEntry={props.removePlannedExerciseEntry}
        setWorkoutDetailId={props.setWorkoutDetailId}
        removeExerciseEntry={props.removeExerciseEntry}
        entryActionBusyKey={props.entryActionBusyKey}
      />

      {/* Meals: planned meals first (ate it or skip), then what was eaten. */}
      <TodayMeals
        setOpenSheet={props.setOpenSheet}
        foodSessionToken={props.foodSessionToken}
        homeOpenPlannedMeals={props.homeOpenPlannedMeals}
        homeFoodLog={props.homeFoodLog}
        homeMealPlanDay={props.homeMealPlanDay}
        toggleMealPlanMeal={props.toggleMealPlanMeal}
        confirmDeleteKey={props.confirmDeleteKey}
        setConfirmDeleteKey={props.setConfirmDeleteKey}
        removeMealPlanSlot={props.removeMealPlanSlot}
        entryActionBusyKey={props.entryActionBusyKey}
        foodLogError={props.foodLogError}
        setFoodLogError={props.setFoodLogError}
        homeMealGroups={props.homeMealGroups}
        editingFoodEntryId={props.editingFoodEntryId}
        setEditingFoodEntryId={props.setEditingFoodEntryId}
        editingFoodGramsDraft={props.editingFoodGramsDraft}
        setEditingFoodGramsDraft={props.setEditingFoodGramsDraft}
        saveHomeFoodEntryEdit={props.saveHomeFoodEntryEdit}
        removeHomeFoodEntry={props.removeHomeFoodEntry}
      />
    </View>
  );
}
