/**
 * Repeat a meal. From Meals ＋ ("Repeat a recent meal"): the meals logged in the last 30 days,
 * each distinct meal once, newest first, with a search by food; tap one to log it again on the
 * day shown or add it to a day's plan. From a logged meal's ⋯ on Today: straight to "Add to a
 * plan" (tomorrow first). A day that already has that meal planned asks Replace or Keep.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatNumber, useT } from '../i18n';
import { createMealPlan, fetchFoodLogsBetween, logFood, logQuickCalories } from '../lib/api';
import { addDaysToDateKey } from '../lib/dates';
import { mealSlotLabel } from '../lib/meal-slots';
import { filterMeals, mealTitle, recentMeals, type RecentMeal } from '../lib/recent-meals';
import { tc } from '../theme/palette';
import type { MealPlanDay } from '../types';

const LOOKBACK_DAYS = 30;
const PLAN_DAYS = 7;

export function RepeatMealSheet({
  accessToken,
  today,
  logDate,
  dayName,
  existingPlans,
  initialMeal,
  onLogged,
  onPlanned,
  onClose
}: {
  accessToken: string;
  today: string;
  /** The day shown on Today (where "Log it" goes). */
  logDate: string;
  /** "today" or the day's name, for the Log button. */
  dayName: string;
  existingPlans: MealPlanDay[];
  /** Open straight on "Add to a plan" for this meal (from a logged meal's ⋯). */
  initialMeal?: RecentMeal | null;
  onLogged(): void;
  onPlanned(): void;
  onClose(): void;
}) {
  const t = useT();
  const [meals, setMeals] = useState<RecentMeal[] | null>(initialMeal ? [] : null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<RecentMeal | null>(initialMeal ?? null);
  const [planning, setPlanning] = useState(Boolean(initialMeal));
  const [planDate, setPlanDate] = useState(addDaysToDateKey(today, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Items of the picked meal already logged (so a retry after a failure never logs twice).
  const [loggedItems, setLoggedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (initialMeal) {
      return;
    }
    let cancelled = false;
    fetchFoodLogsBetween(addDaysToDateKey(today, -(LOOKBACK_DAYS - 1)), today, accessToken)
      .then((logs) => {
        if (!cancelled) {
          setMeals(recentMeals(logs));
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('repeat.loadError'));
          setMeals([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, today, initialMeal, t]);

  const shown = useMemo(() => filterMeals(meals ?? [], query), [meals, query]);
  const planDays = useMemo(() => Array.from({ length: PLAN_DAYS + 1 }, (_, index) => addDaysToDateKey(today, index)), [today]);
  const shortDay = (date: string) =>
    date === today
      ? t('repeat.today')
      : date === addDaysToDateKey(today, 1)
        ? t('repeat.tomorrow')
        : new Date(`${date}T00:00:00`).toLocaleDateString(t.locale, { weekday: 'short', day: 'numeric' });
  const mealDate = (date: string) =>
    date === today ? t('repeat.today') : new Date(`${date}T00:00:00`).toLocaleDateString(t.locale, { weekday: 'short', month: 'short', day: 'numeric' });

  const plannedThere = (date: string, meal: RecentMeal) => {
    const day = existingPlans.find((entry) => String(entry.plan_date).slice(0, 10) === date);
    return (day?.slots ?? []).some((slot) => String(slot.meal_label).toLowerCase() === meal.slot && !slot.eaten_at);
  };

  function pick(meal: RecentMeal) {
    setPicked(meal);
    setPlanning(false);
    setLoggedItems(new Set());
    setError(null);
    setNotice(null);
  }

  async function logAgain() {
    if (!picked || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const done = new Set(loggedItems);
    try {
      for (const [index, item] of picked.items.entries()) {
        if (done.has(index)) {
          continue;
        }
        if (item.foodId) {
          await logFood(
            {
              food_id: item.foodId,
              log_date: logDate,
              meal_slot: picked.slot,
              ...(item.grams > 0 ? { grams: item.grams } : { servings: item.servings > 0 ? item.servings : 1 }),
              ...(item.quantityLabel ? { quantity_label: item.quantityLabel } : {})
            },
            accessToken
          );
        } else {
          await logQuickCalories(
            {
              log_date: logDate,
              calories: Math.max(1, Math.round(item.calories)),
              name: item.name,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              meal_slot: picked.slot
            },
            accessToken
          );
        }
        done.add(index);
        setLoggedItems(new Set(done));
      }
      onLogged();
      setNotice(t('repeat.logged', { meal: mealSlotLabel(picked.slot, t) }));
    } catch (logError) {
      if (done.size > 0) {
        onLogged();
      }
      setError(logError instanceof Error ? logError.message : t('repeat.logError'));
    } finally {
      setBusy(false);
    }
  }

  async function addToPlan(onConflict: 'replace' | 'keep') {
    if (!picked || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createMealPlan(
        [
          {
            plan_date: planDate,
            meal: picked.slot,
            title: mealTitle(picked),
            calories: picked.calories,
            on_conflict: onConflict,
            items: picked.items.map((item) => ({
              name: item.name.slice(0, 80),
              grams: Math.max(0, Math.round(item.grams)),
              calories: Math.round(item.calories),
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat
            }))
          }
        ],
        accessToken
      );
      onPlanned();
      setNotice(
        result.kept
          ? t('repeat.keptPlan')
          : t('repeat.planned', { meal: mealSlotLabel(picked.slot, t), day: shortDay(planDate) })
      );
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : t('repeat.planError'));
    } finally {
      setBusy(false);
    }
  }

  const conflict = picked ? plannedThere(planDate, picked) : false;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {picked ? (
              <>
                {!initialMeal ? (
                  <Pressable onPress={() => setPicked(null)} accessibilityRole="button">
                    <Text style={styles.link}>{t('repeat.back')}</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.title}>
                  {planning ? t('repeat.planTitle') : `🔁 ${mealSlotLabel(picked.slot, t)} · ${mealDate(picked.date)}`}
                </Text>
                <View style={styles.card}>
                  {picked.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.quantityLabel ? `${item.quantityLabel} · ` : item.grams > 0 ? `${Math.round(item.grams)} g · ` : ''}
                        {item.name}
                      </Text>
                      <Text style={styles.itemKcal}>{t('common.kcal', { value: formatNumber(Math.round(item.calories), undefined, t.locale) })}</Text>
                    </View>
                  ))}
                  <Text style={styles.totals}>
                    {t('common.kcal', { value: formatNumber(picked.calories, undefined, t.locale) })} ·{' '}
                    {t('common.macrosShort', { protein: picked.protein, carbs: picked.carbs, fat: picked.fat })}
                  </Text>
                </View>
                {planning ? (
                  <>
                    <Text style={styles.label}>{t('repeat.whichDay')}</Text>
                    <View style={styles.days} accessibilityRole="radiogroup">
                      {planDays.map((date) => (
                        <Pressable
                          key={date}
                          style={[styles.day, date === planDate && styles.dayActive]}
                          onPress={() => {
                            setPlanDate(date);
                            setNotice(null);
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: date === planDate }}
                        >
                          <Text style={[styles.dayLabel, date === planDate && styles.dayLabelActive]}>{shortDay(date)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {conflict ? (
                      <>
                        <Text style={styles.muted}>{t('repeat.alreadyPlanned', { meal: mealSlotLabel(picked.slot, t) })}</Text>
                        <View style={styles.row}>
                          <Pressable style={[styles.secondary, busy && styles.disabled]} disabled={busy} onPress={() => void addToPlan('keep')}>
                            <Text style={styles.secondaryLabel}>{t('repeat.keep')}</Text>
                          </Pressable>
                          <Pressable style={[styles.primary, styles.flex, busy && styles.disabled]} disabled={busy} onPress={() => void addToPlan('replace')}>
                            <Text style={styles.primaryLabel}>{t('repeat.replace')}</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <Pressable style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={() => void addToPlan('keep')}>
                        <Text style={styles.primaryLabel}>{busy ? t('repeat.saving') : t('repeat.addToPlan', { day: shortDay(planDate) })}</Text>
                      </Pressable>
                    )}
                  </>
                ) : (
                  <>
                    <Pressable style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={() => void logAgain()}>
                      <Text style={styles.primaryLabel}>
                        {busy ? t('repeat.saving') : dayName === 'today' ? t('repeat.logToday') : t('repeat.logOnDay', { day: dayName })}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.secondaryWide} onPress={() => setPlanning(true)} accessibilityRole="button">
                      <Text style={styles.secondaryLabel}>{t('repeat.planInstead')}</Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('repeat.title')}</Text>
                <TextInput
                  style={styles.input}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('repeat.searchPlaceholder')}
                  placeholderTextColor={tc.fg_8a97a8}
                  accessibilityLabel={t('repeat.searchA11y')}
                />
                {meals === null ? <ActivityIndicator color={tc.brand_primary} /> : null}
                {meals !== null && shown.length === 0 ? (
                  <Text style={styles.muted}>{query.trim() ? t('repeat.noMatch') : t('repeat.none')}</Text>
                ) : null}
                {shown.map((meal) => (
                  <Pressable key={meal.key} style={styles.mealRow} onPress={() => pick(meal)} accessibilityRole="button">
                    <View style={styles.mealCopy}>
                      <Text style={styles.mealTitle}>
                        {mealDate(meal.date)} · {mealSlotLabel(meal.slot, t)}
                        {meal.times > 1 ? <Text style={styles.times}>{`  ${t('repeat.times', { count: meal.times })}`}</Text> : null}
                      </Text>
                      <Text style={styles.mealFoods} numberOfLines={2}>
                        {meal.items.map((item) => item.name).join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.itemKcal}>{t('common.kcal', { value: formatNumber(meal.calories, undefined, t.locale) })}</Text>
                  </Pressable>
                ))}
              </>
            )}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
              <Text style={styles.link}>{t('common.close')}</Text>
            </Pressable>
          </ScrollView>
          <div style={{ height: 'max(12px, env(safe-area-inset-bottom))' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: tc.backdrop },
  sheet: {
    backgroundColor: tc.bg_ffffff,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '92%'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  label: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700' },
  muted: { color: tc.fg_5c6d80, fontSize: 14 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    fontSize: 16,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tc.line_e2e8f0 },
  mealCopy: { flex: 1, gap: 2 },
  mealTitle: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  times: { color: tc.fg_0f766e, fontSize: 13, fontWeight: '700' },
  mealFoods: { color: tc.fg_5c6d80, fontSize: 13 },
  card: { gap: 6, padding: 12, borderRadius: 14, backgroundColor: tc.bg_f3f6fb },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemName: { flex: 1, color: tc.fg_132536, fontSize: 14 },
  itemKcal: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '600' },
  totals: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '700', marginTop: 4 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  dayActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  dayLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '600' },
  dayLabelActive: { color: tc.fg_ffffff },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  primary: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7 },
  secondaryWide: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7 },
  secondaryLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  link: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  notice: { color: tc.fg_0f766e, fontSize: 14 },
  error: { color: tc.fg_b42318, fontSize: 14 },
  close: { alignItems: 'center', paddingVertical: 10 },
  disabled: { opacity: 0.5 }
});
