/**
 * The one sheet every way of finding a food ends on (scan, search, the Scan screen): the food
 * and its serving, ☆ favorite, the amount (servings with − / + in halves, or a weight), the
 * calories and macros for it, the meal, then Add to the day, or Save to the food bank only.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { addFavoriteFood, addFoodToBank, logFood, unfavoriteFood } from '../lib/api';
import { addButtonLabel, defaultMealSlot, MEAL_SLOTS, MEAL_SLOT_LABELS, type MealSlot } from '../lib/meal-slots';
import {
  defaultAmountFor,
  isPer100Only,
  formatServings,
  logPayload,
  previewNutrition,
  stepServings,
  type QuickAmount
} from '../lib/quick-add';
import { tc } from '../theme/palette';
import type { FoodItem } from '../types';

export function AddFoodSheet({
  foods,
  fromBank,
  accessToken,
  logDate,
  dayName,
  onAdded,
  onSaved,
  onClose,
  onScanAgain,
  note,
  prepare,
  extraAction
}: {
  foods: FoodItem[];
  fromBank: boolean;
  accessToken: string;
  logDate: string;
  dayName: string;
  onAdded(food: FoodItem): void;
  /** Saved to the food bank without logging it. */
  onSaved?(food: FoodItem): void;
  onClose(): void;
  onScanAgain?(): void;
  /** E.g. "Matched to … from Open Food Facts. Check it against the label." */
  note?: string | null;
  /** For a scan not saved yet: save it (to the food bank) and return the real food first. */
  prepare?(food: FoodItem): Promise<FoodItem>;
  /** One more choice, e.g. "Scan the nutrition label" for a matched package. */
  extraAction?: { label: string; onPress(): void };
}) {
  const [favorite, setFavorite] = useState(Boolean(foods[0]?.favorite));
  // A pending scan is saved once, and a food is logged once, even if a later step fails and
  // the user taps again.
  const preparedRef = useRef<FoodItem | null>(null);
  const loggedRef = useRef(false);
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => defaultMealSlot());
  const [foodIndex, setFoodIndex] = useState(0);
  const [amount, setAmount] = useState<QuickAmount>(() => defaultAmountFor(foods[0] ?? null));
  const [gramsDraft, setGramsDraft] = useState(
    foods[0]?.serving_grams && !isPer100Only(foods[0]) ? String(Math.round(foods[0].serving_grams)) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The star shows the chosen food's own favorite state.
  useEffect(() => {
    setFavorite(Boolean(foods[Math.min(foodIndex, foods.length - 1)]?.favorite));
  }, [foodIndex, foods]);

  async function realFood(food: FoodItem): Promise<FoodItem> {
    if (!prepare) {
      return food;
    }
    preparedRef.current ??= await prepare(food);
    return preparedRef.current;
  }

  /** Best effort: the food is already logged or saved, so a failure here doesn't undo that. */
  async function keepFavorite(food: FoodItem) {
    try {
      if (favorite && !food.favorite) {
        await addFavoriteFood(food.id, accessToken);
      } else if (!favorite && food.favorite) {
        await unfavoriteFood(food.id, accessToken);
      }
    } catch {
      // Change it later in Foods.
    }
  }

  async function add(food: FoodItem) {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const real = await realFood(food);
      if (!loggedRef.current) {
        await logFood({ ...logPayload(real.id, logDate, amount), meal_slot: mealSlot } as Parameters<typeof logFood>[0], accessToken);
        loggedRef.current = true;
      }
      await keepFavorite(real);
      onAdded(real);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add this food.');
      setSaving(false);
    }
  }

  async function saveOnly(food: FoodItem) {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const real = await realFood(food);
      if (!real.in_bank && !prepare) {
        await addFoodToBank(real.id, accessToken);
      }
      await keepFavorite(real);
      (onSaved ?? onClose)(real);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this food.');
      setSaving(false);
    }
  }

  const food = foods[Math.min(foodIndex, foods.length - 1)] ?? null;
  const preview = food ? previewNutrition(food, amount) : null;
  const per100 = food ? isPer100Only(food) : false;
  // Per-100 g-only foods are logged by weight only: "1 serving" would mean 100 g.
  const canWeigh = Boolean(food?.serving_grams) && !per100;
  const unit = food?.serving_basis === 'ml' ? 'ml' : 'g';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {food ? (
              <>
                <View style={styles.header}>
                  <View style={styles.titleRow}>
                    <Pressable
                      onPress={() => setFavorite((value) => !value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: favorite }}
                      accessibilityLabel="Favorite"
                      hitSlop={10}
                    >
                      <Text style={[styles.star, favorite && styles.starOn]}>{favorite ? '★' : '☆'}</Text>
                    </Pressable>
                    <Text style={styles.title}>{food.name}</Text>
                  </View>
                  <Text style={styles.muted}>
                    {[
                      food.brand,
                      per100 ? 'Nutrition listed per 100 g' : food.serving_text ? `1 serving = ${food.serving_text}` : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  <Text style={styles.source}>{fromBank ? 'From your food bank' : prepare ? 'New: saved to your food bank when you add or save it' : 'New: saved to your food bank'}</Text>
                  {note ? <Text style={styles.note}>{note}</Text> : null}
                </View>

                {foods.length > 1 ? (
                  <View style={styles.chips}>
                    {foods.map((option, index) => (
                      <Pressable
                        key={option.id}
                        style={[styles.chip, index === foodIndex && styles.chipActive]}
                        onPress={() => setFoodIndex(index)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: index === foodIndex }}
                      >
                        <Text style={[styles.chipLabel, index === foodIndex && styles.chipLabelActive]}>{option.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {canWeigh ? (
                  <View style={styles.segment} accessibilityRole="radiogroup">
                    {(['servings', 'grams'] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        style={[styles.segmentOption, amount.mode === mode && styles.segmentActive]}
                        onPress={() =>
                          setAmount(
                            mode === 'servings'
                              ? { mode: 'servings', servings: 1 }
                              : { mode: 'grams', grams: Number(gramsDraft) || 0 }
                          )
                        }
                        accessibilityRole="radio"
                        accessibilityState={{ checked: amount.mode === mode }}
                      >
                        <Text style={[styles.segmentLabel, amount.mode === mode && styles.segmentLabelActive]}>
                          {mode === 'servings' ? 'Servings' : `Weight (${unit})`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {amount.mode === 'servings' ? (
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => setAmount({ mode: 'servings', servings: stepServings(amount.servings, -1) })}
                      accessibilityRole="button"
                      accessibilityLabel="Less"
                    >
                      <Text style={styles.stepLabel}>−</Text>
                    </Pressable>
                    <Text style={styles.stepValue}>{formatServings(amount.servings)}</Text>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => setAmount({ mode: 'servings', servings: stepServings(amount.servings, 1) })}
                      accessibilityRole="button"
                      accessibilityLabel="More"
                    >
                      <Text style={styles.stepLabel}>+</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.gramsRow}>
                    <TextInput
                      style={styles.gramsInput}
                      value={gramsDraft}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9.]/g, '');
                        setGramsDraft(cleaned);
                        setAmount({ mode: 'grams', grams: Number(cleaned) || 0 });
                      }}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      accessibilityLabel={`Weight in ${unit}`}
                    />
                    <Text style={styles.gramsUnit}>{unit}</Text>
                  </View>
                )}

                {preview ? (
                  <View style={styles.totals}>
                    <Text style={styles.totalCalories}>{preview.calories.toLocaleString('en-US')} kcal</Text>
                    <Text style={styles.muted}>
                      P {preview.macros.protein}g · C {preview.macros.carbs}g · F {preview.macros.fat}g
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.muted}>{per100 ? 'How many grams did you use? Check the package for the serving weight.' : 'Enter a weight.'}</Text>
                )}

                <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Meal">
                  {MEAL_SLOTS.map((slot) => (
                    <Pressable
                      key={slot}
                      style={[styles.chip, slot === mealSlot && styles.chipActive]}
                      onPress={() => setMealSlot(slot)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: slot === mealSlot }}
                    >
                      <Text style={[styles.chipLabel, slot === mealSlot && styles.chipLabelActive]}>{MEAL_SLOT_LABELS[slot]}</Text>
                    </Pressable>
                  ))}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={[styles.primary, (!preview || saving) && styles.disabled]}
                  onPress={() => void add(food)}
                  disabled={!preview || saving}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryLabel}>{saving ? 'Adding…' : addButtonLabel(dayName, mealSlot)}</Text>
                </Pressable>
                {extraAction ? (
                  <Pressable style={styles.secondary} onPress={extraAction.onPress} disabled={saving} accessibilityRole="button">
                    <Text style={styles.secondaryLabel}>{extraAction.label}</Text>
                  </Pressable>
                ) : null}
                <View style={styles.secondaryRow}>
                  <Pressable style={styles.secondary} onPress={() => void saveOnly(food)} disabled={saving} accessibilityRole="button">
                    <Text style={styles.secondaryLabel}>Save to food bank only</Text>
                  </Pressable>
                  <Text style={styles.muted}>·</Text>
                  <Pressable style={styles.secondary} onPress={onScanAgain ?? onClose} accessibilityRole="button">
                    <Text style={styles.secondaryLabel}>{onScanAgain ? 'Scan again' : 'Cancel'}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
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
    maxHeight: '90%'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  header: { gap: 4 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800', flex: 1 },
  muted: { color: tc.fg_5c6d80, fontSize: 14, lineHeight: 19 },
  source: { color: tc.fg_0f766e, fontSize: 12, fontWeight: '700' },
  note: { color: tc.fg_7a4e16, fontSize: 13, lineHeight: 18, backgroundColor: tc.bg_fff8ea, borderRadius: 10, padding: 10, marginTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  star: { fontSize: 26, lineHeight: 28, color: tc.fg_8a97a8 },
  starOn: { color: tc.fg_ca8a04 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  chipActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  chipLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: tc.fg_ffffff },
  segment: { flexDirection: 'row', backgroundColor: tc.bg_eef2f6, borderRadius: 12, padding: 3 },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segmentActive: { backgroundColor: tc.bg_ffffff },
  segmentLabel: { color: tc.fg_5c6d80, fontSize: 14, fontWeight: '700' },
  segmentLabelActive: { color: tc.fg_132536 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: tc.bg_eef2f6, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: tc.fg_132536, fontSize: 26, fontWeight: '600', lineHeight: 28 },
  stepValue: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gramsInput: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: '700',
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  gramsUnit: { color: tc.fg_5c6d80, fontSize: 18, fontWeight: '700' },
  totals: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  totalCalories: { color: tc.fg_132536, fontSize: 28, fontWeight: '800' },
  error: { color: tc.fg_b42318, fontSize: 14 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
