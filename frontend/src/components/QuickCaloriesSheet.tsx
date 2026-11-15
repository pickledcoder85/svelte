/** Quick calories from Today's Meals: just a number (and optional name and macros), no lookup. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { logQuickCalories } from '../lib/api';
import { addButtonLabel, defaultMealSlot, MEAL_SLOTS, MEAL_SLOT_LABELS, type MealSlot } from '../lib/meal-slots';
import { tc } from '../theme/palette';

function toNumber(text: string): number {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function QuickCaloriesSheet({
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose
}: {
  accessToken: string;
  logDate: string;
  dayName: string;
  onAdded(): void;
  onClose(): void;
}) {
  const [calories, setCalories] = useState('');
  const [name, setName] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => defaultMealSlot());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kcal = toNumber(calories);

  async function add() {
    if (!kcal || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await logQuickCalories(
        {
          log_date: logDate,
          calories: Math.round(kcal),
          name: name.trim() || undefined,
          protein: toNumber(protein),
          carbs: toNumber(carbs),
          fat: toNumber(fat),
          meal_slot: mealSlot
        },
        accessToken
      );
      onAdded();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add.');
      setSaving(false);
    }
  }

  const field = (label: string, value: string, onChange: (text: string) => void, unit: string) => (
    <View style={styles.macro}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroInputRow}>
        <TextInput
          style={styles.macroInput}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          accessibilityLabel={`${label} in ${unit}`}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Quick calories</Text>
            <View style={styles.bigRow}>
              <TextInput
                style={styles.bigInput}
                value={calories}
                onChangeText={(text) => setCalories(text.replace(/[^0-9.,]/g, ''))}
                keyboardType="number-pad"
                inputMode="numeric"
                placeholder="0"
                placeholderTextColor={tc.fg_8a97a8}
                autoFocus
                accessibilityLabel="Calories"
              />
              <Text style={styles.bigUnit}>kcal</Text>
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="What was it? (optional)"
              placeholderTextColor={tc.fg_8a97a8}
              maxLength={80}
              accessibilityLabel="Name"
            />
            <View style={styles.macros}>
              {field('Protein', protein, setProtein, 'g')}
              {field('Carbs', carbs, setCarbs, 'g')}
              {field('Fat', fat, setFat, 'g')}
            </View>
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
              style={[styles.primary, (!kcal || saving) && styles.disabled]}
              onPress={() => void add()}
              disabled={!kcal || saving}
              accessibilityRole="button"
            >
              <Text style={styles.primaryLabel}>{saving ? 'Adding…' : addButtonLabel(dayName, mealSlot)}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
              <Text style={styles.secondaryLabel}>Cancel</Text>
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
    maxHeight: '90%'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  bigRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bigInput: { minWidth: 140, fontSize: 40, fontWeight: '800', textAlign: 'center', color: tc.fg_132536, paddingVertical: 4 },
  bigUnit: { color: tc.fg_5c6d80, fontSize: 20, fontWeight: '700' },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    fontSize: 16,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  macros: { flexDirection: 'row', gap: 10 },
  macro: { flex: 1, gap: 4 },
  macroLabel: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '700' },
  macroInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 10,
    fontSize: 16,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  unit: { color: tc.fg_5c6d80, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  chipActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  chipLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: tc.fg_ffffff },
  error: { color: tc.fg_b42318, fontSize: 14 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
