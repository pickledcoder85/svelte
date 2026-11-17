/**
 * A photo of food: each item seen, with its estimated portion (− / + in 10 g), its calories
 * (from USDA when matched, otherwise the photo estimate), ✕ to drop it, the meal, and one
 * button to add everything. Each item is logged on its own, so one can be fixed later.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { logFood, logQuickCalories } from '../lib/api';
import { formatNumber, useT } from '../i18n';
import { addButtonLabel, defaultMealSlot, MEAL_SLOTS, mealSlotLabel, type MealSlot } from '../lib/meal-slots';
import { itemNutrition, plateTotal, stepGrams } from '../lib/plate';
import { tc } from '../theme/palette';
import type { PlateItem } from '../types';

export function PlateSheet({
  items,
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose,
  onScanAgain
}: {
  items: PlateItem[];
  accessToken: string;
  logDate: string;
  dayName: string;
  onAdded(): void;
  onClose(): void;
  onScanAgain(): void;
}) {
  const t = useT();
  const [rows, setRows] = useState(() => items.map((item, index) => ({ key: index, item, grams: Math.max(10, Math.round(item.estimated_grams)) })));
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => defaultMealSlot());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Items already logged, so a retry after a failure never logs them twice.
  const [logged, setLogged] = useState<Set<number>>(() => new Set());

  // Leaving after some items were already logged still refreshes the day, so nothing looks lost.
  const leave = () => (logged.size > 0 ? onAdded() : onClose());

  async function addAll() {
    if (saving || rows.length === 0) {
      return;
    }
    setSaving(true);
    setError(null);
    const done = new Set(logged);
    try {
      for (const row of rows) {
        if (done.has(row.key)) {
          continue;
        }
        const food = row.item.food;
        if (food?.serving_grams) {
          await logFood({ food_id: food.id, log_date: logDate, grams: row.grams, meal_slot: mealSlot }, accessToken);
        } else {
          const nutrition = itemNutrition(row.item, row.grams);
          if (nutrition.calories <= 0) {
            done.add(row.key); // nothing to count (no estimate): skip rather than log 0 or 1 kcal
            continue;
          }
          await logQuickCalories(
            {
              log_date: logDate,
              calories: Math.min(10000, nutrition.calories),
              name: t('scan.plate.estimateName', { name: row.item.name, grams: row.grams }).slice(0, 80),
              protein: Math.min(1000, nutrition.macros.protein),
              carbs: Math.min(1000, nutrition.macros.carbs),
              fat: Math.min(1000, nutrition.macros.fat),
              meal_slot: mealSlot
            },
            accessToken
          );
        }
        done.add(row.key);
        setLogged(new Set(done));
      }
      onAdded();
    } catch (addError) {
      const message = addError instanceof Error ? addError.message : t('scan.plate.error');
      setError(done.size > 0 ? t('scan.plate.partial', { message }) : message);
      setSaving(false);
    }
  }

  const total = plateTotal(rows);
  const anyEstimate = rows.some((row) => !row.item.food?.serving_grams);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={leave}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={leave} accessibilityLabel={t('common.close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{t('scan.plate.title')}</Text>
              <Text style={styles.muted}>{t('scan.plate.intro')}</Text>
            </View>

            {rows.map((row) => {
              const nutrition = itemNutrition(row.item, row.grams);
              const done = logged.has(row.key);
              const locked = saving || done;
              return (
                <View key={row.key} style={[styles.item, logged.has(row.key) && styles.itemDone]}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName}>
                        {done ? '✓ ' : ''}
                        {row.item.name}
                      </Text>
                      <Text style={styles.itemDetail} numberOfLines={1}>
                        {nutrition.fromUsda ? t('scan.plate.usda', { name: row.item.food?.name ?? '' }) : t('scan.plate.photoEstimate')}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.remove}
                      onPress={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                      disabled={locked}
                      accessibilityRole="button"
                      accessibilityLabel={t('scan.plate.remove', { name: row.item.name })}
                    >
                      <Text style={styles.removeLabel}>✕</Text>
                    </Pressable>
                  </View>
                  <View style={styles.itemBottom}>
                    <View style={styles.stepper}>
                      <Pressable
                        style={styles.stepButton}
                        onPress={() => setRows((current) => current.map((item) => (item.key === row.key ? { ...item, grams: stepGrams(item.grams, -1) } : item)))}
                        disabled={locked}
                        accessibilityRole="button"
                        accessibilityLabel={t('scan.plate.less', { name: row.item.name })}
                      >
                        <Text style={styles.stepLabel}>−</Text>
                      </Pressable>
                      <Text style={styles.grams}>{row.grams} g</Text>
                      <Pressable
                        style={styles.stepButton}
                        onPress={() => setRows((current) => current.map((item) => (item.key === row.key ? { ...item, grams: stepGrams(item.grams, 1) } : item)))}
                        disabled={locked}
                        accessibilityRole="button"
                        accessibilityLabel={t('scan.plate.more', { name: row.item.name })}
                      >
                        <Text style={styles.stepLabel}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.itemCalories}>
                      {t('common.kcal', { value: nutrition.calories })}
                      <Text style={styles.itemMacros}>
                        {'  '}
                        {t('common.macrosShort', { protein: nutrition.macros.protein, carbs: nutrition.macros.carbs, fat: nutrition.macros.fat })}
                      </Text>
                    </Text>
                  </View>
                </View>
              );
            })}

            {rows.length === 0 ? <Text style={styles.muted}>{t('scan.plate.nothingLeft')}</Text> : null}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('scan.plate.total')}</Text>
              <Text style={styles.totalValue}>{t('common.kcal', { value: formatNumber(total, undefined, t.locale) })}</Text>
            </View>
            {anyEstimate ? (
              <Text style={styles.muted}>{t('scan.plate.estimateNote')}</Text>
            ) : null}

            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('meals.mealPicker')}>
              {MEAL_SLOTS.map((slot) => (
                <Pressable
                  key={slot}
                  style={[styles.chip, slot === mealSlot && styles.chipActive]}
                  onPress={() => setMealSlot(slot)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: slot === mealSlot }}
                >
                  <Text style={[styles.chipLabel, slot === mealSlot && styles.chipLabelActive]}>{mealSlotLabel(slot, t)}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.primary, (saving || rows.length === 0) && styles.disabled]}
              onPress={() => void addAll()}
              disabled={saving || rows.length === 0}
              accessibilityRole="button"
            >
              <Text style={styles.primaryLabel}>
                {saving ? t('common.adding') : logged.size > 0 ? t('scan.plate.addRest') : addButtonLabel(dayName, mealSlot, t, true)}
              </Text>
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable style={styles.secondary} onPress={logged.size > 0 ? leave : onScanAgain} disabled={saving} accessibilityRole="button">
                <Text style={styles.secondaryLabel}>{t('common.scanAgain')}</Text>
              </Pressable>
              <Text style={styles.muted}>·</Text>
              <Pressable style={styles.secondary} onPress={leave} accessibilityRole="button">
                <Text style={styles.secondaryLabel}>{logged.size > 0 ? t('common.done') : t('common.cancel')}</Text>
              </Pressable>
            </View>
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
  header: { gap: 4 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  muted: { color: tc.fg_5c6d80, fontSize: 13, lineHeight: 18 },
  item: { gap: 8, padding: 12, borderRadius: 14, backgroundColor: tc.bg_f6f9fc },
  itemDone: { opacity: 0.5 },
  itemTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  itemCopy: { flex: 1, gap: 2 },
  itemName: { color: tc.fg_132536, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  itemDetail: { color: tc.fg_6b7b90, fontSize: 12 },
  remove: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: tc.bg_eef2f6 },
  removeLabel: { color: tc.fg_5c6d80, fontSize: 14, fontWeight: '700' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: tc.bg_ffffff, borderWidth: 1, borderColor: tc.line_d7dee7, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: tc.fg_132536, fontSize: 22, fontWeight: '600', lineHeight: 24 },
  grams: { color: tc.fg_132536, fontSize: 16, fontWeight: '800', minWidth: 56, textAlign: 'center' },
  itemCalories: { color: tc.fg_132536, fontSize: 15, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  itemMacros: { color: tc.fg_6b7b90, fontSize: 12, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  totalLabel: { color: tc.fg_132536, fontSize: 16, fontWeight: '800' },
  totalValue: { color: tc.fg_132536, fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  chipActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  chipLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: tc.fg_ffffff },
  error: { color: tc.fg_b42318, fontSize: 14 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
