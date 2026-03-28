import { useEffect, useMemo, useState } from 'react';
import { calculateMeal, fetchBackendHealth, fetchWeeklyMetrics, importRecipe } from './lib/api';
import {
  mealTotals,
  progressPercent,
  recipeScaleLabel,
  scaleMealIngredients
} from './lib/nutrition';
import {
  demoDashboardSnapshot,
  demoFoodStrip,
  demoMeal,
  demoRecipe,
  demoRecipeImports
} from './mock-data';
import { MetricCard } from './components/MetricCard';
import { ProgressTrack } from './components/ProgressTrack';
import { SectionNav } from './components/SectionNav';
import { StatusPill } from './components/StatusPill';
import { Surface } from './components/Surface';
import type { AppSection, DashboardSnapshot, MealTotals } from './types';

const recipeScales = [1.25, 1.5, 2] as const;

function App() {
  const [section, setSection] = useState<AppSection>('dashboard');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(demoDashboardSnapshot);
  const [syncTone, setSyncTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [syncLabel, setSyncLabel] = useState('Checking backend');
  const [syncDetail, setSyncDetail] = useState('Starting with seeded data.');
  const [recipeScale, setRecipeScale] = useState<(typeof recipeScales)[number]>(1.5);
  const [mealTotalsState, setMealTotalsState] = useState<MealTotals>(demoDashboardSnapshot.mealTotals);

  useEffect(() => {
    const controller = new AbortController();

    async function syncBackend() {
      try {
        const [health, metrics, totals, recipeImport] = await Promise.all([
          fetchBackendHealth(),
          fetchWeeklyMetrics(),
          calculateMeal(demoMeal),
          importRecipe(demoRecipeImports)
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setSnapshot({
          connectionLabel: health.service,
          connectionDetail: `Connected at ${new Date(health.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}`,
          weeklyMetrics: metrics,
          mealTotals: totals,
          recipeImport
        });
        setMealTotalsState(totals);
        setSyncTone('live');
        setSyncLabel('Live backend');
        setSyncDetail('Dashboard, meals, and recipes are synced from the Python API.');
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSnapshot(demoDashboardSnapshot);
        setMealTotalsState(demoDashboardSnapshot.mealTotals);
        setSyncTone('demo');
        setSyncLabel('Demo data');
        setSyncDetail(
          error instanceof Error ? error.message : 'Backend unavailable. Showing local frontend data.'
        );
      }
    }

    void syncBackend();

    return () => controller.abort();
  }, []);

  const mealPreview = useMemo(() => scaleMealIngredients(demoMeal, recipeScale), [recipeScale]);
  const recipeTotals = useMemo(() => mealTotals(mealPreview), [mealPreview]);

  const calorieProgress = progressPercent(
    snapshot.weeklyMetrics.calories_consumed,
    snapshot.weeklyMetrics.calorie_goal
  );

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="hero-topline">
            <p className="eyebrow">Nutrition OS</p>
            <StatusPill tone={syncTone} label={syncLabel} />
          </div>
          <h1>Phone-first nutrition tracking with a clean dashboard and a real API boundary.</h1>
          <p className="lede">
            The interface is organized for dashboard, meals, and recipes now, with a mobile-first
            layout that can carry forward into Capacitor packaging later.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={() => setSection('dashboard')}>
              Dashboard
            </button>
            <button type="button" className="secondary-action" onClick={() => setSection('recipes')}>
              Recipes
            </button>
          </div>
        </div>

        <div className="hero-panel">
          <div className="ring" aria-hidden="true">
            <span>{calorieProgress}%</span>
          </div>
          <p className="hero-panel-label">weekly calories used</p>
          <strong>{snapshot.weeklyMetrics.calories_consumed.toLocaleString()} kcal</strong>
          <span>{snapshot.weeklyMetrics.calorie_goal.toLocaleString()} kcal goal</span>
        </div>
      </header>

      <section className="sync-banner" aria-live="polite">
        <strong>{syncLabel}</strong>
        <span>{syncDetail}</span>
      </section>

      <SectionNav value={section} onChange={setSection} />

      <main className="content">
        {section === 'dashboard' && (
          <>
            <Surface title="Weekly metrics" eyebrow="Dashboard">
              <div className="metric-grid">
                <MetricCard
                  label="Calorie goal"
                  value={`${snapshot.weeklyMetrics.calorie_goal.toLocaleString()} kcal`}
                  detail={`${snapshot.weeklyMetrics.adherence_score}% adherence`}
                />
                <MetricCard
                  label="Consumed"
                  value={`${snapshot.weeklyMetrics.calories_consumed.toLocaleString()} kcal`}
                  detail={`${snapshot.weeklyMetrics.calorie_goal - snapshot.weeklyMetrics.calories_consumed} kcal remaining`}
                />
                <MetricCard
                  label="Weight trend"
                  value={`${snapshot.weeklyMetrics.weekly_weight_change} lb`}
                  detail="week over week"
                />
              </div>
            </Surface>

            <Surface title="Macro targets" eyebrow="Weekly balance">
              <div className="progress-stack">
                <ProgressTrack
                  label="Protein"
                  consumed={snapshot.weeklyMetrics.macro_consumed.protein}
                  target={snapshot.weeklyMetrics.macro_targets.protein}
                  accent="#0f766e"
                />
                <ProgressTrack
                  label="Carbs"
                  consumed={snapshot.weeklyMetrics.macro_consumed.carbs}
                  target={snapshot.weeklyMetrics.macro_targets.carbs}
                  accent="#f97316"
                />
                <ProgressTrack
                  label="Fat"
                  consumed={snapshot.weeklyMetrics.macro_consumed.fat}
                  target={snapshot.weeklyMetrics.macro_targets.fat}
                  accent="#2563eb"
                />
              </div>
            </Surface>

            <Surface title="Today" eyebrow="Quick log">
              <ul className="stack-list">
                {demoFoodStrip.items.map((item) => (
                  <li key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.serving}</span>
                    </div>
                    <span>{item.calories} kcal</span>
                  </li>
                ))}
              </ul>
            </Surface>
          </>
        )}

        {section === 'meals' && (
          <>
            <Surface title="Meal builder" eyebrow="Meals">
              <div className="header-row">
                <div>
                  <strong>{demoMeal.name}</strong>
                  <span>{demoMeal.serving_count} servings</span>
                </div>
                <StatusPill tone="checking" label="Draft meal" />
              </div>

              <ul className="stack-list">
                {demoMeal.ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <div>
                      <strong>{ingredient.name}</strong>
                      <span>{ingredient.grams} g</span>
                    </div>
                    <span>{Math.round((ingredient.calories_per_100g * ingredient.grams) / 100)} kcal</span>
                  </li>
                ))}
              </ul>
            </Surface>

            <Surface title="Meal totals" eyebrow="Per serving">
              <div className="totals-card">
                <strong>{mealTotalsState.per_serving_calories} kcal</strong>
                <span>
                  {mealTotalsState.per_serving_macros.protein}P / {mealTotalsState.per_serving_macros.carbs}C /{' '}
                  {mealTotalsState.per_serving_macros.fat}F
                </span>
              </div>
            </Surface>

            <Surface title="Meal template sync" eyebrow="Persisted endpoint">
              <p className="muted-block">
                The typed client can post meal templates to the backend once the persistence route is
                wired. For now this screen is prepared for that interaction without mixing the
                calculation logic into the UI.
              </p>
            </Surface>
          </>
        )}

        {section === 'recipes' && (
          <>
            <Surface title="Recipe center" eyebrow="Recipes">
              <div className="header-row">
                <div>
                  <strong>{demoRecipe.title}</strong>
                  <span>Direct entry, document import, and photo capture.</span>
                </div>
                <StatusPill tone="demo" label={demoRecipe.favorite ? 'Favorite' : 'Recipe'} />
              </div>

              <div className="scale-picker" role="group" aria-label="Recipe scale">
                {recipeScales.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={recipeScale === choice ? 'scale-chip is-active' : 'scale-chip'}
                    onClick={() => setRecipeScale(choice)}
                  >
                    {recipeScaleLabel(choice)}
                  </button>
                ))}
              </div>

              <ul className="step-list">
                {demoRecipe.steps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ul>
            </Surface>

            <Surface title="Scaling preview" eyebrow="Updated totals">
              <div className="preview-grid">
                <div>
                  <strong>{mealPreview.serving_count} servings</strong>
                  <span>Scaled yield</span>
                </div>
                <div>
                  <strong>{recipeTotals.per_serving_calories} kcal</strong>
                  <span>Per serving</span>
                </div>
                <div>
                  <strong>
                    {recipeTotals.per_serving_macros.protein}P / {recipeTotals.per_serving_macros.carbs}C /{' '}
                    {recipeTotals.per_serving_macros.fat}F
                  </strong>
                  <span>Macros</span>
                </div>
              </div>
            </Surface>

            <Surface title="Import sources" eyebrow="Inputs">
              <ul className="asset-strip">
                {demoRecipeImports.sources.map((item) => (
                  <li key={item.kind}>
                    <strong>{item.kind}</strong>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </Surface>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
