/**
 * The meal-planning guide (shown the first time you plan meals, and from "Change" on Plan →
 * Meals): 1. how many times a day you eat (3 + 2 snacks recommended), 2. how you balance your
 * meals. Those are the choices: anyone wanting something else builds their meals by hand.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  blockBudgets,
  MEAL_STYLES,
  RECOMMENDED_MEALS_PER_DAY,
  type MealStyleId,
  type MealsPerDay
} from '../lib/meal-split';
import { tc } from '../theme/palette';
import type { MacroTargets } from '../types';

const COUNTS: Array<{ count: MealsPerDay; label: string; detail: string }> = [
  { count: 3, label: '3 meals', detail: 'Breakfast, lunch, and dinner' },
  { count: 4, label: '3 meals + a snack', detail: 'An afternoon snack before dinner' },
  { count: 5, label: '3 meals + 2 snacks', detail: 'A snack mid-morning and mid-afternoon' }
];

export function MealPatternGuide({
  calorieTarget,
  macros,
  initialCount,
  initialStyle,
  onSave,
  onClose
}: {
  calorieTarget: number;
  macros: MacroTargets;
  initialCount: MealsPerDay;
  initialStyle: MealStyleId | null;
  onSave(count: MealsPerDay, split: number[]): Promise<void> | void;
  onClose(): void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [count, setCount] = useState<MealsPerDay>(initialCount);
  const [style, setStyle] = useState<MealStyleId>(initialStyle ?? 'balanced');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const chosen = MEAL_STYLES.find((item) => item.id === style) ?? MEAL_STYLES[0];
    setSaving(true);
    setError(null);
    try {
      await onSave(count, chosen.splits[count]);
    } catch (saveError) {
      // Stay open and say why; the choice is kept so Save can be tapped again.
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your meal pattern.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.step}>Step {step} of 2</Text>
            {step === 1 ? (
              <>
                <Text style={styles.title}>How many times a day do you eat?</Text>
                {COUNTS.map((option) => {
                  const active = option.count === count;
                  const recommended = option.count === RECOMMENDED_MEALS_PER_DAY;
                  return (
                    <Pressable
                      key={option.count}
                      style={[styles.card, active && styles.cardActive]}
                      onPress={() => setCount(option.count)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>{option.label}</Text>
                        {recommended ? <Text style={styles.badge}>★ Recommended</Text> : null}
                      </View>
                      <Text style={styles.cardDetail}>{option.detail}</Text>
                      {recommended ? (
                        <Text style={styles.why}>
                          Spreading protein over 4–5 meals keeps muscle-building going through the day, and more muscle is linked to
                          staying strong and healthy as you age.
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
                <Pressable style={styles.primary} onPress={() => setStep(2)} accessibilityRole="button">
                  <Text style={styles.primaryLabel}>Next</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>How do you balance your meals?</Text>
                {MEAL_STYLES.map((option) => {
                  const active = option.id === style;
                  const preview = blockBudgets(count, option.splits[count], calorieTarget, macros)
                    .map((block) => `${block.label.replace(' snack', ' snk')} ${block.calories.toLocaleString('en-US')}`)
                    .join(' · ');
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.card, active && styles.cardActive]}
                      onPress={() => setStyle(option.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>
                        {option.label}
                        {option.id === 'balanced' ? ' (default)' : ''}
                      </Text>
                      <Text style={styles.cardDetail}>{option.detail}</Text>
                      {calorieTarget > 0 ? <Text style={styles.preview}>{preview} kcal</Text> : null}
                    </Pressable>
                  );
                })}
                <Text style={styles.note}>Want something else? Build your meals by hand in Plan instead.</Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.row}>
                  <Pressable style={styles.secondary} onPress={() => setStep(1)} accessibilityRole="button">
                    <Text style={styles.secondaryLabel}>Back</Text>
                  </Pressable>
                  <Pressable style={[styles.primary, styles.flex, saving && styles.disabled]} onPress={() => void save()} disabled={saving} accessibilityRole="button">
                    <Text style={styles.primaryLabel}>{saving ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </>
            )}
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
  sheet: { backgroundColor: tc.bg_ffffff, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  step: { color: tc.fg_0f766e, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  card: { gap: 4, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7 },
  cardActive: { borderColor: tc.line_0f766e, backgroundColor: tc.bg_ecfdf3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: tc.fg_132536, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  cardTitleActive: { color: tc.fg_0f766e },
  cardDetail: { color: tc.fg_5c6d80, fontSize: 13 },
  badge: { color: tc.fg_0f766e, fontSize: 12, fontWeight: '800' },
  why: { color: tc.fg_2f6b4f, fontSize: 13, lineHeight: 18, marginTop: 2 },
  preview: { color: tc.fg_6b7b90, fontSize: 12, fontWeight: '600' },
  note: { color: tc.fg_6b7b90, fontSize: 13, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex: { flex: 1 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary, marginTop: 4 },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { color: tc.fg_b42318, fontSize: 14, textAlign: 'center' }
});
