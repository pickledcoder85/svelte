/**
 * Quick add from Today's Meals: the barcode scanner opens straight away; a found product is
 * saved to the food bank and shown on a confirm sheet (servings or grams, with the numbers)
 * before anything is logged. Not found: photograph the label on the Scan screen instead.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { foodForBarcode, logFood } from '../lib/api';
import {
  defaultAmount,
  formatServings,
  logPayload,
  previewNutrition,
  stepServings,
  type QuickAmount
} from '../lib/quick-add';
import { tc } from '../theme/palette';
import type { FoodItem } from '../types';
import { WebBarcodeScanner } from './WebBarcodeScanner';

type Phase =
  | { kind: 'scanning' }
  | { kind: 'looking' }
  | { kind: 'confirm'; foods: FoodItem[]; fromBank: boolean }
  | { kind: 'missing'; message: string };

export function QuickScanAdd({
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose,
  onPhotographLabel
}: {
  accessToken: string;
  logDate: string;
  /** "today", or the day's name when another day is chosen. */
  dayName: string;
  onAdded(food: FoodItem): void;
  onClose(): void;
  /** Open the full Scan screen to photograph the nutrition label. */
  onPhotographLabel(): void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  const [foodIndex, setFoodIndex] = useState(0);
  const [amount, setAmount] = useState<QuickAmount>(defaultAmount);
  const [gramsDraft, setGramsDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookUp(code: string) {
    setPhase({ kind: 'looking' });
    setError(null);
    try {
      const result = await foodForBarcode(code, accessToken);
      if (result.found && result.foods.length > 0) {
        setFoodIndex(0);
        setAmount(defaultAmount());
        setGramsDraft(result.foods[0].serving_grams ? String(Math.round(result.foods[0].serving_grams)) : '');
        setPhase({ kind: 'confirm', foods: result.foods, fromBank: result.source === 'food_bank' });
      } else {
        setPhase({ kind: 'missing', message: result.message ?? "We couldn't find this barcode." });
      }
    } catch (lookupError) {
      setPhase({
        kind: 'missing',
        message: lookupError instanceof Error ? lookupError.message : 'Barcode lookup failed.'
      });
    }
  }

  async function add(food: FoodItem) {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await logFood(logPayload(food.id, logDate, amount) as Parameters<typeof logFood>[0], accessToken);
      onAdded(food);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add this food.');
      setSaving(false);
    }
  }

  if (phase.kind === 'scanning') {
    return (
      <WebBarcodeScanner
        visible
        onCode={(code) => void lookUp(code)}
        onClose={onClose}
        onTakePhoto={onPhotographLabel}
      />
    );
  }

  const food = phase.kind === 'confirm' ? phase.foods[Math.min(foodIndex, phase.foods.length - 1)] : null;
  const preview = food ? previewNutrition(food, amount) : null;
  const canWeigh = Boolean(food?.serving_grams);
  const unit = food?.serving_basis === 'ml' ? 'ml' : 'g';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {phase.kind === 'looking' ? (
              <View style={styles.center}>
                <ActivityIndicator color={tc.brand_primary} />
                <Text style={styles.muted}>Looking up the barcode…</Text>
              </View>
            ) : null}

            {phase.kind === 'missing' ? (
              <>
                <Text style={styles.title}>Not found</Text>
                <Text style={styles.muted}>{phase.message}</Text>
                <Pressable style={styles.primary} onPress={onPhotographLabel} accessibilityRole="button">
                  <Text style={styles.primaryLabel}>Photograph the label</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => setPhase({ kind: 'scanning' })} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>Scan again</Text>
                </Pressable>
              </>
            ) : null}

            {phase.kind === 'confirm' && food ? (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>{food.name}</Text>
                  <Text style={styles.muted}>
                    {[food.brand, food.serving_text ? `1 serving = ${food.serving_text}` : null].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.source}>{phase.fromBank ? 'From your food bank' : 'Saved to your food bank'}</Text>
                </View>

                {phase.foods.length > 1 ? (
                  <View style={styles.chips}>
                    {phase.foods.map((option, index) => (
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
                  <Text style={styles.muted}>Enter a weight.</Text>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={[styles.primary, (!preview || saving) && styles.disabled]}
                  onPress={() => void add(food)}
                  disabled={!preview || saving}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryLabel}>{saving ? 'Adding…' : `Add to ${dayName}`}</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => setPhase({ kind: 'scanning' })} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>Scan something else</Text>
                </Pressable>
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
  center: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  header: { gap: 4 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  muted: { color: tc.fg_5c6d80, fontSize: 14, lineHeight: 19 },
  source: { color: tc.fg_0f766e, fontSize: 12, fontWeight: '700' },
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
