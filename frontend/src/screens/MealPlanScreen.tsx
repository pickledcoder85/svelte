import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { toneColor } from '../lib/app-format';
import { formatMealPlanCardDate, formatMealPlanCardWeekday } from '../lib/meal-plan';
import { MEAL_STYLES, styleForSplit } from '../lib/meal-split';
import type { MealPlanDay, UserProfile } from '../types';
import { styles } from './shared/styles';

export interface MealPlanScreenProps {
  foodSessionToken: string | null;
  setCreatePlanOpen: Dispatch<SetStateAction<boolean>>;
  profile: UserProfile | null;
  mealPlanTone: 'checking' | 'live';
  setMealPlanTone: Dispatch<SetStateAction<'checking' | 'live'>>;
  mealPlanStatus: string;
  setMealPlanStatus: Dispatch<SetStateAction<string>>;
  mealPlanError: string | null;
  sortedMealPlanDays: MealPlanDay[];
  selectedMealPlanDate: string | null;
  setSelectedMealPlanDate: Dispatch<SetStateAction<string | null>>;
  todayKey: string;
  selectedMealPlanDay: MealPlanDay | null;
  mealPlanEatenSlots: Record<string, Record<string, string>>;
  toggleMealPlanMeal: (day: MealPlanDay, slotId: string, slotLabel: string) => Promise<void>;
}

export function MealPlanScreen({
  foodSessionToken,
  setCreatePlanOpen,
  profile,
  mealPlanTone,
  setMealPlanTone,
  mealPlanStatus,
  setMealPlanStatus,
  mealPlanError,
  sortedMealPlanDays,
  selectedMealPlanDate,
  setSelectedMealPlanDate,
  todayKey,
  selectedMealPlanDay,
  mealPlanEatenSlots,
  toggleMealPlanMeal
}: MealPlanScreenProps): ReactElement {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Meal plan</Text>
      <Pressable
        style={styles.primaryButton}
        onPress={() => foodSessionToken && setCreatePlanOpen(true)}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonLabel}>✨ Create a meal plan</Text>
      </Pressable>
      <Text style={styles.panelDetail}>
        Meal balance:{' '}
        {(() => {
          // The saved pattern, not an unsaved Profile tap.
          const count = profile?.meals_per_day ?? 3;
          const style = MEAL_STYLES.find((item) => item.id === styleForSplit(count as 3 | 4 | 5, profile?.meal_split ?? []));
          if (!profile?.meal_pattern_chosen) {
            return 'Balanced';
          }
          return style ? `${style.label}${count === 3 ? '' : ` (${count} meals a day)`}` : `Custom (${count} meals a day)`;
        })()}{' '}
        (change it in Profile).
      </Text>
      <Text style={styles.panelDetail}>
        Tap a date card to switch the visible plan, then mark planned meals as eaten for that day.
      </Text>

      <View style={[styles.inlineStatus, { borderColor: toneColor(mealPlanTone) }]}>
        <Text style={styles.inlineStatusLabel}>{mealPlanStatus}</Text>
        {mealPlanError ? <Text style={styles.inlineStatusDetail}>{mealPlanError}</Text> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mealPlanDateStrip}
      >
        {sortedMealPlanDays.map((day) => {
          const active = day.plan_date === selectedMealPlanDate;
          const isToday = day.plan_date === todayKey;

          return (
            <Pressable
              key={day.id}
              style={[styles.mealPlanDateCard, active && styles.mealPlanDateCardActive]}
              onPress={() => {
                setSelectedMealPlanDate(day.plan_date ?? null);
                setMealPlanTone('live');
                setMealPlanStatus(`Showing ${formatMealPlanCardDate(day.plan_date)} plan`);
              }}
            >
              <Text style={[styles.mealPlanDateWeekday, active && styles.mealPlanDateWeekdayActive]}>
                {formatMealPlanCardWeekday(day.plan_date)}
              </Text>
              <Text style={[styles.mealPlanDateLabel, active && styles.mealPlanDateLabelActive]}>
                {formatMealPlanCardDate(day.plan_date)}
              </Text>
              <Text style={[styles.mealPlanDateMeta, active && styles.mealPlanDateMetaActive]}>
                {day.label}
                {isToday ? ' · Today' : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedMealPlanDay ? (
        <View style={styles.detailCard}>
          <View style={styles.recipeRowTitleWrap}>
            <View>
              <Text style={styles.detailTitle}>{selectedMealPlanDay.label}</Text>
              <Text style={styles.detailSubtitle}>
                {selectedMealPlanDay.focus} · {formatMealPlanCardDate(selectedMealPlanDay.plan_date)}
              </Text>
            </View>
            <Text style={styles.detailSubtitle}>
              {selectedMealPlanDay.slots.length} planned meal{selectedMealPlanDay.slots.length === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.foodList}>
            {selectedMealPlanDay.slots.map((slot) => {
              const logged = mealPlanEatenSlots[selectedMealPlanDay.id]?.[slot.id] ?? false;
              const slotItems = slot.items ?? [];

              return (
                <Pressable
                  key={slot.id}
                  style={[styles.mealPlanSlotCard, logged && styles.mealPlanLoggedRow]}
                  onPress={() => toggleMealPlanMeal(selectedMealPlanDay, slot.id, slot.meal_label)}
                >
                  <View style={styles.mealPlanSlotHeader}>
                    <View style={styles.foodRowCopy}>
                      <View style={styles.mealPlanSlotTitleRow}>
                        <Text style={styles.listTitle}>{slot.meal_label}</Text>
                        <Text style={styles.mealPlanSlotTotal}>{slot.calories} kcal</Text>
                      </View>
                      <Text style={styles.listCaption}>{slot.title}</Text>
                    </View>
                    <View style={[styles.mealPlanCheck, logged && styles.mealPlanCheckActive]}>
                      <Text style={[styles.mealPlanCheckLabel, logged && styles.mealPlanCheckLabelActive]}>
                        {logged ? '☑' : '☐'}
                      </Text>
                    </View>
                  </View>
                  {slotItems.length > 0 ? (
                    <View style={styles.mealPlanItemList}>
                        {slotItems.map((item, index) => (
                          <View key={`${slot.id}-plan-item-${index}`} style={styles.mealPlanItemRow}>
                            <View style={styles.mealPlanItemCopy}>
                              <Text style={styles.mealPlanItemName}>
                                {item.name}
                                <Text style={styles.mealPlanItemQuantityInline}> · {item.quantity_label}</Text>
                              </Text>
                            </View>
                            <View style={styles.mealPlanItemInlineMeta}>
                            <Text style={styles.mealPlanItemMacroLine}>
                              P {Math.round(item.macros.protein)}g · C {Math.round(item.macros.carbs)}g · F {Math.round(item.macros.fat)}g
                            </Text>
                            <Text style={styles.mealPlanItemCalories}>{item.calories} kcal</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>No meal plan saved yet</Text>
          <Text style={styles.detailSubtitle}>Save a weekly plan to populate the date cards here.</Text>
        </View>
      )}
    </View>
  );
}
