/**
 * "Suggest a meal" (Today → Meals): help filling what's left today. Pick the meal, then either
 * photograph your ingredients (fridge, counter, pantry) or let Gus choose from your remaining
 * calories and macros (meals already planned for later are held back). Gus offers two complete
 * meals sized to fit (every ingredient has nutrition data); Log it adds every ingredient to the
 * day by weight, saving any new ones to the food bank.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { deleteMealPlanSlot, logFood, suggestMeal } from '../lib/api';
import { pickPhotoFromCamera, prepareScanPhoto } from '../lib/web-photo';
import { BLOCK_LABELS, type MealBlockKey } from '../lib/meal-split';
import { tc } from '../theme/palette';
import type { SuggestedMeal, SuggestResponse } from '../types';
import { countLabel, ingredientLine } from '../lib/portions';

export function SuggestMealSheet({
  accessToken,
  logDate,
  dayName,
  blocks,
  defaultBlock,
  onLogged,
  onClose
}: {
  accessToken: string;
  logDate: string;
  dayName: string;
  /** The user's blocks, in day order. */
  blocks: MealBlockKey[];
  defaultBlock: MealBlockKey;
  onLogged(): void;
  onClose(): void;
}) {
  const [block, setBlock] = useState<MealBlockKey>(defaultBlock);
  const [have, setHave] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  // Options already logged (by position), and each option's items already logged, so a retry
  // after a failure never adds anything twice.
  const [done, setDone] = useState<Record<number, 'logged'>>({});
  const loggedItems = useRef<Map<number, Set<number>>>(new Map());
  // Only the latest request may show its result (a photo can still be preparing).
  const requestId = useRef(0);
  // Log it was tapped while this meal already has something planned: replace it, or keep it.
  const [askReplace, setAskReplace] = useState<number | null>(null);

  async function ask(imageBase64?: string, id = ++requestId.current) {
    setLoading(true);
    setError(null);
    setResult(null);
    setDone({});
    setAskReplace(null);
    loggedItems.current = new Map();
    try {
      const response = await suggestMeal(
        { log_date: logDate, block, ingredients: have.trim() || undefined, image_base64: imageBase64 },
        accessToken
      );
      if (id === requestId.current) {
        setResult(response);
      }
    } catch (askError) {
      if (id === requestId.current) {
        setError(askError instanceof Error ? askError.message : 'Gus is stuck. Try again.');
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }

  async function logIt(index: number, meal: SuggestedMeal, slot: SuggestResponse['meal_slot'], replacePlanned?: string) {
    setBusy(index);
    setAskReplace(null);
    setError(null);
    const logged = loggedItems.current.get(index) ?? new Set<number>();
    loggedItems.current.set(index, logged);
    try {
      if (replacePlanned) {
        try {
          await deleteMealPlanSlot(replacePlanned, accessToken);
        } catch {
          // Already removed (a retry) or gone: log the meal anyway.
        }
      }
      for (const [position, item] of meal.items.entries()) {
        if (logged.has(position)) {
          continue;
        }
        const counted = countLabel(item);
        await logFood(
          {
            food_id: item.food.id,
            log_date: logDate,
            grams: item.grams,
            meal_slot: slot,
            ...(counted ? { quantity_label: `${counted} (${Math.round(item.grams)} g)` } : {})
          },
          accessToken
        );
        logged.add(position);
      }
      setDone((current) => ({ ...current, [index]: 'logged' }));
    } catch (logError) {
      setError(
        logged.size > 0
          ? `Some of it was added; tap Log it again to add the rest. (${logError instanceof Error ? logError.message : 'error'})`
          : logError instanceof Error
            ? logError.message
            : 'Unable to log this meal.'
      );
    } finally {
      if (logged.size > 0) {
        onLogged();
      }
      setBusy(null);
    }
  }

  /** Opened from the tap itself: iOS only allows the photo camera from a user gesture. */
  async function askWithPhoto() {
    const file = await pickPhotoFromCamera();
    if (!file) {
      return;
    }
    const id = ++requestId.current;
    setLoading(true); // preparing the photo counts as thinking: no second request meanwhile
    setError(null);
    try {
      const prepared = await prepareScanPhoto(file);
      await ask(prepared.base64, id);
    } catch (photoError) {
      if (id === requestId.current) {
        setLoading(false);
        setError(photoError instanceof Error ? photoError.message : 'That photo could not be used.');
      }
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>✨ Gus suggests</Text>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Which meal">
              {blocks.map((key) => (
                <Pressable
                  key={key}
                  style={[styles.chip, key === block && styles.chipActive]}
                  onPress={() => setBlock(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: key === block }}
                >
                  <Text style={[styles.chipLabel, key === block && styles.chipLabelActive]}>{BLOCK_LABELS[key]}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={have}
              onChangeText={setHave}
              placeholder="Anything you'd like to use? (optional) e.g. chicken, rice"
              placeholderTextColor={tc.fg_8a97a8}
              maxLength={300}
              accessibilityLabel="Ingredients you have"
            />
            <View style={styles.modes}>
              <Pressable style={[styles.mode, loading && styles.disabled]} onPress={() => void askWithPhoto()} disabled={loading} accessibilityRole="button">
                <Text style={styles.modeIcon}>📷</Text>
                <Text style={styles.modeTitle}>Photo of my ingredients</Text>
                <Text style={styles.modeDetail}>Fridge, counter, or pantry</Text>
              </Pressable>
              <Pressable style={[styles.mode, styles.modePrimary, loading && styles.disabled]} onPress={() => void ask()} disabled={loading} accessibilityRole="button">
                <Text style={styles.modeIcon}>✨</Text>
                <Text style={[styles.modeTitle, styles.modeTitlePrimary]}>Let Gus choose</Text>
                <Text style={[styles.modeDetail, styles.modeDetailPrimary]}>From what's left today</Text>
              </Pressable>
            </View>
            {loading ? <Text style={styles.thinking}>Gus is thinking…</Text> : null}

            {loading ? <ActivityIndicator color={tc.brand_primary} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {result ? (
              <>
                <Text style={styles.budget}>
                  {result.block_label} budget: {Math.round(result.budget.calories)} kcal · P {Math.round(result.budget.protein)} · C{' '}
                  {Math.round(result.budget.carbs)} · F {Math.round(result.budget.fat)}
                  {'  '}({Math.round(result.remaining.calories)} kcal left today)
                </Text>
                {result.seen_items.length > 0 ? (
                  <Text style={styles.seen}>Gus sees: {result.seen_items.join(', ')}</Text>
                ) : null}
                {result.message ? <Text style={styles.message}>{result.message}</Text> : null}
                {result.options.map((meal, index) => (
                  <View key={index} style={styles.card}>
                    <Text style={styles.cardTitle}>{meal.name}</Text>
                    {meal.why ? <Text style={styles.why}>{meal.why}</Text> : null}
                    {meal.items.map((item, position) => (
                      <View key={position} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {ingredientLine(item)}
                        </Text>
                        <Text style={styles.itemKcal}>{Math.round(item.nutrition.calories)} kcal</Text>
                      </View>
                    ))}
                    <Text style={styles.totals}>
                      {Math.round(meal.totals.calories)} kcal · P {Math.round(meal.totals.protein)} · C {Math.round(meal.totals.carbs)} · F{' '}
                      {Math.round(meal.totals.fat)}
                    </Text>
                    {meal.missing.length > 0 ? (
                      <Text style={styles.missing}>Left out (no nutrition data): {meal.missing.join(', ')}</Text>
                    ) : null}
                    {askReplace === index && result.planned_here ? (
                      <View style={styles.replaceBox}>
                        <Text style={styles.replaceText}>
                          You planned “{result.planned_here.title}” ({Math.round(result.planned_here.calories)} kcal) for{' '}
                          {result.block_label.toLowerCase()}.
                        </Text>
                        <View style={styles.actions}>
                          <Pressable
                            style={[styles.action, styles.actionPrimary]}
                            onPress={() => void logIt(index, meal, result.meal_slot, result.planned_here?.slot_id)}
                            accessibilityRole="button"
                          >
                            <Text style={styles.actionPrimaryLabel}>Replace planned</Text>
                          </Pressable>
                          <Pressable style={styles.action} onPress={() => void logIt(index, meal, result.meal_slot)} accessibilityRole="button">
                            <Text style={styles.keepLabel}>Keep planned</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                    {done[index] ? (
                      <Text style={styles.done}>✓ Added to {dayName}</Text>
                    ) : (
                      <View style={styles.actions}>
                        <Pressable
                          style={[styles.action, styles.actionPrimary]}
                          onPress={() =>
                            result.planned_here && !loggedItems.current.get(index)?.size
                              ? setAskReplace(index)
                              : void logIt(index, meal, result.meal_slot)
                          }
                          disabled={busy !== null}
                          accessibilityRole="button"
                        >
                          <Text style={styles.actionPrimaryLabel}>{busy === index ? 'Adding…' : 'Log it'}</Text>
                        </Pressable>

                      </View>
                    )}
                  </View>
                ))}
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
  sheet: { backgroundColor: tc.bg_ffffff, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  chipActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  chipLabel: { color: tc.fg_132536, fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: tc.fg_ffffff },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7, paddingHorizontal: 14, fontSize: 16, color: tc.fg_132536, backgroundColor: tc.bg_ffffff },
  primary: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: { color: tc.fg_b42318, fontSize: 14 },
  budget: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '600' },
  message: { color: tc.fg_7a4e16, fontSize: 14, lineHeight: 19, backgroundColor: tc.bg_fff8ea, borderRadius: 10, padding: 10 },
  card: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: tc.bg_f6f9fc },
  cardTitle: { color: tc.fg_132536, fontSize: 17, fontWeight: '800' },
  why: { color: tc.fg_5c6d80, fontSize: 13 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  itemName: { color: tc.fg_132536, fontSize: 14, flex: 1 },
  itemKcal: { color: tc.fg_132536, fontSize: 14, fontWeight: '700' },
  totals: { color: tc.fg_132536, fontSize: 14, fontWeight: '800', marginTop: 2 },
  missing: { color: tc.fg_8a5a1d, fontSize: 12 },
  done: { color: tc.fg_0f766e, fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  actionPrimary: { backgroundColor: tc.brand_primary, borderColor: tc.brand_primary },
  keepLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  replaceBox: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: tc.bg_fff8ea },
  replaceText: { color: tc.fg_7a4e16, fontSize: 13, lineHeight: 18 },
  actionPrimaryLabel: { color: tc.fg_ffffff, fontSize: 15, fontWeight: '800' },
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, gap: 2, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  modePrimary: { backgroundColor: tc.brand_primary, borderColor: tc.brand_primary },
  modeIcon: { fontSize: 22 },
  modeTitle: { color: tc.fg_132536, fontSize: 15, fontWeight: '800' },
  modeTitlePrimary: { color: tc.fg_ffffff },
  modeDetail: { color: tc.fg_5c6d80, fontSize: 12 },
  modeDetailPrimary: { color: tc.fg_ffffff, opacity: 0.85 },
  thinking: { color: tc.fg_0f766e, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  seen: { color: tc.fg_2f6b4f, fontSize: 13, lineHeight: 18 }
});
