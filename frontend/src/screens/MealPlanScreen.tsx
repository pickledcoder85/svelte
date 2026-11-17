import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useT } from '../i18n';
import { toneColor } from '../lib/app-format';
import { formatMealPlanCardDate, formatMealPlanCardWeekday } from '../lib/meal-plan';
import { plannedMealLabel } from '../lib/meal-slots';
import { mealStyleText, styleForSplit } from '../lib/meal-split';
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
  const t = useT();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>{t('mealPlan.eyebrow')}</Text>
      <Pressable
        style={styles.primaryButton}
        onPress={() => foodSessionToken && setCreatePlanOpen(true)}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonLabel}>{t('mealPlan.create')}</Text>
      </Pressable>
      <Text style={styles.panelDetail}>
        {t('mealPlan.balance', {
          style: (() => {
            // The saved pattern, not an unsaved Profile tap.
            const count = profile?.meals_per_day ?? 3;
            const style = styleForSplit(count as 3 | 4 | 5, profile?.meal_split ?? []);
            if (!profile?.meal_pattern_chosen) {
              return mealStyleText('balanced', t).label;
            }
            if (!style) {
              return t('mealPlan.custom', { count });
            }
            const label = mealStyleText(style, t).label;
            return count === 3 ? label : t('mealPlan.styleMeals', { style: label, count });
          })()
        })}
      </Text>
      <Text style={styles.panelDetail}>
        {t('mealPlan.hint')}
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
                setMealPlanStatus(t('mealPlan.showing', { date: formatMealPlanCardDate(day.plan_date, t) }));
              }}
            >
              <Text style={[styles.mealPlanDateWeekday, active && styles.mealPlanDateWeekdayActive]}>
                {formatMealPlanCardWeekday(day.plan_date, t)}
              </Text>
              <Text style={[styles.mealPlanDateLabel, active && styles.mealPlanDateLabelActive]}>
                {formatMealPlanCardDate(day.plan_date, t)}
              </Text>
              <Text style={[styles.mealPlanDateMeta, active && styles.mealPlanDateMetaActive]}>
                {day.label}
                {isToday ? t('mealPlan.todaySuffix') : ''}
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
                {selectedMealPlanDay.focus} · {formatMealPlanCardDate(selectedMealPlanDay.plan_date, t)}
              </Text>
            </View>
            <Text style={styles.detailSubtitle}>
              {t('mealPlan.plannedMeals', { count: selectedMealPlanDay.slots.length })}
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
                        <Text style={styles.listTitle}>{plannedMealLabel(slot.meal_label, t)}</Text>
                        <Text style={styles.mealPlanSlotTotal}>{t('common.kcal', { value: slot.calories })}</Text>
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
                              {t('common.macrosGrams', {
                                protein: Math.round(item.macros.protein),
                                carbs: Math.round(item.macros.carbs),
                                fat: Math.round(item.macros.fat)
                              })}
                            </Text>
                            <Text style={styles.mealPlanItemCalories}>{t('common.kcal', { value: item.calories })}</Text>
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
          <Text style={styles.detailTitle}>{t('mealPlan.emptyTitle')}</Text>
          <Text style={styles.detailSubtitle}>{t('mealPlan.emptyHint')}</Text>
        </View>
      )}
    </View>
  );
}
