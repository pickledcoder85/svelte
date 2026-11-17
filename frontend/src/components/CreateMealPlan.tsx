/**
 * Create a Meal Plan (Plan → Meals): a guided flow.
 *
 * 1. How many days (3, 5, 7, or days of the week)  2. Which meals  3. Cooking time
 * 4. Variety (same every time · a rotation of 2-3 · different every day)
 * Then Gus proposes a meal for each chosen meal type. Check ☑ the ones to keep, try again for
 * the rest, and move to the next step (the next rotation meal, or the next day). Finally pick a
 * start date, decide Replace this meal / Keep planned where a day already has one, and create
 * the plan. A shopping list is offered afterwards.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDate, useT, type Locale } from '../i18n';
import { createMealPlan, createShoppingList, proposePlanMeals } from '../lib/api';
import { isShoppingRole, planListTitle } from '../lib/shopping';
import { addDaysToDateKey, localDateKey } from '../lib/dates';
import {
  dayCount,
  planDates,
  shoppingAmount,
  shoppingList,
  stepCount,
  stepForDay,
  stepNote,
  weekdayLabel,
  type CookingTime,
  type DayChoice,
  type PlanMeal,
  type PlanVariety,
  type ShoppingItem
} from '../lib/meal-plan-builder';
import { ingredientLine } from '../lib/portions';
import { tc } from '../theme/palette';
import type { MealPlanDay, ProposedPlanMeal } from '../types';

// Labels come from the dictionary (createPlan.*, meals.slots.*); the ids are what's sent.
const MEALS: Array<{ id: PlanMeal }> = [{ id: 'breakfast' }, { id: 'lunch' }, { id: 'dinner' }];
const TIMES: CookingTime[] = ['very_little', 'some', 'enjoy'];
const VARIETIES: PlanVariety[] = ['same', 'rotate', 'daily'];

type Step = 'days' | 'meals' | 'time' | 'variety' | 'propose' | 'review' | 'done';
type Kept = Record<PlanMeal, ProposedPlanMeal | undefined>;

function dateLabel(key: string, locale: Locale): string {
  return formatDate(new Date(`${key}T00:00:00`), { weekday: 'short', month: 'short', day: 'numeric' }, locale);
}

export function CreateMealPlan({
  accessToken,
  existingPlans,
  onCreated,
  onShoppingList,
  onClose
}: {
  accessToken: string;
  /** To find days that already have a meal planned in the same slot. */
  existingPlans: MealPlanDay[];
  onCreated(): void;
  /** A shopping list was saved: open it (closes this sheet). */
  onShoppingList(listId: string): void;
  onClose(): void;
}) {
  const t = useT();
  const [step, setStep] = useState<Step>('days');
  const [days, setDays] = useState<DayChoice>({ kind: 'count', count: 5 });
  const [meals, setMeals] = useState<PlanMeal[]>(['breakfast', 'lunch', 'dinner']);
  const [time, setTime] = useState<CookingTime>('some');
  const [variety, setVariety] = useState<PlanVariety>('rotate');
  // Proposal steps: the meals chosen at each step, and the current step's proposals + checks.
  const [chosen, setChosen] = useState<Kept[]>([]);
  const [current, setCurrent] = useState<ProposedPlanMeal[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [rejected, setRejected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState(addDaysToDateKey(localDateKey(), 1));
  const [conflictChoice, setConflictChoice] = useState<Record<string, 'replace' | 'keep'>>({});
  const [result, setResult] = useState<{ created: number; replaced: number; kept: number } | null>(null);
  // The meals actually created (a "Keep planned" slot wasn't): the shopping list's source.
  const [createdMeals, setCreatedMeals] = useState<Array<{ name: string; items: ShoppingItem[] }>>([]);
  // The days the created meals landed on (for the shopping list's title), and the saved list.
  const [createdDates, setCreatedDates] = useState<string[]>([]);
  const [savedListId, setSavedListId] = useState<string | null>(null);
  const [savingList, setSavingList] = useState(false);

  const steps = stepCount(variety, dayCount(days));
  const stepIndex = chosen.length;
  const dates = useMemo(() => planDates(days, start), [days, start]);

  const keptTitles = () =>
    chosen.flatMap((kept) => Object.values(kept).filter(Boolean).map((meal) => meal!.option?.name ?? '')).filter(Boolean);

  /** Meals to avoid: everything kept so far comes first; rejected ones fill the rest (max 60). */
  const avoidList = (kept: string[], turnedDown: string[]) =>
    [...new Set([...kept.filter(Boolean), ...turnedDown.filter(Boolean).slice(-40)])].slice(0, 60);

  async function propose(only: PlanMeal[], keep: ProposedPlanMeal[] = [], turnedDown: string[] = rejected, atStep = stepIndex) {
    setLoading(true);
    setError(null);
    try {
      const response = await proposePlanMeals(
        {
          meals: only,
          cooking_time: time,
          avoid_titles: avoidList([...keptTitles(), ...keep.map((meal) => meal.option?.name ?? '')], turnedDown),
          step_note: stepNote(variety, atStep, steps)
        },
        accessToken
      );
      const merged = MEALS.filter((meal) => meals.includes(meal.id)).map(
        (meal) => keep.find((item) => item.meal === meal.id) ?? response.proposals.find((item) => item.meal === meal.id)!
      );
      setCurrent(merged.filter(Boolean));
      setChecked(Object.fromEntries(keep.map((meal) => [meal.meal, true])));
    } catch (proposeError) {
      setError(proposeError instanceof Error ? proposeError.message : t('suggest.stuck'));
    } finally {
      setLoading(false);
    }
  }

  function startProposing() {
    setChosen([]);
    setRejected([]);
    setStep('propose');
    void propose(meals);
  }

  function tryAgain() {
    const keep = current.filter((meal) => checked[meal.meal] && meal.option);
    const again = current.filter((meal) => !checked[meal.meal] || !meal.option);
    // Pass the new list straight in: the state update isn't visible until the next render.
    const nextRejected = [...rejected, ...again.map((meal) => meal.option?.name ?? '').filter(Boolean)];
    setRejected(nextRejected);
    void propose(
      again.map((meal) => meal.meal),
      keep,
      nextRejected
    );
  }

  function nextStep() {
    const kept = Object.fromEntries(current.map((meal) => [meal.meal, meal])) as Kept;
    const all = [...chosen, kept];
    setChosen(all);
    setCurrent([]);
    setChecked({});
    if (all.length >= steps) {
      setStep('review');
    } else {
      // The next rotation meal or day: fresh ideas that avoid what's already kept.
      setLoading(true);
      setError(null);
      void proposePlanMeals(
        {
          meals,
          cooking_time: time,
          avoid_titles: avoidList(all.flatMap((k) => Object.values(k).map((m) => m?.option?.name ?? '')), rejected),
          step_note: stepNote(variety, all.length, steps)
        },
        accessToken
      )
        .then((response) => setCurrent(response.proposals))
        .catch((proposeError) => setError(proposeError instanceof Error ? proposeError.message : t('suggest.stuck')))
        .finally(() => setLoading(false));
    }
  }

  // The plan: each date gets its step's meal for each meal type.
  const assignments = dates.flatMap((date, dayIndex) => {
    const kept = chosen[stepForDay(variety, dayIndex, steps)];
    return meals
      .map((meal) => ({ date, meal, proposal: kept?.[meal] }))
      .filter((entry) => entry.proposal?.option);
  });
  const conflictKey = (date: string, meal: PlanMeal) => `${date}:${meal}`;
  const conflicts = assignments.filter(({ date, meal }) =>
    existingPlans.some(
      (day) => day.plan_date === date && day.slots.some((slot) => slot.meal_label.toLowerCase() === meal && !slot.eaten_at)
    )
  );

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const sent = assignments.map(({ date, meal, proposal }) => ({
        date,
        meal,
        proposal: proposal!,
        onConflict: conflictChoice[conflictKey(date, meal)] ?? ('keep' as const),
        conflicted: conflicts.some((c) => c.date === date && c.meal === meal)
      }));
      const response = await createMealPlan(
        assignments.map(({ date, meal, proposal }) => ({
          plan_date: date,
          meal,
          title: proposal!.option!.name,
          calories: proposal!.option!.totals.calories,
          on_conflict: conflictChoice[conflictKey(date, meal)] ?? 'keep',
          items: proposal!.option!.items.map((item) => ({
            name: item.name,
            grams: item.grams,
            calories: item.nutrition.calories,
            protein: item.nutrition.protein,
            carbs: item.nutrition.carbs,
            fat: item.nutrition.fat,
            ...(item.count && item.unit ? { count: item.count, unit: item.unit } : {})
          }))
        })),
        accessToken
      );
      setResult(response);
      setCreatedMeals(
        sent
          .filter((entry) => !entry.conflicted || entry.onConflict === 'replace')
          .map((entry) => ({
            name: `${entry.meal}:${entry.proposal.option!.name}`,
            items: entry.proposal.option!.items.map((item) => ({
              name: item.name,
              grams: item.grams,
              role: item.role,
              count: item.count,
              unit: item.unit,
              unit_plural: item.unit_plural
            }))
          }))
      );
      setCreatedDates([
        ...new Set(sent.filter((entry) => !entry.conflicted || entry.onConflict === 'replace').map((entry) => entry.date))
      ]);
      setSavedListId(null);
      setStep('done');
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('createPlan.errors.create'));
    } finally {
      setLoading(false);
    }
  }

  /** Save the plan's shopping list (once) and open it to tick off. */
  async function saveShoppingList() {
    if (savingList) {
      return;
    }
    if (savedListId) {
      onShoppingList(savedListId);
      return;
    }
    setSavingList(true);
    setError(null);
    try {
      const list = await createShoppingList(
        planListTitle(createdDates, t),
        shopping.flatMap((group) =>
          group.items.map((item) => ({ name: item.name, amount: shoppingAmount(item, t), role: isShoppingRole(group.role) ? group.role : 'other' }))
        ),
        accessToken
      );
      setSavedListId(list.id);
      onShoppingList(list.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('createPlan.errors.saveList'));
    } finally {
      setSavingList(false);
    }
  }

  // Shopping list: each created meal × the days it landed on (a "Keep planned" slot wasn't created).
  const shopping = useMemo(() => {
    const counts = new Map<string, { times: number; items: ShoppingItem[] }>();
    for (const meal of createdMeals) {
      const entry = counts.get(meal.name) ?? { times: 0, items: meal.items };
      entry.times += 1;
      counts.set(meal.name, entry);
    }
    return shoppingList([...counts.values()], t);
  }, [createdMeals, t]);

  const setupStepIndex = { days: 1, meals: 2, time: 3, variety: 4 } as Record<Step, number>;

  const choice = (active: boolean, label: string, detail: string | null, onPress: () => void, key: string) => (
    <Pressable key={key} style={[styles.card, active && styles.cardActive]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: active }}>
      <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>{label}</Text>
      {detail ? <Text style={styles.cardDetail}>{detail}</Text> : null}
    </Pressable>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.close}>{t('common.close')}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('createPlan.title')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {setupStepIndex[step] ? <Text style={styles.stepTag}>{t('createPlan.stepOf', { step: setupStepIndex[step] })}</Text> : null}

          {step === 'days' ? (
            <>
              <Text style={styles.title}>{t('createPlan.daysTitle')}</Text>
              <View style={styles.row}>
                {[3, 5, 7].map((count) => (
                  <Pressable
                    key={count}
                    style={[styles.pill, days.kind === 'count' && days.count === count && styles.pillActive]}
                    onPress={() => setDays({ kind: 'count', count })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: days.kind === 'count' && days.count === count }}
                  >
                    <Text style={[styles.pillLabel, days.kind === 'count' && days.count === count && styles.pillLabelActive]}>{t('createPlan.daysCount', { count })}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.muted}>{t('createPlan.orWeekdays')}</Text>
              <View style={styles.row}>
                {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                  const on = days.kind === 'weekdays' && days.weekdays.includes(weekday);
                  const label = weekdayLabel(weekday, t);
                  return (
                    <Pressable
                      key={weekday}
                      style={[styles.day, on && styles.pillActive]}
                      onPress={() =>
                        setDays((current) => {
                          const list = current.kind === 'weekdays' ? current.weekdays : [];
                          const next = list.includes(weekday) ? list.filter((d) => d !== weekday) : [...list, weekday].sort();
                          return next.length ? { kind: 'weekdays', weekdays: next } : { kind: 'count', count: 5 };
                        })
                      }
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Text style={[styles.pillLabel, on && styles.pillLabelActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable style={styles.primary} onPress={() => setStep('meals')} accessibilityRole="button">
                <Text style={styles.primaryLabel}>{t('setup.nav.next')}</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'meals' ? (
            <>
              <Text style={styles.title}>{t('createPlan.mealsTitle')}</Text>
              {MEALS.map((meal) => {
                const on = meals.includes(meal.id);
                return (
                  <Pressable
                    key={meal.id}
                    style={[styles.card, on && styles.cardActive]}
                    onPress={() => setMeals((list) => (on ? list.filter((m) => m !== meal.id) : [...list, meal.id]))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[styles.cardTitle, on && styles.cardTitleActive]}>
                      {on ? '☑ ' : '☐ '}
                      {t(`meals.slots.${meal.id}`)}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => setStep('days')}>
                  <Text style={styles.secondaryLabel}>{t('setup.nav.back')}</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex, !meals.length && styles.disabled]} disabled={!meals.length} onPress={() => setStep('time')}>
                  <Text style={styles.primaryLabel}>{t('setup.nav.next')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'time' ? (
            <>
              <Text style={styles.title}>{t('createPlan.timeTitle')}</Text>
              {TIMES.map((id) => choice(time === id, t(`createPlan.times.${id}.label`), t(`createPlan.times.${id}.detail`), () => setTime(id), id))}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => setStep('meals')}>
                  <Text style={styles.secondaryLabel}>{t('setup.nav.back')}</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex]} onPress={() => setStep('variety')}>
                  <Text style={styles.primaryLabel}>{t('setup.nav.next')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'variety' ? (
            <>
              <Text style={styles.title}>{t('createPlan.varietyTitle')}</Text>
              {VARIETIES.map((id) =>
                choice(variety === id, t(`createPlan.varieties.${id}.label`), t(`createPlan.varieties.${id}.detail`), () => setVariety(id), id)
              )}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => setStep('time')}>
                  <Text style={styles.secondaryLabel}>{t('setup.nav.back')}</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex]} onPress={startProposing}>
                  <Text style={styles.primaryLabel}>{t('createPlan.letGusPlan')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'propose' ? (
            <>
              <Text style={styles.stepTag}>
                {variety === 'same'
                  ? t('createPlan.yourMeals')
                  : t(variety === 'rotate' ? 'createPlan.rotationMeal' : 'createPlan.dayOf', { step: stepIndex + 1, total: steps })}
              </Text>
              <Text style={styles.title}>{t('createPlan.checkToKeep')}</Text>
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={tc.brand_primary} />
                  <Text style={styles.thinking}>{t('createPlan.planning')}</Text>
                </View>
              ) : null}
              {!loading &&
                current.map((proposal) => {
                  const on = Boolean(checked[proposal.meal]);
                  const meal = proposal.option;
                  return (
                    <Pressable
                      key={proposal.meal}
                      style={[styles.mealCard, on && styles.cardActive]}
                      onPress={() => meal && setChecked((value) => ({ ...value, [proposal.meal]: !on }))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on, disabled: !meal }}
                    >
                      <Text style={styles.mealTag}>{t(`meals.slots.${proposal.meal}`)}</Text>
                      {meal ? (
                        <>
                          <Text style={styles.cardTitle}>
                            {on ? '☑ ' : '☐ '}
                            {meal.name}
                          </Text>
                          {meal.why ? <Text style={styles.cardDetail}>{meal.why}</Text> : null}
                          {meal.items.map((item, index) => (
                            <Text key={index} style={styles.item}>
                              {ingredientLine(item)} · {Math.round(item.nutrition.calories)} kcal
                            </Text>
                          ))}
                          <Text style={styles.totals}>
                            {t('createPlan.totals', {
                              calories: Math.round(meal.totals.calories),
                              protein: Math.round(meal.totals.protein),
                              carbs: Math.round(meal.totals.carbs),
                              fat: Math.round(meal.totals.fat)
                            })}
                          </Text>
                          {proposal.prep ? <Text style={styles.prep}>{proposal.prep}</Text> : null}
                        </>
                      ) : (
                        <Text style={styles.cardDetail}>{proposal.message}</Text>
                      )}
                    </Pressable>
                  );
                })}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {!loading && current.length === 0 ? (
                <Pressable style={styles.primary} onPress={() => void propose(meals)} accessibilityRole="button">
                  <Text style={styles.primaryLabel}>{t('createPlan.askAgain')}</Text>
                </Pressable>
              ) : null}
              {!loading && current.length > 0 ? (
                <View style={styles.nav}>
                  <Pressable
                    style={[styles.secondary, current.every((p) => checked[p.meal]) && styles.disabled]}
                    onPress={tryAgain}
                    disabled={current.every((p) => checked[p.meal])}
                  >
                    <Text style={styles.secondaryLabel}>{t('createPlan.tryAgain')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primary, styles.flex, !(current.length && current.every((p) => checked[p.meal] && p.option)) && styles.disabled]}
                    disabled={!(current.length && current.every((p) => checked[p.meal] && p.option))}
                    onPress={nextStep}
                  >
                    <Text style={styles.primaryLabel}>{stepIndex + 1 >= steps ? t('createPlan.reviewPlan') : t('setup.nav.next')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'review' ? (
            <>
              <Text style={styles.title}>{t('createPlan.yourPlan')}</Text>
              <Text style={styles.muted}>{t('createPlan.startDate')}</Text>
              <input
                type="date"
                value={start}
                min={localDateKey()}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value) {
                    setStart(value < localDateKey() ? localDateKey() : value); // never a day that's gone
                  }
                }}
                style={{ fontSize: 17, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                aria-label={t('createPlan.startDate')}
              />
              {dates.map((date, dayIndex) => (
                <View key={date} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>{dateLabel(date, t.locale)}</Text>
                  {meals.map((meal) => {
                    const proposal = chosen[stepForDay(variety, dayIndex, steps)]?.[meal];
                    if (!proposal?.option) {
                      return null;
                    }
                    const isConflict = conflicts.some((c) => c.date === date && c.meal === meal);
                    const decision = conflictChoice[conflictKey(date, meal)] ?? 'keep';
                    return (
                      <View key={meal} style={styles.dayRow}>
                        <Text style={styles.item}>
                          {t('createPlan.mealLine', {
                            meal: t(`meals.slots.${meal}`),
                            name: proposal.option.name,
                            calories: Math.round(proposal.option.totals.calories)
                          })}
                        </Text>
                        {isConflict ? (
                          <View style={styles.row}>
                            {(['replace', 'keep'] as const).map((option) => (
                              <Pressable
                                key={option}
                                style={[styles.smallPill, decision === option && styles.pillActive]}
                                onPress={() => setConflictChoice((value) => ({ ...value, [conflictKey(date, meal)]: option }))}
                              >
                                <Text style={[styles.smallPillLabel, decision === option && styles.pillLabelActive]}>
                                  {option === 'replace' ? t('createPlan.replace') : t('createPlan.keepPlanned')}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => { setChosen([]); setStep('variety'); }}>
                  <Text style={styles.secondaryLabel}>{t('createPlan.startOver')}</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex, loading && styles.disabled]} disabled={loading} onPress={() => void create()}>
                  <Text style={styles.primaryLabel}>{loading ? t('createPlan.creating') : t('createPlan.create')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'done' && result ? (
            <>
              <Text style={styles.title}>{t('createPlan.created')}</Text>
              <Text style={styles.muted}>
                {t('createPlan.summary', { count: result.created })}
                {result.replaced ? t('createPlan.replaced', { count: result.replaced }) : ''}
                {result.kept ? t('createPlan.kept', { count: result.kept }) : ''}
                {t('createPlan.summaryEnd')}
              </Text>
              {shopping.length > 0 ? (
                <Pressable style={[styles.primary, savingList && styles.disabled]} onPress={() => void saveShoppingList()} disabled={savingList}>
                  <Text style={styles.primaryLabel}>{savingList ? t('common.saving') : t('createPlan.makeList')}</Text>
                </Pressable>
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.secondary} onPress={onClose}>
                <Text style={styles.secondaryLabel}>{t('common.done')}</Text>
              </Pressable>
            </>
          ) : null}

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tc.bg_f4efe4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 10 },
  close: { color: tc.fg_0f766e, fontSize: 16, fontWeight: '700' },
  headerTitle: { color: tc.fg_132536, fontSize: 17, fontWeight: '800' },
  body: { padding: 16, gap: 12, paddingBottom: 60 },
  stepTag: { color: tc.fg_0f766e, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { color: tc.fg_132536, fontSize: 22, fontWeight: '800' },
  muted: { color: tc.fg_5c6d80, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  day: { width: 44, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  pillActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  pillLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  pillLabelActive: { color: tc.fg_ffffff },
  smallPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  smallPillLabel: { color: tc.fg_132536, fontSize: 12, fontWeight: '700' },
  card: { gap: 4, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  cardActive: { borderColor: tc.line_0f766e, backgroundColor: tc.bg_ecfdf3 },
  cardTitle: { color: tc.fg_132536, fontSize: 16, fontWeight: '800' },
  cardTitleActive: { color: tc.fg_0f766e },
  cardDetail: { color: tc.fg_5c6d80, fontSize: 13 },
  mealCard: { gap: 4, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  mealTag: { color: tc.fg_5c6d80, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  item: { color: tc.fg_132536, fontSize: 14 },
  totals: { color: tc.fg_132536, fontSize: 14, fontWeight: '800', marginTop: 2 },
  prep: { color: tc.fg_2f6b4f, fontSize: 13, lineHeight: 18, marginTop: 2 },
  dayCard: { gap: 4, padding: 12, borderRadius: 14, backgroundColor: tc.bg_ffffff },
  dayTitle: { color: tc.fg_132536, fontSize: 15, fontWeight: '800' },
  dayRow: { gap: 6, paddingVertical: 2 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  thinking: { color: tc.fg_0f766e, fontSize: 14, fontWeight: '700' },
  nav: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  flex: { flex: 1 },
  primary: { alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 15, paddingHorizontal: 12 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  error: { color: tc.fg_b42318, fontSize: 14 }
});
