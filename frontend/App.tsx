import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import {
  addFoodLogEntry,
  calculateMeal,
  fetchBackendHealth,
  fetchFavoriteRecipes,
  fetchRecipes,
  fetchRecipe,
  fetchTodaysFoodLog,
  fetchWeeklyMetrics,
  favoriteRecipe,
  importRecipe,
  unfavoriteRecipe,
  searchFoods
} from './src/lib/api';
import { buildTrendChartGeometry, remainingCalories, selectRangeSeries } from './src/lib/dashboard';
import { foodMacroLine, selectFoodById } from './src/lib/foods';
import { mealTotals, progressPercent, recipeScaleLabel, round1, scaleMealIngredients } from './src/lib/nutrition';
import {
  demoDashboardSnapshot,
  demoFoodResults,
  demoFoodStrip,
  demoMeal,
  demoFoodLog,
  demoRangeSeries,
  demoRecipeFavorites,
  demoRecipeCatalog,
  demoRecipeImports
} from './src/mock-data';
import type {
  AppSection,
  DashboardRange,
  DashboardSnapshot,
  FoodItem,
  FoodLogSummary,
  RecipeDefinition
} from './src/types';

const recipeScales = [0.5, 1, 1.25, 1.5, 2] as const;
const sectionOrder: AppSection[] = ['dashboard', 'log', 'foods', 'meals', 'recipes'];
const rangeTabs: DashboardRange[] = ['1D', '1W', '1M', '3M'];
const chartHeight = 160;
const mascotImage = require('./assets/mascot.png');

function toneColor(tone: 'checking' | 'live' | 'demo'): string {
  if (tone === 'live') {
    return '#0f766e';
  }
  if (tone === 'demo') {
    return '#b45309';
  }
  return '#1d4ed8';
}

export default function App(): ReactElement {
  const [section, setSection] = useState<AppSection>('dashboard');
  const [activeRange, setActiveRange] = useState<DashboardRange>('1D');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    ...demoDashboardSnapshot,
    rangeSeries: demoRangeSeries
  });
  const [syncTone, setSyncTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [syncLabel, setSyncLabel] = useState('Checking backend');
  const [syncDetail, setSyncDetail] = useState('Starting with seeded data.');
  const [recipeScale, setRecipeScale] = useState<(typeof recipeScales)[number]>(1);
  const [showScaleOptions, setShowScaleOptions] = useState(false);
  const [foodDraft, setFoodDraft] = useState('yogurt');
  const [foodSearchTerm, setFoodSearchTerm] = useState('yogurt');
  const [foodResults, setFoodResults] = useState<FoodItem[]>(demoFoodResults);
  const [selectedFoodId, setSelectedFoodId] = useState(demoFoodResults[0].id);
  const [foodTone, setFoodTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [foodStatus, setFoodStatus] = useState('Ready to search');
  const [foodError, setFoodError] = useState<string | null>(null);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [logFoodDraft, setLogFoodDraft] = useState('yogurt');
  const [logFoodSearchTerm, setLogFoodSearchTerm] = useState('yogurt');
  const [logFoodResults, setLogFoodResults] = useState<FoodItem[]>(demoFoodResults);
  const [selectedLogFoodId, setSelectedLogFoodId] = useState(demoFoodResults[0].id);
  const [logGrams, setLogGrams] = useState('100');
  const [foodLog, setFoodLog] = useState<FoodLogSummary>(() => createEmptyFoodLog());
  const [foodLogTone, setFoodLogTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [foodLogStatus, setFoodLogStatus] = useState("Loading today's log");
  const [foodLogError, setFoodLogError] = useState<string | null>(null);
  const [foodLogLoading, setFoodLogLoading] = useState(true);
  const [isSavingLogEntry, setIsSavingLogEntry] = useState(false);
  const [logSearchTone, setLogSearchTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [logSearchStatus, setLogSearchStatus] = useState('Ready to search');
  const [logSearchError, setLogSearchError] = useState<string | null>(null);
  const [recipeFavorites, setRecipeFavorites] = useState<RecipeDefinition[]>([]);
  const [recipeCatalog, setRecipeCatalog] = useState<RecipeDefinition[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDefinition | null>(null);
  const [recipeTone, setRecipeTone] = useState<'checking' | 'live' | 'demo'>('checking');
  const [recipeStatus, setRecipeStatus] = useState('Loading recipe favorites');
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(true);
  const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);
  const [recipeSavingId, setRecipeSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function syncBackend() {
      try {
        const [health, metrics, totals, recipeImport] = await Promise.all([
          fetchBackendHealth(),
          fetchWeeklyMetrics(),
          calculateMeal(demoMeal),
          importRecipe(demoRecipeImports)
        ]);

        if (cancelled) {
          return;
        }

        setSnapshot({
          ...demoDashboardSnapshot,
          connectionLabel: health.service,
          connectionDetail: `Connected at ${new Date(health.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}`,
          weeklyMetrics: metrics,
          mealTotals: totals,
          rangeSeries: demoRangeSeries.map((series) =>
            series.range === '1W'
              ? {
                  ...series,
                  targetCalories: metrics.calorie_goal,
                  caloriesConsumed: metrics.calories_consumed,
                  macroTargets: metrics.macro_targets,
                  macroConsumed: metrics.macro_consumed
                }
              : series
          ),
          recipeImport
        });
        setSyncTone('live');
        setSyncLabel('Live backend');
        setSyncDetail('Expo is reading live metrics and recipes from the Python API.');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSnapshot({
          ...demoDashboardSnapshot,
          rangeSeries: demoRangeSeries
        });
        setSyncTone('demo');
        setSyncLabel('Demo data');
        setSyncDetail(
          error instanceof Error ? error.message : 'Backend unavailable. Showing demo frontend data.'
        );
      }
    }

    void syncBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFoodLog() {
      setFoodLogLoading(true);
      setFoodLogTone('checking');
      setFoodLogStatus("Loading today's log");
      setFoodLogError(null);

      try {
        const log = await fetchTodaysFoodLog();

        if (cancelled) {
          return;
        }

        setFoodLog(log);
        setFoodLogTone('live');
        setFoodLogStatus(
          log.entries.length === 0
            ? 'No foods logged yet'
            : `${log.entries.length} persisted entr${log.entries.length === 1 ? 'y' : 'ies'} loaded`
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFoodLog(demoFoodLog);
        setFoodLogTone('demo');
        setFoodLogStatus('Showing demo daily log');
        setFoodLogError(error instanceof Error ? error.message : 'Daily log unavailable.');
      } finally {
        if (!cancelled) {
          setFoodLogLoading(false);
        }
      }
    }

    void loadFoodLog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncFoodSearch() {
      const query = foodSearchTerm.trim();
      if (!query) {
        setFoodStatus('Enter a search term');
        setFoodTone('checking');
        setFoodError(null);
        setFoodResults(demoFoodResults);
        return;
      }

      setFoodTone('checking');
      setFoodStatus(`Searching for "${query}"`);
      setFoodError(null);

      try {
        const results = await searchFoods(query);

        if (cancelled) {
          return;
        }

        setFoodResults(results);
        setSelectedFoodId((current) => selectFoodById(results, current)?.id ?? results[0]?.id ?? '');
        setFoodTone('live');
        setFoodStatus(`${results.length} result${results.length === 1 ? '' : 's'} from the backend`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFoodResults(demoFoodResults);
        setSelectedFoodId(demoFoodResults[0].id);
        setFoodTone('demo');
        setFoodStatus('Showing demo food search results');
        setFoodError(error instanceof Error ? error.message : 'Food search unavailable.');
      }
    }

    void syncFoodSearch();

    return () => {
      cancelled = true;
    };
  }, [foodSearchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function syncLogFoodSearch() {
      const query = logFoodSearchTerm.trim();
      if (!query) {
        setLogFoodResults(demoFoodResults);
        setSelectedLogFoodId(demoFoodResults[0].id);
        setLogSearchTone('checking');
        setLogSearchStatus('Enter a food search to add something to today');
        setLogSearchError(null);
        return;
      }

      setLogSearchTone('checking');
      setLogSearchStatus(`Searching for "${query}"`);
      setLogSearchError(null);

      try {
        const results = await searchFoods(query);

        if (cancelled) {
          return;
        }

        setLogFoodResults(results);
        setSelectedLogFoodId((current) => selectFoodById(results, current)?.id ?? results[0]?.id ?? '');
        setLogSearchTone('live');
        setLogSearchStatus(`${results.length} result${results.length === 1 ? '' : 's'} available for logging`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLogFoodResults(demoFoodResults);
        setSelectedLogFoodId(demoFoodResults[0].id);
        setLogSearchTone('demo');
        setLogSearchStatus('Showing demo foods for the log');
        setLogSearchError(error instanceof Error ? error.message : 'Food search unavailable.');
      }
    }

    void syncLogFoodSearch();

    return () => {
      cancelled = true;
    };
  }, [logFoodSearchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeFavorites() {
      setRecipeLoading(true);
      setRecipeTone('checking');
      setRecipeStatus('Loading recipe favorites');
      setRecipeError(null);

      try {
        const [catalog, favorites] = await Promise.all([fetchRecipes(), fetchFavoriteRecipes()]);

        if (cancelled) {
          return;
        }

        const favoriteIds = new Set(favorites.map((recipe) => recipe.id));
        const mergedCatalog = catalog.map((recipe) => ({
          ...recipe,
          favorite: favoriteIds.has(recipe.id)
        }));
        const appendedFavorites = favorites
          .filter((recipe) => !mergedCatalog.some((current) => current.id === recipe.id))
          .map((recipe) => ({ ...recipe, favorite: true }));
        const nextCatalog = [...mergedCatalog, ...appendedFavorites];

        setRecipeCatalog(nextCatalog);
        setRecipeFavorites(favorites);
        setRecipeTone('live');
        setRecipeStatus(
          favorites.length === 0
            ? 'No saved recipe favorites yet'
            : `${favorites.length} saved favorite${favorites.length === 1 ? '' : 's'} loaded`
        );

        setSelectedRecipeId((current) => {
          if (current && nextCatalog.some((recipe) => recipe.id === current)) {
            return current;
          }
          return favorites[0]?.id ?? nextCatalog[0]?.id ?? null;
        });

        setSelectedRecipe((current) => {
          if (current && nextCatalog.some((recipe) => recipe.id === current.id)) {
            return current;
          }
          return favorites[0] ?? nextCatalog[0] ?? null;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecipeCatalog(demoRecipeCatalog);
        setRecipeFavorites(demoRecipeFavorites);
        setSelectedRecipeId(demoRecipeFavorites[0]?.id ?? demoRecipeCatalog[0]?.id ?? null);
        setSelectedRecipe(demoRecipeFavorites[0] ?? demoRecipeCatalog[0] ?? null);
        setRecipeTone('demo');
        setRecipeStatus('Showing demo recipe favorites');
        setRecipeError(error instanceof Error ? error.message : 'Recipe favorites unavailable.');
      } finally {
        if (!cancelled) {
          setRecipeLoading(false);
        }
      }
    }

    void loadRecipeFavorites();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedRecipe() {
      if (!selectedRecipeId) {
        setSelectedRecipe(null);
        setRecipeDetailLoading(false);
        return;
      }

      setRecipeDetailLoading(true);

      try {
        const recipe = await fetchRecipe(selectedRecipeId);

        if (cancelled) {
          return;
        }

        setSelectedRecipe(recipe);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallback = recipeFavorites.find((item) => item.id === selectedRecipeId) ?? null;
        setSelectedRecipe(fallback);
        if (fallback === null) {
          setRecipeTone('demo');
          setRecipeStatus('Showing demo recipe detail');
          setRecipeError(error instanceof Error ? error.message : 'Recipe detail unavailable.');
        }
      } finally {
        if (!cancelled) {
          setRecipeDetailLoading(false);
        }
      }
    }

    void loadSelectedRecipe();

    return () => {
      cancelled = true;
    };
  }, [recipeFavorites, selectedRecipeId]);

  const selectedSeries = useMemo(
    () => selectRangeSeries(snapshot.rangeSeries, activeRange),
    [activeRange, snapshot.rangeSeries]
  );
  const selectedFood = useMemo(
    () => selectFoodById(foodResults, selectedFoodId),
    [foodResults, selectedFoodId]
  );
  const selectedLogFood = useMemo(
    () => selectFoodById(logFoodResults, selectedLogFoodId),
    [logFoodResults, selectedLogFoodId]
  );
  const mealPreview = useMemo(() => scaleMealIngredients(demoMeal, recipeScale), [recipeScale]);
  const recipeTotals = useMemo(() => mealTotals(mealPreview), [mealPreview]);
  const logEntryPreview = useMemo(() => {
    if (!selectedLogFood || selectedLogFood.serving_size <= 0) {
      return null;
    }

    const grams = Number(logGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      return null;
    }

    const multiplier = grams / selectedLogFood.serving_size;
    return {
      calories: round1(selectedLogFood.calories * multiplier),
      macros: {
        protein: round1(selectedLogFood.macros.protein * multiplier),
        carbs: round1(selectedLogFood.macros.carbs * multiplier),
        fat: round1(selectedLogFood.macros.fat * multiplier)
      }
    };
  }, [logGrams, selectedLogFood]);
  const calorieProgress = progressPercent(
    selectedSeries.caloriesConsumed,
    selectedSeries.targetCalories
  );
  const rangeRemaining = remainingCalories(
    selectedSeries.targetCalories,
    selectedSeries.caloriesConsumed
  );

  function submitFoodSearch() {
    setIsSubmittingSearch(true);
    setFoodSearchTerm(foodDraft);
    setTimeout(() => setIsSubmittingSearch(false), 250);
  }

  async function submitFoodLogEntry() {
    const grams = Number(logGrams);
    if (!selectedLogFood || !Number.isFinite(grams) || grams <= 0) {
      setFoodLogTone('demo');
      setFoodLogStatus('Enter a valid gram amount before adding.');
      setFoodLogError('Enter a valid gram amount before adding.');
      return;
    }

    setIsSavingLogEntry(true);
    setFoodLogTone('checking');
    setFoodLogStatus(`Adding ${selectedLogFood.name} to today`);
    setFoodLogError(null);

    try {
      const updatedLog = await addFoodLogEntry({
        food_id: selectedLogFood.id,
        grams: round1(grams)
      });
      setFoodLog(updatedLog);
      setFoodLogTone('live');
      setFoodLogStatus(`Added ${selectedLogFood.name} to today's log`);
      setLogGrams('100');
    } catch (error) {
      setFoodLogTone('demo');
      setFoodLogStatus(`Could not save ${selectedLogFood.name}`);
      setFoodLogError(error instanceof Error ? error.message : 'Unable to add food log entry.');
    } finally {
      setIsSavingLogEntry(false);
    }
  }

  function updateRecipeCollection(recipes: RecipeDefinition[], updatedRecipe: RecipeDefinition): RecipeDefinition[] {
    const remaining = recipes.filter((recipe) => recipe.id !== updatedRecipe.id);
    return updatedRecipe.favorite ? [updatedRecipe, ...remaining] : remaining;
  }

  async function toggleRecipeFavorite(recipe: RecipeDefinition, nextFavorite: boolean) {
    if (recipeSavingId === recipe.id) {
      return;
    }

    setRecipeSavingId(recipe.id);
    setRecipeTone('checking');
    setRecipeStatus(
      nextFavorite ? `Saving ${recipe.title} to favorites` : `Removing ${recipe.title} from favorites`
    );
    setRecipeError(null);

    const previousCatalog = recipeCatalog;
    const previousFavorites = recipeFavorites;
    const previousSelected = selectedRecipe;
    const previousSelectedId = selectedRecipeId;

    const optimisticRecipe = { ...recipe, favorite: nextFavorite };
    setRecipeCatalog((current) => updateRecipeCollection(current, optimisticRecipe));
    setRecipeFavorites((current) => updateRecipeCollection(current, optimisticRecipe));
    if (previousSelectedId === recipe.id) {
      setSelectedRecipe(optimisticRecipe);
    } else if (previousSelected?.id === recipe.id) {
      setSelectedRecipe(optimisticRecipe);
    }

    try {
      const updated = nextFavorite
        ? await favoriteRecipe(recipe.id)
        : await unfavoriteRecipe(recipe.id);

      setRecipeCatalog((current) => updateRecipeCollection(current, updated));
      setRecipeFavorites((current) => updateRecipeCollection(current, updated));
      setSelectedRecipe(updated);
      setSelectedRecipeId(updated.id);
      setRecipeTone('live');
      setRecipeStatus(
        nextFavorite ? `${updated.title} saved to favorites` : `${updated.title} removed from favorites`
      );
    } catch (error) {
      setRecipeCatalog(previousCatalog);
      setRecipeFavorites(previousFavorites);
      setSelectedRecipe(previousSelected);
      setSelectedRecipeId(previousSelectedId);
      setRecipeTone('demo');
      setRecipeStatus(`Could not update ${recipe.title}`);
      setRecipeError(error instanceof Error ? error.message : 'Unable to update recipe favorite.');
    } finally {
      setRecipeSavingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Nutrition OS</Text>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.headline}>Expo-powered nutrition tracking for browser and iPhone.</Text>
              <Text style={styles.lede}>
                The frontend now runs as an Expo app with web support, so you can preview in a browser and in Expo Go while the FastAPI backend stays unchanged.
              </Text>
            </View>

            <View style={styles.heroAside}>
              <View style={styles.ringCard}>
                <Text style={styles.ringValue}>{calorieProgress}%</Text>
                <Text style={styles.ringLabel}>{selectedSeries.label}</Text>
                <Text style={styles.ringCaption}>
                  {selectedSeries.caloriesConsumed.toLocaleString()} / {selectedSeries.targetCalories.toLocaleString()} kcal
                </Text>
              </View>

              <View style={styles.mascotCard}>
                <Image source={mascotImage} style={styles.mascotImage} resizeMode="contain" />
                <Text style={styles.mascotLabel}>Pickle keeps the cut on track.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.statusBanner, { borderColor: toneColor(syncTone) }]}>
          <Text style={styles.statusLabel}>{syncLabel}</Text>
          <Text style={styles.statusDetail}>{syncDetail}</Text>
        </View>

        <View style={styles.sectionTabs}>
          {sectionOrder.map((item) => {
            const active = item === section;
            return (
              <Pressable
                key={item}
                style={[styles.sectionTab, active && styles.sectionTabActive]}
                onPress={() => setSection(item)}
              >
                <Text style={[styles.sectionTabLabel, active && styles.sectionTabLabelActive]}>
                  {item.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {section === 'dashboard' && (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Dashboard</Text>
                  <Text style={styles.panelTitle}>Calorie target vs consumed</Text>
                </View>
                <Text style={styles.panelDetail}>{selectedSeries.detail}</Text>
              </View>

              <View style={styles.rangeTabs}>
                {rangeTabs.map((range) => {
                  const active = range === activeRange;
                  return (
                    <Pressable
                      key={range}
                      style={[styles.rangeTab, active && styles.rangeTabActive]}
                      onPress={() => setActiveRange(range)}
                    >
                      <Text style={[styles.rangeTabLabel, active && styles.rangeTabLabelActive]}>
                        {range}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.metricRow}>
                <MetricTile label="Target" value={`${selectedSeries.targetCalories.toLocaleString()} kcal`} />
                <MetricTile label="Consumed" value={`${selectedSeries.caloriesConsumed.toLocaleString()} kcal`} />
                <MetricTile label="Remaining" value={`${rangeRemaining.toLocaleString()} kcal`} />
              </View>

              <View style={styles.quickLogCard}>
                <View style={styles.quickLogHeader}>
                  <View>
                    <Text style={styles.panelEyebrow}>Quick log</Text>
                    <Text style={styles.quickLogTitle}>Today’s seeded foods</Text>
                  </View>
                  <Text style={styles.quickLogHint}>Visible in the dashboard flow</Text>
                </View>
                {demoFoodStrip.items.map((item) => (
                  <View key={item.name} style={styles.listRow}>
                    <View>
                      <Text style={styles.listTitle}>{item.name}</Text>
                      <Text style={styles.listCaption}>{item.serving}</Text>
                    </View>
                    <Text style={styles.listMetric}>{item.calories} kcal</Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Trend line</Text>
                <LineTrendChart
                  points={selectedSeries.points}
                  targetCalories={selectedSeries.targetCalories}
                />
              </View>

              <View style={styles.macroStack}>
                <MacroProgress
                  label="Protein"
                  consumed={selectedSeries.macroConsumed.protein}
                  target={selectedSeries.macroTargets.protein}
                  color="#0f766e"
                />
                <MacroProgress
                  label="Carbs"
                  consumed={selectedSeries.macroConsumed.carbs}
                  target={selectedSeries.macroTargets.carbs}
                  color="#ea580c"
                />
                <MacroProgress
                  label="Fat"
                  consumed={selectedSeries.macroConsumed.fat}
                  target={selectedSeries.macroTargets.fat}
                  color="#2563eb"
                />
              </View>
            </View>

          </>
        )}

        {section === 'log' && (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>Daily log</Text>
                  <Text style={styles.panelTitle}>Persisted foods for today</Text>
                </View>
                <Text style={styles.panelDetail}>Search a food, add grams, and keep the log synced.</Text>
              </View>

              <View style={[styles.inlineStatus, { borderColor: toneColor(foodLogTone) }]}>
                <Text style={styles.inlineStatusLabel}>{foodLogStatus}</Text>
                {foodLogError ? <Text style={styles.inlineStatusDetail}>{foodLogError}</Text> : null}
              </View>

              <View style={styles.metricRow}>
                <MetricTile label="Calories" value={`${foodLog.totals.calories.toLocaleString()} kcal`} />
                <MetricTile
                  label="Macros"
                  value={`${round1(foodLog.totals.macros.protein)}P / ${round1(foodLog.totals.macros.carbs)}C / ${round1(foodLog.totals.macros.fat)}F`}
                />
                <MetricTile label="Entries" value={`${foodLog.entries.length}`} />
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Add food</Text>
              <Text style={styles.panelTitle}>Search and log an item</Text>
              <Text style={styles.panelDetail}>
                Type a food, choose a result, enter grams, and save it to today’s log.
              </Text>

              <View style={styles.searchRow}>
                <TextInput
                  value={logFoodDraft}
                  onChangeText={setLogFoodDraft}
                  placeholder="Search yogurt, oats, blueberries..."
                  placeholderTextColor="#7c8aa5"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    setLogFoodSearchTerm(logFoodDraft);
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>Search</Text>
                </Pressable>
              </View>

              <View style={[styles.inlineStatus, { borderColor: toneColor(logSearchTone) }]}>
                <Text style={styles.inlineStatusLabel}>{logSearchStatus}</Text>
                {logSearchError ? <Text style={styles.inlineStatusDetail}>{logSearchError}</Text> : null}
              </View>

              <View style={styles.foodList}>
                {logFoodResults.map((food) => {
                  const active = food.id === selectedLogFood?.id;

                  return (
                    <Pressable
                      key={food.id}
                      style={[styles.foodRow, active && styles.foodRowActive]}
                      onPress={() => setSelectedLogFoodId(food.id)}
                    >
                      <View style={styles.foodRowCopy}>
                        <Text style={styles.listTitle}>{food.name}</Text>
                        <Text style={styles.listCaption}>
                          {(food.brand ?? 'Unbranded')} · {food.source}
                        </Text>
                      </View>
                      <Text style={styles.listMetric}>{food.calories} kcal</Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedLogFood ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{selectedLogFood.name}</Text>
                  <Text style={styles.detailSubtitle}>
                    {selectedLogFood.brand ?? selectedLogFood.source} · {selectedLogFood.serving_size}
                    {selectedLogFood.serving_unit} base serving
                  </Text>

                  <View style={styles.searchRow}>
                    <TextInput
                      value={logGrams}
                      onChangeText={setLogGrams}
                      placeholder="100"
                      placeholderTextColor="#7c8aa5"
                      style={styles.searchInput}
                      keyboardType="numeric"
                      autoCorrect={false}
                    />
                    <Pressable
                      style={styles.primaryButton}
                      onPress={submitFoodLogEntry}
                      disabled={isSavingLogEntry}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {isSavingLogEntry ? 'Saving...' : 'Add to today'}
                      </Text>
                    </Pressable>
                  </View>

                  {logEntryPreview ? (
                    <View style={styles.metricRow}>
                      <MetricTile label="Preview calories" value={`${logEntryPreview.calories} kcal`} compact />
                      <MetricTile
                        label="Preview macros"
                        value={`${logEntryPreview.macros.protein}P / ${logEntryPreview.macros.carbs}C / ${logEntryPreview.macros.fat}F`}
                        compact
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Today</Text>
              <Text style={styles.panelTitle}>{foodLogLoading ? 'Loading entries' : formatLogDate(foodLog.date)}</Text>
              {foodLogLoading ? (
                <View style={styles.detailCard}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Fetching today’s persisted log...</Text>
                </View>
              ) : foodLog.entries.length === 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>No entries yet</Text>
                  <Text style={styles.detailSubtitle}>Add a searched food above to start today’s log.</Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {foodLog.entries.map((entry) => (
                    <View key={entry.id} style={styles.foodRow}>
                      <View style={styles.foodRowCopy}>
                        <Text style={styles.listTitle}>{entry.food_name}</Text>
                        <Text style={styles.listCaption}>
                          {entry.grams} g · {entry.logged_at} · {(entry.brand ?? 'Unbranded')} · {entry.source}
                        </Text>
                      </View>
                      <Text style={styles.listMetric}>{entry.calories} kcal</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {section === 'foods' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Food search</Text>
            <Text style={styles.panelTitle}>Search standardized foods</Text>
            <Text style={styles.panelDetail}>
              On phone, set `EXPO_PUBLIC_API_BASE_URL` to your laptop’s LAN IP so Expo Go can reach the backend.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                value={foodDraft}
                onChangeText={setFoodDraft}
                placeholder="Search yogurt, oats, blueberries..."
                placeholderTextColor="#7c8aa5"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable style={styles.primaryButton} onPress={submitFoodSearch}>
                <Text style={styles.primaryButtonLabel}>{isSubmittingSearch ? '...' : 'Search'}</Text>
              </Pressable>
            </View>

            <View style={[styles.inlineStatus, { borderColor: toneColor(foodTone) }]}>
              <Text style={styles.inlineStatusLabel}>{foodStatus}</Text>
              {foodError ? <Text style={styles.inlineStatusDetail}>{foodError}</Text> : null}
            </View>

            <View style={styles.foodList}>
              {foodResults.map((food) => {
                const active = food.id === selectedFood?.id;
                return (
                  <Pressable
                    key={food.id}
                    style={[styles.foodRow, active && styles.foodRowActive]}
                    onPress={() => setSelectedFoodId(food.id)}
                  >
                    <View style={styles.foodRowCopy}>
                      <Text style={styles.listTitle}>{food.name}</Text>
                      <Text style={styles.listCaption}>
                        {(food.brand ?? 'Unbranded')} · {food.source}
                      </Text>
                    </View>
                    <Text style={styles.listMetric}>{food.calories} kcal</Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedFood ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>{selectedFood.name}</Text>
                <Text style={styles.detailSubtitle}>
                  {selectedFood.serving_size}
                  {selectedFood.serving_unit} serving
                </Text>
                <View style={styles.metricRow}>
                  <MetricTile label="Calories" value={`${selectedFood.calories}`} compact />
                  <MetricTile label="Macros" value={foodMacroLine(selectedFood)} compact />
                </View>
              </View>
            ) : null}
          </View>
        )}

        {section === 'meals' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Meal builder</Text>
            <Text style={styles.panelTitle}>{demoMeal.name}</Text>
            <Text style={styles.panelDetail}>Scale the ingredient weights and serving count like you would on mobile.</Text>

            <View style={styles.dropdownWrap}>
              <Text style={styles.dropdownLabel}>Recipe scale</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setShowScaleOptions((current) => !current)}
              >
                <Text style={styles.dropdownValue}>{recipeScaleLabel(recipeScale)}</Text>
                <Text style={styles.dropdownCaret}>{showScaleOptions ? '▲' : '▼'}</Text>
              </Pressable>
              {showScaleOptions ? (
                <View style={styles.dropdownMenu}>
                  {recipeScales.map((scale) => {
                    const active = scale === recipeScale;
                    return (
                      <Pressable
                        key={scale}
                        style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                        onPress={() => {
                          setRecipeScale(scale);
                          setShowScaleOptions(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionLabel, active && styles.dropdownOptionLabelActive]}>
                          {recipeScaleLabel(scale)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {mealPreview.ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.listRow}>
                <View>
                  <Text style={styles.listTitle}>{ingredient.name}</Text>
                  <Text style={styles.listCaption}>{ingredient.grams} g</Text>
                </View>
                <Text style={styles.listMetric}>
                  {Math.round((ingredient.calories_per_100g * ingredient.grams) / 100)} kcal
                </Text>
              </View>
            ))}

            <View style={styles.metricRow}>
              <MetricTile label="Meal calories" value={`${recipeTotals.calories} kcal`} />
              <MetricTile label="Per serving" value={`${recipeTotals.per_serving_calories} kcal`} />
            </View>
          </View>
        )}

        {section === 'recipes' && (
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>Recipes</Text>
            <Text style={styles.panelTitle}>Saved recipe favorites</Text>
            <Text style={styles.panelDetail}>
              Your starred recipes load first, with the selected recipe detail shown below.
            </Text>

            <View style={[styles.inlineStatus, { borderColor: toneColor(recipeTone) }]}>
              <Text style={styles.inlineStatusLabel}>{recipeStatus}</Text>
              {recipeError ? <Text style={styles.inlineStatusDetail}>{recipeError}</Text> : null}
            </View>

            <View style={styles.recipeSection}>
              {recipeLoading ? (
                <View style={styles.detailCard}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Fetching saved recipe favorites...</Text>
                </View>
              ) : recipeFavorites.length === 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>No saved favorites yet</Text>
                  <Text style={styles.detailSubtitle}>
                    Save a recipe from the detail card once it appears, or import a new one below.
                  </Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {recipeFavorites.map((recipe) => {
                    const active = recipe.id === selectedRecipe?.id;
                    const saving = recipeSavingId === recipe.id;

                    return (
                      <Pressable
                        key={recipe.id}
                        style={[styles.foodRow, active && styles.foodRowActive]}
                        onPress={() => setSelectedRecipeId(recipe.id)}
                      >
                        <View style={styles.foodRowCopy}>
                          <View style={styles.recipeRowTitleWrap}>
                            <Text style={styles.listTitle}>{recipe.title}</Text>
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                void toggleRecipeFavorite(recipe, false);
                              }}
                              style={styles.recipeStarButton}
                              disabled={saving}
                            >
                              <Text style={styles.recipeStarButtonLabel}>{saving ? 'Saving...' : '★'}</Text>
                            </Pressable>
                          </View>
                          <Text style={styles.listCaption}>
                            {recipe.steps.length} steps · {recipe.ingredients.length} ingredients · {recipe.assets.length} assets
                          </Text>
                        </View>
                        <Text style={styles.listMetric}>{recipe.default_yield} servings</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.detailCard}>
              {recipeDetailLoading && selectedRecipe ? (
                <View style={styles.recipeDetailLoading}>
                  <ActivityIndicator size="small" color="#17324d" />
                  <Text style={styles.detailSubtitle}>Loading recipe detail...</Text>
                </View>
              ) : selectedRecipe ? (
                <>
                  <View style={styles.recipeDetailHeader}>
                    <View style={styles.recipeDetailHeaderCopy}>
                      <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                      <Text style={styles.detailSubtitle}>
                        {selectedRecipe.steps.length} steps · {selectedRecipe.ingredients.length} ingredients ·{' '}
                        {selectedRecipe.assets.length} assets · {selectedRecipe.default_yield} servings
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void toggleRecipeFavorite(selectedRecipe, !selectedRecipe.favorite)}
                      style={[
                        styles.recipeStarToggle,
                        selectedRecipe.favorite ? styles.recipeStarToggleActive : styles.recipeStarToggleInactive
                      ]}
                      disabled={recipeSavingId === selectedRecipe.id}
                    >
                      <Text
                        style={[
                          styles.recipeStarToggleLabel,
                          selectedRecipe.favorite && styles.recipeStarToggleLabelActive
                        ]}
                      >
                        {recipeSavingId === selectedRecipe.id
                          ? 'Saving...'
                          : selectedRecipe.favorite
                          ? 'Unfavorite'
                          : 'Favorite'}
                      </Text>
                    </Pressable>
                  </View>

                  {selectedRecipe.steps.length > 0 ? (
                    <View style={styles.recipeMetaBlock}>
                      <Text style={styles.recipeMetaLabel}>Steps</Text>
                      {selectedRecipe.steps.slice(0, 3).map((step, index) => (
                        <Text key={`${selectedRecipe.id}-step-${index}`} style={styles.recipeStep}>
                          {index + 1}. {step}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {selectedRecipe.ingredients.length > 0 ? (
                    <View style={styles.recipeMetaBlock}>
                      <Text style={styles.recipeMetaLabel}>Ingredients</Text>
                      {selectedRecipe.ingredients.slice(0, 3).map((ingredient) => (
                        <Text key={ingredient.id} style={styles.recipeMetaItem}>
                          {ingredient.name} · {ingredient.grams} g
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.recipeMetaBlock}>
                    <Text style={styles.recipeMetaLabel}>Assets</Text>
                    {selectedRecipe.assets.length === 0 ? (
                      <Text style={styles.recipeMetaItem}>No imported assets attached yet.</Text>
                    ) : (
                      selectedRecipe.assets.slice(0, 3).map((asset, index) => (
                        <Text key={`${selectedRecipe.id}-asset-${index}`} style={styles.recipeMetaItem}>
                          {asset.kind.toUpperCase()} asset {asset.url ? 'linked' : 'embedded'}
                        </Text>
                      ))
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.recipeDetailLoading}>
                  <Text style={styles.detailTitle}>Select a recipe</Text>
                  <Text style={styles.detailSubtitle}>
                    The selected recipe detail will appear here, including its steps, ingredients, and favorite toggle.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.recipeSecondaryCard}>
              <Text style={styles.panelEyebrow}>Import and scale</Text>
              <Text style={styles.panelDetail}>
                Text, PDF, and image ingestion stay in the secondary flow while favorites remain primary.
              </Text>
              {demoRecipeImports.sources.map((source) => (
                <View key={source.kind} style={styles.listRow}>
                  <View>
                    <Text style={styles.listTitle}>{source.label}</Text>
                    <Text style={styles.listCaption}>{source.kind.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.listMetric}>Ready</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {Platform.OS === 'web' ? (
          <Text style={styles.footer}>
            Browser preview runs with Expo web. For iPhone preview, run `npm start` in `frontend/` and scan the QR code with Expo Go.
          </Text>
        ) : (
          <Text style={styles.footer}>
            Running inside Expo. Use the same backend and switch devices without changing the frontend architecture.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricTile({
  label,
  value,
  compact = false
}: {
  label: string;
  value: string;
  compact?: boolean;
}): ReactElement {
  return (
    <View style={[styles.metricTile, compact && styles.metricTileCompact]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MacroProgress({
  label,
  consumed,
  target,
  color
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}): ReactElement {
  const width = `${progressPercent(consumed, target)}%` as DimensionValue;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabels}>
        <Text style={styles.listTitle}>{label}</Text>
        <Text style={styles.listCaption}>
          {Math.round(consumed)} / {Math.round(target)} g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function formatLogDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function createEmptyFoodLog(date = new Date().toISOString().slice(0, 10)): FoodLogSummary {
  return {
    date,
    entries: [],
    totals: {
      calories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 }
    }
  };
}

function LineTrendChart({
  points,
  targetCalories
}: {
  points: { label: string; calories: number }[];
  targetCalories: number;
}): ReactElement {
  const [frameWidth, setFrameWidth] = useState(0);
  const geometry = useMemo(
    () => (frameWidth > 0 ? buildTrendChartGeometry(points, targetCalories, frameWidth, chartHeight) : null),
    [frameWidth, points, targetCalories]
  );

  return (
    <View>
      <View
        style={styles.lineChartFrame}
        onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
      >
        {geometry ? (
          <>
            <View style={[styles.targetGuide, { top: geometry.targetY }]} />
            {geometry.segments.map((segment) => (
              <View
                key={segment.key}
                style={[
                  styles.lineSegment,
                  {
                    left: segment.centerX - segment.width / 2,
                    top: segment.centerY - 1.5,
                    width: segment.width,
                    transform: [{ rotate: `${segment.angle}deg` }]
                  }
                ]}
              />
            ))}
            {geometry.nodes.map((point) => (
              <View
                key={point.label}
                style={[
                  styles.lineNode,
                  {
                    left: point.x - 5,
                    top: point.y - 5
                  }
                ]}
              />
            ))}
          </>
        ) : (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="small" color="#17324d" />
          </View>
        )}
      </View>
      <View style={styles.lineChartLabels}>
        {points.map((point) => (
          <View key={point.label} style={styles.lineChartLabelItem}>
            <Text style={styles.chartValue}>{point.calories}</Text>
            <Text style={styles.chartLabel}>{point.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.chartTargetCaption}>Target guide: {targetCalories.toLocaleString()} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4efe4'
  },
  screen: {
    flex: 1,
    backgroundColor: '#f4efe4'
  },
  content: {
    padding: 16,
    gap: 16
  },
  hero: {
    backgroundColor: '#17324d',
    borderRadius: 28,
    padding: 20,
    gap: 16
  },
  eyebrow: {
    color: '#d8e1ed',
    letterSpacing: 1.5,
    fontSize: 12,
    fontWeight: '700'
  },
  heroHeader: {
    gap: 16
  },
  heroAside: {
    gap: 14,
    alignItems: 'stretch'
  },
  heroCopy: {
    gap: 10
  },
  headline: {
    color: '#f8fafc',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800'
  },
  lede: {
    color: '#d6e0ea',
    fontSize: 15,
    lineHeight: 22
  },
  ringCard: {
    alignSelf: 'flex-start',
    backgroundColor: '#f6f0e7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 132
  },
  ringValue: {
    color: '#17324d',
    fontSize: 30,
    fontWeight: '800'
  },
  ringLabel: {
    color: '#17324d',
    fontWeight: '700',
    marginTop: 4
  },
  ringCaption: {
    color: '#5c6d80',
    marginTop: 4,
    fontSize: 12
  },
  mascotCard: {
    backgroundColor: '#f6f0e7',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    gap: 10
  },
  mascotImage: {
    width: '100%',
    maxWidth: 220,
    height: 220
  },
  mascotLabel: {
    color: '#17324d',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  statusBanner: {
    backgroundColor: '#fffaf0',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    gap: 4
  },
  statusLabel: {
    color: '#132536',
    fontWeight: '700',
    fontSize: 15
  },
  statusDetail: {
    color: '#5c6d80',
    fontSize: 13,
    lineHeight: 18
  },
  sectionTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  sectionTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ced7e3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  sectionTabActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  sectionTabLabel: {
    color: '#17324d',
    fontSize: 12,
    fontWeight: '700'
  },
  sectionTabLabelActive: {
    color: '#ffffff'
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 14
  },
  panelHeader: {
    gap: 6
  },
  panelEyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  panelTitle: {
    color: '#132536',
    fontSize: 22,
    fontWeight: '800'
  },
  panelDetail: {
    color: '#66778c',
    fontSize: 13,
    lineHeight: 18
  },
  rangeTabs: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  rangeTab: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#edf1f5'
  },
  rangeTabActive: {
    backgroundColor: '#17324d'
  },
  rangeTabLabel: {
    color: '#17324d',
    fontWeight: '700'
  },
  rangeTabLabelActive: {
    color: '#ffffff'
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  metricTile: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: '#f7f4ef',
    borderRadius: 18,
    padding: 14,
    gap: 6
  },
  metricTileCompact: {
    minWidth: 140
  },
  metricLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: '#17324d',
    fontWeight: '800',
    fontSize: 18
  },
  chartCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    padding: 16
  },
  chartTitle: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10
  },
  lineChartFrame: {
    height: chartHeight,
    borderRadius: 18,
    backgroundColor: '#eef3f8',
    paddingHorizontal: 16,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden'
  },
  chartLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  targetGuide: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    borderStyle: 'dashed'
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#0f766e',
    borderRadius: 999,
    opacity: 0.9
  },
  lineNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#17324d',
    borderWidth: 2,
    borderColor: '#f8fafc'
  },
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12
  },
  lineChartLabelItem: {
    flex: 1,
    alignItems: 'center'
  },
  chartValue: {
    color: '#17324d',
    fontSize: 11,
    fontWeight: '700'
  },
  chartLabel: {
    color: '#66778c',
    fontSize: 12
  },
  chartTargetCaption: {
    color: '#66778c',
    marginTop: 10,
    fontSize: 12
  },
  macroStack: {
    gap: 12
  },
  quickLogCard: {
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    padding: 14,
    gap: 4
  },
  quickLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start'
  },
  quickLogTitle: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800'
  },
  quickLogHint: {
    color: '#7c8aa5',
    fontSize: 11,
    maxWidth: 120,
    textAlign: 'right'
  },
  macroRow: {
    gap: 8
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  macroTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden'
  },
  macroFill: {
    height: '100%',
    borderRadius: 999
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5'
  },
  listTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '700'
  },
  listCaption: {
    color: '#7c8aa5',
    fontSize: 12
  },
  listMetric: {
    color: '#17324d',
    fontWeight: '700'
  },
  searchRow: {
    gap: 10
  },
  dropdownWrap: {
    gap: 8
  },
  dropdownLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  dropdownTrigger: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownValue: {
    color: '#17324d',
    fontWeight: '800',
    fontSize: 16
  },
  dropdownCaret: {
    color: '#66778c',
    fontSize: 12
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    overflow: 'hidden'
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5'
  },
  dropdownOptionActive: {
    backgroundColor: '#17324d'
  },
  dropdownOptionLabel: {
    color: '#17324d',
    fontWeight: '700'
  },
  dropdownOptionLabelActive: {
    color: '#ffffff'
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: '#132536'
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: '#17324d',
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '800'
  },
  inlineStatus: {
    backgroundColor: '#fffaf0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4
  },
  inlineStatusLabel: {
    color: '#132536',
    fontWeight: '700'
  },
  inlineStatusDetail: {
    color: '#8a5a1d',
    fontSize: 12
  },
  foodList: {
    gap: 8
  },
  foodRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  foodRowActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  foodRowCopy: {
    flex: 1,
    gap: 2
  },
  recipeSection: {
    gap: 12
  },
  recipeRowTitleWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  recipeStarButton: {
    borderRadius: 999,
    backgroundColor: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  recipeStarButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  detailCard: {
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  recipeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  recipeDetailHeaderCopy: {
    flex: 1,
    gap: 4
  },
  recipeStarToggle: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  recipeStarToggleActive: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  recipeStarToggleInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1'
  },
  recipeStarToggleLabel: {
    color: '#17324d',
    fontWeight: '800'
  },
  recipeStarToggleLabelActive: {
    color: '#ffffff'
  },
  recipeMetaBlock: {
    gap: 6,
    paddingTop: 4
  },
  recipeMetaLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  recipeStep: {
    color: '#132536',
    fontSize: 13,
    lineHeight: 18
  },
  recipeMetaItem: {
    color: '#132536',
    fontSize: 13,
    lineHeight: 18
  },
  recipeDetailLoading: {
    gap: 8
  },
  recipeSecondaryCard: {
    backgroundColor: '#f2f6fb',
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  detailTitle: {
    color: '#132536',
    fontSize: 20,
    fontWeight: '800'
  },
  detailSubtitle: {
    color: '#66778c'
  },
  footer: {
    color: '#66778c',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 16
  }
});
