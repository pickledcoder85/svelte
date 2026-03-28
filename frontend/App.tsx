import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { calculateMeal, fetchBackendHealth, fetchWeeklyMetrics, importRecipe, searchFoods } from './src/lib/api';
import { buildTrendChartGeometry, remainingCalories, selectRangeSeries } from './src/lib/dashboard';
import { foodMacroLine, selectFoodById } from './src/lib/foods';
import { mealTotals, progressPercent, recipeScaleLabel, scaleMealIngredients } from './src/lib/nutrition';
import {
  demoDashboardSnapshot,
  demoFoodResults,
  demoFoodStrip,
  demoMeal,
  demoRangeSeries,
  demoRecipe,
  demoRecipeImports
} from './src/mock-data';
import type { AppSection, DashboardRange, DashboardSnapshot, FoodItem } from './src/types';

const recipeScales = [0.5, 1, 1.25, 1.5, 2] as const;
const sectionOrder: AppSection[] = ['dashboard', 'foods', 'meals', 'recipes'];
const rangeTabs: DashboardRange[] = ['1D', '1W', '1M', '3M'];
const chartHeight = 160;

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

  const selectedSeries = useMemo(
    () => selectRangeSeries(snapshot.rangeSeries, activeRange),
    [activeRange, snapshot.rangeSeries]
  );
  const selectedFood = useMemo(
    () => selectFoodById(foodResults, selectedFoodId),
    [foodResults, selectedFoodId]
  );
  const mealPreview = useMemo(() => scaleMealIngredients(demoMeal, recipeScale), [recipeScale]);
  const recipeTotals = useMemo(() => mealTotals(mealPreview), [mealPreview]);
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
            <View style={styles.ringCard}>
              <Text style={styles.ringValue}>{calorieProgress}%</Text>
              <Text style={styles.ringLabel}>{selectedSeries.label}</Text>
              <Text style={styles.ringCaption}>
                {selectedSeries.caloriesConsumed.toLocaleString()} / {selectedSeries.targetCalories.toLocaleString()} kcal
              </Text>
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
            <Text style={styles.panelTitle}>{demoRecipe.title}</Text>
            <Text style={styles.panelDetail}>Text, PDF, and image ingestion are preserved in the Expo version.</Text>
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
  detailCard: {
    backgroundColor: '#f7f4ef',
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
