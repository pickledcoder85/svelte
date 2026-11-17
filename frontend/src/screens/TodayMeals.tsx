import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { formatNumber, useT } from '../i18n';
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
  const t = useT();
  return (
    <View style={styles.homeSection}>
      <View style={styles.todaySectionHeader}>
        <Text style={styles.detailTitle}>{t('meals.title')}</Text>
        <Pressable
          style={styles.todayAddButton}
          onPress={() => setOpenSheet('add-food')}
          disabled={!foodSessionToken}
          accessibilityRole="button"
          accessibilityLabel={t('meals.addFood')}
        >
          <Text style={styles.todayAddButtonLabel}>+</Text>
        </Pressable>
      </View>
      {homeOpenPlannedMeals.length === 0 && homeFoodLog.entries.length === 0 ? (
        <View style={styles.todayEmpty}>
          <Text style={styles.dailyHomeEmptyState}>{t('meals.emptyTitle')}</Text>
          <Text style={styles.todayHint}>{t('meals.emptyHint')}</Text>
        </View>
      ) : null}
      {homeMealPlanDay
        ? homeOpenPlannedMeals.map((slot) => {
            const deleteKey = `slot:${slot.id}`;
            return (
              <View key={slot.id} style={styles.todayRow}>
                <View style={styles.listRowCopyFlex}>
                  <Text style={styles.todayRowTag}>{t('meals.planned', { meal: slot.meal_label })}</Text>
                  <Text style={styles.listTitle}>{slot.title}</Text>
                  <Text style={styles.listCaption}>{t('common.kcal', { value: slot.calories })}</Text>
                </View>
                <Pressable
                  style={styles.inlinePillButton}
                  onPress={() => void toggleMealPlanMeal(homeMealPlanDay, slot.id, slot.meal_label)}
                  accessibilityRole="button"
                  accessibilityLabel={t('meals.ateItem', { name: slot.title })}
                >
                  <Text style={styles.inlinePillButtonLabel}>{t('meals.ateIt')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                  onPress={() => void removeMealPlanSlot(slot.id)}
                  disabled={entryActionBusyKey === deleteKey}
                  accessibilityRole="button"
                  accessibilityLabel={
                    confirmDeleteKey === deleteKey ? t('common.confirmSkipItem', { name: slot.title }) : t('common.skipItem', { name: slot.title })
                  }
                >
                  <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                    {confirmDeleteKey === deleteKey ? t('common.skipConfirm') : '✕'}
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
            <Text style={styles.todayMealGroupCalories}>{t('common.kcal', { value: formatNumber(group.calories, undefined, t.locale) })}</Text>
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
                        accessibilityLabel={t('meals.amountInGrams', { name: entry.food_name })}
                      />
                      <Text style={styles.listCaption}>g</Text>
                      <Pressable
                        style={styles.inlinePillButton}
                        disabled={entryActionBusyKey === deleteKey}
                        onPress={() => void saveHomeFoodEntryEdit(entry)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inlinePillButtonLabel}>{entryActionBusyKey === deleteKey ? t('common.saving') : t('common.save')}</Text>
                      </Pressable>
                      <Pressable style={styles.inlinePillButton} onPress={() => setEditingFoodEntryId(null)} accessibilityRole="button">
                        <Text style={styles.inlinePillButtonLabel}>{t('common.cancel')}</Text>
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
                    accessibilityLabel={
                      entry.grams > 0 ? t('meals.editAmount', { name: entry.food_name, grams: Math.round(entry.grams) }) : entry.food_name
                    }
                  >
                    <Text style={styles.listTitle}>{entry.food_name}</Text>
                    <Text style={styles.listCaption}>
                      {entry.quantity_label ? `${entry.quantity_label} · ` : entry.grams > 0 ? `${Math.round(entry.grams)} g · ` : ''}
                      {t('common.macrosGrams', {
                        protein: Math.round(entry.macros.protein),
                        carbs: Math.round(entry.macros.carbs),
                        fat: Math.round(entry.macros.fat)
                      })}
                    </Text>
                  </Pressable>
                )}
                <Text style={styles.listMetric}>{t('common.kcal', { value: Math.round(entry.calories) })}</Text>
                <Pressable
                  style={[styles.todayRemoveButton, confirmDeleteKey === deleteKey && styles.todayRemoveConfirm]}
                  onPress={() => void removeHomeFoodEntry(entry)}
                  disabled={entryActionBusyKey === deleteKey}
                  accessibilityRole="button"
                  accessibilityLabel={
                    confirmDeleteKey === deleteKey
                      ? t('common.confirmDeleteItem', { name: entry.food_name })
                      : t('common.deleteItem', { name: entry.food_name })
                  }
                >
                  <Text style={[styles.todayRemoveLabel, confirmDeleteKey === deleteKey && styles.todayRemoveConfirmLabel]}>
                    {confirmDeleteKey === deleteKey ? t('common.deleteConfirm') : '✕'}
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
