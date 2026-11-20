/**
 * "Suggest a meal" (Today → Meals): help filling what's left today. Pick the meal, then either
 * photograph your ingredients (fridge, counter, pantry) or let Gus choose from your remaining
 * calories and macros (meals already planned for later are held back). Gus offers two complete
 * meals sized to fit (every ingredient has nutrition data); Log it adds every ingredient to the
 * day by weight, saving any new ones to the food bank.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../i18n';
import { deleteMealPlanSlot, logFood, suggestMeal, transcribeSpeech } from '../lib/api';
import { elapsedLabel, startRecording, voiceSupported, type ActiveRecording } from '../lib/voice-recorder';
import { addedToDayLabel } from '../lib/meal-slots';
import { pickPhotoFromCamera, prepareScanPhoto } from '../lib/web-photo';
import { MEAL_PATTERNS, type MealBlockKey } from '../lib/meal-split';
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
  const t = useT();
  const [block, setBlock] = useState<MealBlockKey>(defaultBlock);
  // The block's name in the display language (the server's label when it is a block we don't know).
  const blockLabel = (key: string, fallback: string) =>
    MEAL_PATTERNS[5].includes(key as MealBlockKey) ? t(`meals.blocks.${key as MealBlockKey}`) : fallback;
  const [have, setHave] = useState('');
  // "Tell Gus what you have": only the foods listed (voice turns this on; typed text can too).
  const [onlyThese, setOnlyThese] = useState(false);
  const [listening, setListening] = useState<ActiveRecording | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const listenTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (listenTimer.current) {
      clearInterval(listenTimer.current);
    }
  }, []);
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
        {
          log_date: logDate,
          block,
          ingredients: have.trim() || undefined,
          ...(onlyThese && have.trim() && !imageBase64 ? { ingredients_only: true } : {}),
          image_base64: imageBase64
        },
        accessToken
      );
      if (id === requestId.current) {
        setResult(response);
      }
    } catch (askError) {
      if (id === requestId.current) {
        setError(askError instanceof Error ? askError.message : t('suggest.stuck'));
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
          ? t('suggest.partial', { message: logError instanceof Error ? logError.message : t('suggest.errorWord') })
          : logError instanceof Error
            ? logError.message
            : t('suggest.logError')
      );
    } finally {
      if (logged.size > 0) {
        onLogged();
      }
      setBusy(null);
    }
  }

  /** Started from the tap itself: iOS asks for the microphone then. */
  async function startVoice() {
    setError(null);
    if (!voiceSupported()) {
      setError(t('suggest.voice.unsupported'));
      return;
    }
    try {
      const recording = await startRecording(() => void finishVoice(recording));
      setListening(recording);
      setElapsed(0);
      const started = Date.now();
      listenTimer.current = setInterval(() => setElapsed(Date.now() - started), 250);
    } catch (micError) {
      const denied = micError instanceof Error && /denied|not allowed|permission/i.test(`${micError.name} ${micError.message}`);
      setError(denied ? t('suggest.voice.micDenied') : t('suggest.voice.error'));
    }
  }

  function stopTimer() {
    if (listenTimer.current) {
      clearInterval(listenTimer.current);
      listenTimer.current = null;
    }
  }

  async function finishVoice(recording: ActiveRecording | null = listening) {
    if (!recording) {
      return;
    }
    stopTimer();
    setListening(null);
    setTranscribing(true);
    try {
      const audio = await recording.stop();
      const { text } = await transcribeSpeech(audio.base64, audio.mimeType, accessToken);
      setHave((current) => (current.trim() ? `${current.trim()}, ${text}` : text).slice(0, 600));
      setOnlyThese(true);
    } catch (voiceError) {
      setError(voiceError instanceof Error && voiceError.message !== 'cancelled' ? voiceError.message : t('suggest.voice.error'));
    } finally {
      setTranscribing(false);
    }
  }

  function cancelVoice() {
    stopTimer();
    listening?.cancel();
    setListening(null);
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
        setError(photoError instanceof Error ? photoError.message : t('suggest.photoError'));
      }
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('suggest.title')}</Text>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('suggest.whichMeal')}>
              {blocks.map((key) => (
                <Pressable
                  key={key}
                  style={[styles.chip, key === block && styles.chipActive]}
                  onPress={() => setBlock(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: key === block }}
                >
                  <Text style={[styles.chipLabel, key === block && styles.chipLabelActive]}>{t(`meals.blocks.${key}`)}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={have}
              onChangeText={setHave}
              placeholder={t('suggest.havePlaceholder')}
              placeholderTextColor={tc.fg_8a97a8}
              maxLength={600}
              multiline={onlyThese}
              accessibilityLabel={t('suggest.haveA11y')}
            />
            {have.trim() ? (
              <Pressable
                style={styles.onlyRow}
                onPress={() => setOnlyThese((current) => !current)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: onlyThese }}
              >
                <Text style={[styles.onlyBox, onlyThese && styles.onlyBoxOn]}>{onlyThese ? '☑' : '☐'}</Text>
                <View style={styles.onlyCopy}>
                  <Text style={styles.onlyLabel}>{t('suggest.voice.onlyThese')}</Text>
                  {onlyThese ? <Text style={styles.onlyHint}>{t('suggest.voice.onlyTheseHint')}</Text> : null}
                </View>
              </Pressable>
            ) : null}
            {listening ? (
              <View style={styles.listening} accessibilityLiveRegion="polite">
                <Text style={styles.listeningText}>🎙️ {t('suggest.voice.listening', { time: elapsedLabel(elapsed) })}</Text>
                <View style={styles.listeningRow}>
                  <Pressable style={styles.listeningCancel} onPress={cancelVoice} accessibilityRole="button">
                    <Text style={styles.listeningCancelLabel}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable style={styles.listeningDone} onPress={() => void finishVoice()} accessibilityRole="button">
                    <Text style={styles.listeningDoneLabel}>{t('suggest.voice.done')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {transcribing ? <Text style={styles.thinking}>{t('suggest.voice.transcribing')}</Text> : null}
            <View style={styles.modes}>
              <Pressable
                style={[styles.mode, (loading || transcribing || Boolean(listening)) && styles.disabled]}
                onPress={() => void startVoice()}
                disabled={loading || transcribing || Boolean(listening)}
                accessibilityRole="button"
              >
                <Text style={styles.modeIcon}>🎙️</Text>
                <Text style={styles.modeTitle}>{t('suggest.voice.title')}</Text>
                <Text style={styles.modeDetail}>{t('suggest.voice.detail')}</Text>
              </Pressable>
              <Pressable style={[styles.mode, loading && styles.disabled]} onPress={() => void askWithPhoto()} disabled={loading} accessibilityRole="button">
                <Text style={styles.modeIcon}>📷</Text>
                <Text style={styles.modeTitle}>{t('suggest.photo')}</Text>
                <Text style={styles.modeDetail}>{t('suggest.photoDetail')}</Text>
              </Pressable>
              <Pressable style={[styles.mode, styles.modePrimary, loading && styles.disabled]} onPress={() => void ask()} disabled={loading} accessibilityRole="button">
                <Text style={styles.modeIcon}>✨</Text>
                <Text style={[styles.modeTitle, styles.modeTitlePrimary]}>{t('suggest.letGusChoose')}</Text>
                <Text style={[styles.modeDetail, styles.modeDetailPrimary]}>{t('suggest.letGusChooseDetail')}</Text>
              </Pressable>
            </View>
            {loading ? <Text style={styles.thinking}>{t('suggest.thinking')}</Text> : null}

            {loading ? <ActivityIndicator color={tc.brand_primary} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {result ? (
              <>
                <Text style={styles.budget}>
                  {t('suggest.budget', {
                    block: blockLabel(result.block, result.block_label),
                    calories: Math.round(result.budget.calories),
                    protein: Math.round(result.budget.protein),
                    carbs: Math.round(result.budget.carbs),
                    fat: Math.round(result.budget.fat)
                  })}
                  {'  '}
                  {t('suggest.leftToday', { calories: Math.round(result.remaining.calories) })}
                </Text>
                {result.seen_items.length > 0 ? (
                  <Text style={styles.seen}>{t('suggest.sees', { items: result.seen_items.join(', ') })}</Text>
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
                        <Text style={styles.itemKcal}>{t('common.kcal', { value: Math.round(item.nutrition.calories) })}</Text>
                      </View>
                    ))}
                    <Text style={styles.totals}>
                      {t('common.kcal', { value: Math.round(meal.totals.calories) })} ·{' '}
                      {t('common.macrosShort', {
                        protein: Math.round(meal.totals.protein),
                        carbs: Math.round(meal.totals.carbs),
                        fat: Math.round(meal.totals.fat)
                      })}
                    </Text>
                    {meal.missing.length > 0 ? (
                      <Text style={styles.missing}>{t('suggest.leftOut', { items: meal.missing.join(', ') })}</Text>
                    ) : null}
                    {askReplace === index && result.planned_here ? (
                      <View style={styles.replaceBox}>
                        <Text style={styles.replaceText}>
                          {t('suggest.planned', {
                            title: result.planned_here.title,
                            calories: Math.round(result.planned_here.calories),
                            block: blockLabel(result.block, result.block_label).toLowerCase()
                          })}
                        </Text>
                        <View style={styles.actions}>
                          <Pressable
                            style={[styles.action, styles.actionPrimary]}
                            onPress={() => void logIt(index, meal, result.meal_slot, result.planned_here?.slot_id)}
                            accessibilityRole="button"
                          >
                            <Text style={styles.actionPrimaryLabel}>{t('suggest.replacePlanned')}</Text>
                          </Pressable>
                          <Pressable style={styles.action} onPress={() => void logIt(index, meal, result.meal_slot)} accessibilityRole="button">
                            <Text style={styles.keepLabel}>{t('suggest.keepPlanned')}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                    {done[index] ? (
                      <Text style={styles.done}>{addedToDayLabel(dayName, t)}</Text>
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
                          <Text style={styles.actionPrimaryLabel}>{busy === index ? t('common.adding') : t('suggest.logIt')}</Text>
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
  modes: { flexDirection: 'row', gap: 8 },
  onlyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  onlyBox: { fontSize: 20, color: tc.fg_5c6d80 },
  onlyBoxOn: { color: tc.fg_0f766e },
  onlyCopy: { flex: 1, gap: 2 },
  onlyLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  onlyHint: { color: tc.fg_5c6d80, fontSize: 13 },
  listening: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: tc.bg_f3f6fb },
  listeningText: { color: tc.fg_132536, fontSize: 17, fontWeight: '800' },
  listeningRow: { flexDirection: 'row', gap: 10 },
  listeningCancel: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7 },
  listeningCancelLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  listeningDone: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, backgroundColor: tc.brand_primary },
  listeningDoneLabel: { color: tc.fg_ffffff, fontSize: 15, fontWeight: '800' },
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
