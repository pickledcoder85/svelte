import { useEffect, useMemo, useState } from 'react';
import { calculateMeal, fetchBackendHealth, fetchWeeklyMetrics } from './lib/api';
import { mealTotals, progressPercent, scaleMealIngredients } from './lib/nutrition';
import { demoDashboardSnapshot, demoFoodStrip, demoMeal, demoRecipe } from './mock-data';
import { Panel } from './components/Panel';
import { ProgressBar } from './components/ProgressBar';
import { SegmentedNav } from './components/SegmentedNav';
import { StatCard } from './components/StatCard';
import type { AppSection, DashboardSnapshot, MealTotals } from './types';

const recipeScaleChoices = [1.25, 1.5, 2] as const;

function App() {
  const [section, setSection] = useState<AppSection>('dashboard');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(demoDashboardSnapshot);
  const [syncLabel, setSyncLabel] = useState('Demo data');
  const [syncDetail, setSyncDetail] = useState('Waiting for backend sync.');
  const [syncStatus, setSyncStatus] = useState<'checking' | 'live' | 'demo'>('checking');
  const [recipeScale, setRecipeScale] = useState<(typeof recipeScaleChoices)[number]>(1.5);
  const [liveMealTotals, setLiveMealTotals] = useState<MealTotals>(demoDashboardSnapshot.mealTotals);

  useEffect(() => {
    const controller = new AbortController();

    async function syncBackend() {
      try {
        const [health, metrics, calculatedMeal] = await Promise.all([
          fetchBackendHealth(),
          fetchWeeklyMetrics(),
          calculateMeal(demoMeal)
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setSnapshot({
          connectionLabel: 'Live backend',
          connectionDetail: `${health.service} connected at ${new Date(health.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}`,
          weeklyMetrics: metrics,
          mealTotals: calculatedMeal
        });
        setSyncLabel('Live backend');
        setSyncDetail('Dashboard, meals, and calculations are synced from the Python API.');
        setSyncStatus('live');
        setLiveMealTotals(calculatedMeal);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSnapshot(demoDashboardSnapshot);
        setSyncLabel('Demo data');
        setSyncDetail(
          error instanceof Error ? error.message : 'Backend unavailable. Showing seeded frontend data.'
        );
        setSyncStatus('demo');
        setLiveMealTotals(demoDashboardSnapshot.mealTotals);
      }
    }

    void syncBackend();

    return () => controller.abort();
  }, []);

  const scaledMeal = useMemo(() => scaleMealIngredients(demoMeal, recipeScale), [recipeScale]);
  const scaledRecipeTotals = useMemo(() => mealTotals(scaledMeal), [scaledMeal]);

  const progress = progressPercent(
    snapshot.weeklyMetrics.calories_consumed,
    snapshot.weeklyMetrics.calorie_goal
  );
  const mealSummary = liveMealTotals ?? mealTotals(demoMeal);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <p className="eyebrow">Nutrition OS</p>
            <span className={`status-pill status-${syncStatus}`}>{syncLabel}</span>
          </div>
          <h1>Mobile-first nutrition tracking with a backend that can grow with you.</h1>
          <p className="lede">
            The app is organized for phone-first navigation now and future Capacitor packaging later,
            without pushing complex AI or database logic into the UI layer.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={() => setSection('dashboard')}>
              View dashboard
            </button>
            <button type="button" className="secondary-action" onClick={() => setSection('recipes')}>
              Open recipes
            </button>
          </div>
        </div>

        <div className="hero-panel">
          <div className="progress-ring" aria-hidden="true">
            <span>{progress}%</span>
          </div>
          <p className="hero-panel-label">weekly calories used</p>
          <strong>{snapshot.weeklyMetrics.calories_consumed.toLocaleString()} kcal</strong>
          <span>{snapshot.weeklyMetrics.calorie_goal.toLocaleString()} kcal target</span>
        </div>
      </header>

      <section className="sync-banner" aria-live="polite">
        <strong>{syncLabel}</strong>
        <span>{syncDetail}</span>
      </section>

      <SegmentedNav value={section} onChange={setSection} />

      <main className="content">
        {section === 'dashboard' ? (
          <>
            <Panel title="Weekly metrics" eyebrow="Dashboard">
              <div className="stats-grid">
                <StatCard
                  label="Calorie goal"
                  value={`${snapshot.weeklyMetrics.calorie_goal.toLocaleString()} kcal`}
                  detail={`${snapshot.weeklyMetrics.adherence_score}% adherence`}
                />
                <StatCard
                  label="Consumed"
                  value={`${snapshot.weeklyMetrics.calories_consumed.toLocaleString()} kcal`}
                  detail={`${snapshot.weeklyMetrics.calorie_goal - snapshot.weeklyMetrics.calories_consumed} kcal remaining`}
                />
                <StatCard
                  label="Weight trend"
                  value={`${snapshot.weeklyMetrics.weekly_weight_change} lb`}
                  detail="week over week"
                />
              </div>
            </Panel>

            <Panel title="Macro targets" eyebrow="Weekly balance">
              <div className="macro-stack">
                <ProgressBar
                  label="Protein"
                  value={snapshot.weeklyMetrics.macro_consumed.protein}
                  target={snapshot.weeklyMetrics.macro_targets.protein}
                  accent="#0f766e"
                />
                <ProgressBar
                  label="Carbs"
                  value={snapshot.weeklyMetrics.macro_consumed.carbs}
                  target={snapshot.weeklyMetrics.macro_targets.carbs}
                  accent="#f97316"
                />
                <ProgressBar
                  label="Fat"
                  value={snapshot.weeklyMetrics.macro_consumed.fat}
                  target={snapshot.weeklyMetrics.macro_targets.fat}
                  accent="#2563eb"
                />
              </div>
            </Panel>

            <Panel title="Quick log" eyebrow="Today">
              <ul className="food-strip">
                {demoFoodStrip.map((item) => (
                  <li key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.serving}</span>
                    </div>
                    <span>{item.calories} kcal</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        ) : null}

        {section === 'meals' ? (
          <>
            <Panel title="Meal builder" eyebrow="Meals">
              <div className="meal-header">
                <div>
                  <strong>{demoMeal.name}</strong>
                  <span>{demoMeal.serving_count} servings</span>
                </div>
                <span className="inline-chip">Custom meal</span>
              </div>

              <ul className="ingredient-list">
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
            </Panel>

            <Panel title="Calculated totals" eyebrow="Per serving">
              <div className="totals-card">
                <strong>{mealSummary.per_serving_calories} kcal</strong>
                <span>
                  {mealSummary.per_serving_macros.protein}P / {mealSummary.per_serving_macros.carbs}C /{' '}
                  {mealSummary.per_serving_macros.fat}F
                </span>
              </div>
            </Panel>
          </>
        ) : null}

        {section === 'recipes' ? (
          <>
            <Panel title="Recipe center" eyebrow="Recipes">
              <div className="recipe-head">
                <div>
                  <strong>{demoRecipe.title}</strong>
                  <span>Saved favorite with text, PDF, and image support.</span>
                </div>
                <span className="inline-chip">{demoRecipe.default_yield} servings</span>
              </div>

              <div className="scale-toggle" role="group" aria-label="Recipe scale">
                {recipeScaleChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={recipeScale === choice ? 'scale-choice is-active' : 'scale-choice'}
                    onClick={() => setRecipeScale(choice)}
                  >
                    {choice.toFixed(2)}x
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

              <div className="asset-strip" aria-label="Recipe asset types">
                {demoRecipe.assets.map((asset) => (
                  <span key={`${asset.kind}-${asset.label}`} className="asset-chip">
                    {asset.kind}: {asset.label}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel title="Scaling preview" eyebrow="1.25x, 1.5x, 2.0x">
              <div className="recipe-preview">
                <div>
                  <strong>{Number((demoRecipe.default_yield * recipeScale).toFixed(2))} servings</strong>
                  <span>Scaled yield</span>
                </div>
                <div>
                  <strong>
                    {scaledRecipeTotals.per_serving_macros.protein}P / {scaledRecipeTotals.per_serving_macros.carbs}C /{' '}
                    {scaledRecipeTotals.per_serving_macros.fat}F
                  </strong>
                  <span>Ingredient macro preview</span>
                </div>
              </div>

              <ul className="preview-ingredients">
                {scaledMeal.ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <span>{ingredient.name}</span>
                    <strong>{ingredient.grams} g</strong>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default App;
