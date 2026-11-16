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

import { createMealPlan, proposePlanMeals } from '../lib/api';
import { addDaysToDateKey, localDateKey } from '../lib/dates';
import {
  dayCount,
  formatGrams,
  planDates,
  shoppingList,
  stepCount,
  stepForDay,
  stepNote,
  WEEKDAY_LABELS,
  type CookingTime,
  type DayChoice,
  type PlanMeal,
  type PlanVariety
} from '../lib/meal-plan-builder';
import { tc } from '../theme/palette';
import type { MealPlanDay, ProposedPlanMeal } from '../types';

const MEALS: Array<{ id: PlanMeal; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' }
];
const TIMES: Array<{ id: CookingTime; label: string; detail: string }> = [
  { id: 'very_little', label: 'Very little', detail: 'Sheet-pan, one-pot, or no-cook; batch once' },
  { id: 'some', label: 'Some', detail: 'Simple meals in about 30 minutes' },
  { id: 'enjoy', label: 'I enjoy cooking', detail: 'Anything goes, up to about an hour' }
];
const VARIETIES: Array<{ id: PlanVariety; label: string; detail: string }> = [
  { id: 'same', label: 'Same meal every time', detail: 'One breakfast, one lunch, one dinner, repeated' },
  { id: 'rotate', label: '2–3 meals through the week', detail: 'A short rotation, easy to batch' },
  { id: 'daily', label: 'Different every day', detail: 'A new meal each day' }
];

type Step = 'days' | 'meals' | 'time' | 'variety' | 'propose' | 'review' | 'done' | 'shopping';
type Kept = Record<PlanMeal, ProposedPlanMeal | undefined>;

function dateLabel(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function CreateMealPlan({
  accessToken,
  existingPlans,
  onCreated,
  onClose
}: {
  accessToken: string;
  /** To find days that already have a meal planned in the same slot. */
  existingPlans: MealPlanDay[];
  onCreated(): void;
  onClose(): void;
}) {
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

  const steps = stepCount(variety, dayCount(days));
  const stepIndex = chosen.length;
  const dates = useMemo(() => planDates(days, start), [days, start]);

  const keptTitles = () =>
    chosen.flatMap((kept) => Object.values(kept).filter(Boolean).map((meal) => meal!.option?.name ?? '')).filter(Boolean);

  async function propose(only: PlanMeal[], keep: ProposedPlanMeal[] = []) {
    setLoading(true);
    setError(null);
    try {
      const response = await proposePlanMeals(
        {
          meals: only,
          cooking_time: time,
          avoid_titles: [...keptTitles(), ...keep.map((meal) => meal.option?.name ?? ''), ...rejected].filter(Boolean),
          step_note: stepNote(variety, stepIndex, steps)
        },
        accessToken
      );
      const merged = MEALS.filter((meal) => meals.includes(meal.id)).map(
        (meal) => keep.find((item) => item.meal === meal.id) ?? response.proposals.find((item) => item.meal === meal.id)!
      );
      setCurrent(merged.filter(Boolean));
      setChecked(Object.fromEntries(keep.map((meal) => [meal.meal, true])));
    } catch (proposeError) {
      setError(proposeError instanceof Error ? proposeError.message : 'Gus is stuck. Try again.');
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
    setRejected((list) => [...list, ...again.map((meal) => meal.option?.name ?? '').filter(Boolean)]);
    void propose(
      again.map((meal) => meal.meal),
      keep
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
          avoid_titles: [...all.flatMap((k) => Object.values(k).map((m) => m?.option?.name ?? '')), ...rejected].filter(Boolean),
          step_note: stepNote(variety, all.length, steps)
        },
        accessToken
      )
        .then((response) => setCurrent(response.proposals))
        .catch((proposeError) => setError(proposeError instanceof Error ? proposeError.message : 'Gus is stuck. Try again.'))
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
            fat: item.nutrition.fat
          }))
        })),
        accessToken
      );
      setResult(response);
      setStep('done');
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the plan.');
    } finally {
      setLoading(false);
    }
  }

  // Shopping list: each kept meal × the days it lands on (meals kept as "Keep planned" excluded).
  const shopping = useMemo(() => {
    const counts = new Map<string, { times: number; items: Array<{ name: string; grams: number; role: string }> }>();
    for (const { date, meal, proposal } of assignments) {
      if (conflicts.some((c) => c.date === date && c.meal === meal) && (conflictChoice[conflictKey(date, meal)] ?? 'keep') === 'keep') {
        continue;
      }
      const key = `${meal}:${proposal!.option!.name}`;
      const entry = counts.get(key) ?? { times: 0, items: proposal!.option!.items.map((item) => ({ name: item.name, grams: item.grams, role: item.role })) };
      entry.times += 1;
      counts.set(key, entry);
    }
    return shoppingList([...counts.values()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments.length, chosen, conflictChoice]);

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
            <Text style={styles.close}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Create a meal plan</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {setupStepIndex[step] ? <Text style={styles.stepTag}>Step {setupStepIndex[step]} of 4</Text> : null}

          {step === 'days' ? (
            <>
              <Text style={styles.title}>Plan for how many days?</Text>
              <View style={styles.row}>
                {[3, 5, 7].map((count) => (
                  <Pressable
                    key={count}
                    style={[styles.pill, days.kind === 'count' && days.count === count && styles.pillActive]}
                    onPress={() => setDays({ kind: 'count', count })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: days.kind === 'count' && days.count === count }}
                  >
                    <Text style={[styles.pillLabel, days.kind === 'count' && days.count === count && styles.pillLabelActive]}>{count} days</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.muted}>Or choose days of the week:</Text>
              <View style={styles.row}>
                {WEEKDAY_LABELS.map((label, weekday) => {
                  const on = days.kind === 'weekdays' && days.weekdays.includes(weekday);
                  return (
                    <Pressable
                      key={label}
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
                <Text style={styles.primaryLabel}>Next</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'meals' ? (
            <>
              <Text style={styles.title}>Plan which meals?</Text>
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
                      {meal.label}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => setStep('days')}>
                  <Text style={styles.secondaryLabel}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex, !meals.length && styles.disabled]} disabled={!meals.length} onPress={() => setStep('time')}>
                  <Text style={styles.primaryLabel}>Next</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'time' ? (
            <>
              <Text style={styles.title}>How much time do you have for cooking?</Text>
              {TIMES.map((option) => choice(time === option.id, option.label, option.detail, () => setTime(option.id), option.id))}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => setStep('meals')}>
                  <Text style={styles.secondaryLabel}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex]} onPress={() => setStep('variety')}>
                  <Text style={styles.primaryLabel}>Next</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'variety' ? (
            <>
              <Text style={styles.title}>Meal variety</Text>
              {VARIETIES.map((option) => choice(variety === option.id, option.label, option.detail, () => setVariety(option.id), option.id))}
              <View style={styles.nav}>
                <Pressable style={styles.secondary} onPress={() => setStep('time')}>
                  <Text style={styles.secondaryLabel}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex]} onPress={startProposing}>
                  <Text style={styles.primaryLabel}>✨ Let Gus plan</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'propose' ? (
            <>
              <Text style={styles.stepTag}>
                {variety === 'same' ? 'Your meals' : variety === 'rotate' ? `Rotation meal ${stepIndex + 1} of ${steps}` : `Day ${stepIndex + 1} of ${steps}`}
              </Text>
              <Text style={styles.title}>Check ☑ the meals to keep</Text>
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={tc.brand_primary} />
                  <Text style={styles.thinking}>Gus is planning…</Text>
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
                      <Text style={styles.mealTag}>{proposal.label}</Text>
                      {meal ? (
                        <>
                          <Text style={styles.cardTitle}>
                            {on ? '☑ ' : '☐ '}
                            {meal.name}
                          </Text>
                          {meal.why ? <Text style={styles.cardDetail}>{meal.why}</Text> : null}
                          {meal.items.map((item, index) => (
                            <Text key={index} style={styles.item}>
                              {Math.round(item.grams)} g {item.name} · {Math.round(item.nutrition.calories)} kcal
                            </Text>
                          ))}
                          <Text style={styles.totals}>
                            {Math.round(meal.totals.calories)} kcal · P {Math.round(meal.totals.protein)} · C {Math.round(meal.totals.carbs)} · F{' '}
                            {Math.round(meal.totals.fat)}
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
              {!loading ? (
                <View style={styles.nav}>
                  <Pressable
                    style={[styles.secondary, current.every((p) => checked[p.meal]) && styles.disabled]}
                    onPress={tryAgain}
                    disabled={current.every((p) => checked[p.meal])}
                  >
                    <Text style={styles.secondaryLabel}>Try again for unchecked</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primary, styles.flex, !(current.length && current.every((p) => checked[p.meal] && p.option)) && styles.disabled]}
                    disabled={!(current.length && current.every((p) => checked[p.meal] && p.option))}
                    onPress={nextStep}
                  >
                    <Text style={styles.primaryLabel}>{stepIndex + 1 >= steps ? 'Review plan' : 'Next'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'review' ? (
            <>
              <Text style={styles.title}>Your plan</Text>
              <Text style={styles.muted}>Start date</Text>
              <input
                type="date"
                value={start}
                min={localDateKey()}
                onChange={(event) => event.target.value && setStart(event.target.value)}
                style={{ fontSize: 17, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                aria-label="Start date"
              />
              {dates.map((date, dayIndex) => (
                <View key={date} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>{dateLabel(date)}</Text>
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
                          {MEALS.find((m) => m.id === meal)?.label}: {proposal.option.name} · {Math.round(proposal.option.totals.calories)} kcal
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
                                  {option === 'replace' ? 'Replace this meal' : 'Keep planned'}
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
                  <Text style={styles.secondaryLabel}>Start over</Text>
                </Pressable>
                <Pressable style={[styles.primary, styles.flex, loading && styles.disabled]} disabled={loading} onPress={() => void create()}>
                  <Text style={styles.primaryLabel}>{loading ? 'Creating…' : 'Create plan'}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'done' && result ? (
            <>
              <Text style={styles.title}>Plan created ✓</Text>
              <Text style={styles.muted}>
                {result.created} meals planned
                {result.replaced ? ` · ${result.replaced} replaced` : ''}
                {result.kept ? ` · ${result.kept} kept as they were` : ''}. They show on Today as Planned: tick ✓ Ate it to log one.
              </Text>
              <Pressable style={styles.primary} onPress={() => setStep('shopping')}>
                <Text style={styles.primaryLabel}>🛒 Make a shopping list</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={onClose}>
                <Text style={styles.secondaryLabel}>Done</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'shopping' ? (
            <>
              <Text style={styles.title}>Shopping list</Text>
              {shopping.map((group) => (
                <View key={group.role} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>{group.label}</Text>
                  {group.items.map((item) => (
                    <Text key={item.name} style={styles.item}>
                      ☐ {item.name} · {formatGrams(item.grams)}
                    </Text>
                  ))}
                </View>
              ))}
              <Pressable
                style={styles.primary}
                onPress={() => {
                  const text = shopping
                    .map((group) => `${group.label}\n${group.items.map((item) => `- ${item.name}: ${formatGrams(item.grams)}`).join('\n')}`)
                    .join('\n\n');
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    void navigator.share({ title: 'Shopping list', text }).catch(() => undefined);
                  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    void navigator.clipboard.writeText(text);
                  }
                }}
              >
                <Text style={styles.primaryLabel}>Share or copy the list</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={onClose}>
                <Text style={styles.secondaryLabel}>Done</Text>
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
