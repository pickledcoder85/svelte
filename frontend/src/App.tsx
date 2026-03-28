import { useEffect, useState } from 'react';
import { calculateMeal, fetchWeeklyMetrics } from './api';
import { demoMeal } from './mock-data';
import type { MealTotals, WeeklyMetrics } from './types';

function App() {
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [mealTotals, setMealTotals] = useState<MealTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchWeeklyMetrics(), calculateMeal(demoMeal)])
      .then(([weeklyMetrics, calculatedMeal]) => {
        setMetrics(weeklyMetrics);
        setMealTotals(calculatedMeal);
      })
      .catch((requestError: Error) => {
        setError(requestError.message);
      });
  }, []);

  const calorieProgress =
    metrics === null ? 0 : Math.round((metrics.calories_consumed / metrics.calorie_goal) * 100);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Nutrition OS</p>
          <h1>Mobile-first nutrition tracking with a clean dashboard and Python backend.</h1>
          <p className="lede">
            The app is structured for responsive web delivery now and Capacitor-based iPhone
            packaging later, without taking on extra architecture early.
          </p>
        </div>
        <div className="hero-panel">
          <span className="progress-label">{calorieProgress}%</span>
          <p>weekly calories used</p>
        </div>
      </header>

      {error ? <section className="error-banner">Backend unavailable: {error}</section> : null}

      <main className="grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p>Weekly metrics</p>
              <h2>Goal tracking</h2>
            </div>
          </div>

          {metrics ? (
            <div className="stats">
              <article className="stat-card">
                <span>Calorie goal</span>
                <strong>{metrics.calorie_goal.toLocaleString()} kcal</strong>
              </article>
              <article className="stat-card">
                <span>Consumed</span>
                <strong>{metrics.calories_consumed.toLocaleString()} kcal</strong>
              </article>
              <article className="stat-card">
                <span>Weight trend</span>
                <strong>{metrics.weekly_weight_change} lb</strong>
              </article>
            </div>
          ) : (
            <p className="muted">Loading weekly metrics...</p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>Meal builder</p>
              <h2>{demoMeal.name}</h2>
            </div>
            <span className="chip">{demoMeal.serving_count} servings</span>
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

          {mealTotals ? (
            <div className="totals">
              <div>
                <span>Per serving</span>
                <strong>{mealTotals.per_serving_calories} kcal</strong>
              </div>
              <div>
                <span>Macros</span>
                <strong>
                  {mealTotals.per_serving_macros.protein}P / {mealTotals.per_serving_macros.carbs}C /{' '}
                  {mealTotals.per_serving_macros.fat}F
                </strong>
              </div>
            </div>
          ) : (
            <p className="muted">Calculating meal totals...</p>
          )}
        </section>

        <section className="panel panel-wide">
          <div className="section-heading">
            <div>
              <p>Architecture</p>
              <h2>Implementation direction</h2>
            </div>
          </div>
          <div className="architecture-grid">
            <article>
              <strong>Frontend</strong>
              <p>TypeScript app with responsive screens, hot reload, and future Capacitor packaging.</p>
            </article>
            <article>
              <strong>Backend</strong>
              <p>FastAPI routes for auth, USDA data, meals, recipes, and multimodal ingestion.</p>
            </article>
            <article>
              <strong>AI features</strong>
              <p>Python-native OCR and multimodal services without a separate orchestration layer.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
