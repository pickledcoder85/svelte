import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { MealGroup } from '../lib/meal-slots';
import type { FoodLogEntry, FoodLogSummary, MealPlanDay, MealPlanSlot } from '../types';
import { styles } from './shared/styles';

export interface TodayMealsProps {
  setOpenSheet: (sheet: 'add-food') => void;
  foodSessionToken: string | null;
  homeOpenPlannedMeals: MealPlanSlot[];
  homeFoodLog: FoodLogSummary;
  homeMealPlanDay: MealPlanDay | null;
  toggleMealPlanMeal: (day: MealPlanDay, slotId: string, slotLabel: string) => Promise<void>;
  confirmDeleteKey: string | null;
  setConfirmDeleteKey: Dispatch<SetStateAction<string | null>>;
  removeMealPlanSlot: (slotId: string) => Promise<void>;
  entryActionBusyKey: string | null;
  foodLogError: string | null;
  setFoodLogError: Dispatch<SetStateAction<string | null>>;
  homeMealGroups: MealGroup[];
  editingFoodEntryId: string | null;
  setEditingFoodEntryId: Dispatch<SetStateAction<string | null>>;
  editingFoodGramsDraft: string;
  setEditingFoodGramsDraft: Dispatch<SetStateAction<string>>;
  saveHomeFoodEntryEdit: (entry: FoodLogEntry) => Promise<void>;
  removeHomeFoodEntry: (entry: FoodLogEntry) => Promise<void>;
}

export function TodayMeals({
  setOpenSheet,
  foodSessionToken,
  homeOpenPlannedMeals,
  homeFoodLog,
  homeMealPlanDay,
  toggleMealPlanMeal,
  confirmDeleteKey,
  setConfirmDeleteKey,
  removeMealPlanSlot,
  entryActionBusyKey,
  foodLogError,
  setFoodLogError,
  homeMealGroups,
  editingFoodEntryId,
  setEditingFoodEntryId,
  editingFoodGramsDraft,
  setEditingFoodGramsDraft,
  saveHomeFoodEntryEdit,
  removeHomeFoodEntry
}: TodayMealsProps): ReactElement {
  return (
    <View style={styles.homeSection}>
      <View style={styles.todaySectionHeader}>
        <Text style={styles.detailTitle}>Meals</Text>
        <Pressable
          style={styles.todayAddButton}
          onPress={() => setOpenSheet('add-food')}
          disabled={!foodSessionToken}
          accessibilityRole="button"
          accessibilityLabel="Add a food"
        >
          <Text style={styles.todayAddButtonLabel}>+</Text>
        </Pressable>
      </View>
      {homeOpenPlannedMeals.length === 0 && homeFoodLog.entries.length === 0 ? (
        <View style={styles.todayEmpty}>
          <Text style={styles.dailyHomeEmptyState}>Nothing eaten yet.</Text>
          <Text style={styles.todayHint}>Tap + to search, scan, or add quick calories.</Text>
        </View>
      ) : null}
      {homeMealPlanDay
        ? homeOpenPlannedMeals.map((slot) => {
            const deleteKey = `slot:${slot.id}`;
            return (
              <View key={slot.id} style={styles.todayRow}>
                <View style={styles.listRowCopyFlex}>
                  <Text style={styles.todayRowTag}>Planned · {slot.meal_label}</Text>
                  <Text style={styles.listTitle}>{slot.title}</Text>
                  <Text style={styles.listCaption}>{slot.calories} kcal</Text>
                </View>
                <Pressable
                  style={styles.inlinePillButton}
                  onPress={() => void toggleMealPlanMeal(homeMealPlanDay, slot.id, slot.meal_label)}
                  accessibilityRole="button"
                  accessibilityLabel={`I ate ${slot.title}`}
                >
                  <Text style={styles.inlinePillButtonLabel}>✓ Ate it</Text>
                </Pressable>
                <Pressable
                  style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                  onPress={() => void removeMealPlanSlot(slot.id)}
                  disabled={entryActionBusyKey === deleteKey}
                  accessibilityRole="button"
                  accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm skipping ${slot.title}` : `Skip ${slot.title}`}
                >
                  <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                    {confirmDeleteKey === deleteKey ? 'Skip?' : '✕'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        : null}
      {foodLogError ? <Text style={styles.settingsError}>{foodLogError}</Text> : null}
      {homeMealGroups.map((group) => (
        <View key={group.slot} style={styles.todayMealGroup}>
          <View style={styles.todayMealGroupHeader}>
            <Text style={styles.todayMealGroupLabel}>{group.label}</Text>
            <Text style={styles.todayMealGroupCalories}>{group.calories.toLocaleString('en-US')} kcal</Text>
          </View>
          {group.entries.map((entry) => {
            const deleteKey = `food:${entry.id}`;
            return (
              <View key={entry.id} style={styles.todayRow}>
                {editingFoodEntryId === entry.id ? (
                  <View style={[styles.listRowCopyFlex, styles.todayEditRow]}>
                    <Text style={styles.listTitle} numberOfLines={1}>{entry.food_name}</Text>
                    <View style={styles.todayEditControls}>
                      <TextInput
                        style={styles.todayEditInput}
                        value={editingFoodGramsDraft}
                        onChangeText={(text) => setEditingFoodGramsDraft(text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        autoFocus
                        accessibilityLabel={`Amount of ${entry.food_name} in grams`}
                      />
                      <Text style={styles.listCaption}>g</Text>
                      <Pressable
                        style={styles.inlinePillButton}
                        disabled={entryActionBusyKey === deleteKey}
                        onPress={() => void saveHomeFoodEntryEdit(entry)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inlinePillButtonLabel}>{entryActionBusyKey === deleteKey ? 'Saving…' : 'Save'}</Text>
                      </Pressable>
                      <Pressable style={styles.inlinePillButton} onPress={() => setEditingFoodEntryId(null)} accessibilityRole="button">
                        <Text style={styles.inlinePillButtonLabel}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.listRowCopyFlex}
                    onPress={() => {
                      if (entry.grams > 0) {
                        setEditingFoodEntryId(entry.id);
                        setEditingFoodGramsDraft(String(Math.round(entry.grams * 10) / 10));
                        setConfirmDeleteKey(null);
                        setFoodLogError(null);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.food_name}${entry.grams > 0 ? `, ${Math.round(entry.grams)} g. Tap to change the amount` : ''}`}
                  >
                    <Text style={styles.listTitle}>{entry.food_name}</Text>
                    <Text style={styles.listCaption}>
                      {entry.quantity_label ? `${entry.quantity_label} · ` : entry.grams > 0 ? `${Math.round(entry.grams)} g · ` : ''}P {Math.round(entry.macros.protein)}g · C {Math.round(entry.macros.carbs)}g · F {Math.round(entry.macros.fat)}g
                    </Text>
                  </Pressable>
                )}
                <Text style={styles.listMetric}>{Math.round(entry.calories)} kcal</Text>
                <Pressable
                  style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                  onPress={() => void removeHomeFoodEntry(entry)}
                  disabled={entryActionBusyKey === deleteKey}
                  accessibilityRole="button"
                  accessibilityLabel={confirmDeleteKey === deleteKey ? `Confirm deleting ${entry.food_name}` : `Delete ${entry.food_name}`}
                >
                  <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                    {confirmDeleteKey === deleteKey ? 'Delete?' : '✕'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
