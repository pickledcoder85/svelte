import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { ScaleStopSelector } from '../components/ScaleStopSelector';
import { toneColor } from '../lib/app-format';
import { mealTotals, round1 } from '../lib/nutrition';
import { tc } from '../theme/palette';
import type { MealInput, MealTotals, RecipeDefinition } from '../types';
import { scaleStops, type ScaleStop } from './shared/constants';
import { styles } from './shared/styles';

export interface RecipesScreenProps {
  recipeTone: 'checking' | 'live';
  recipeStatus: string;
  recipeError: string | null;
  recipeImportTone: 'checking' | 'live';
  recipeImportStatus: string;
  recipeImportError: string | null;
  recipeSearchTerm: string;
  setRecipeSearchTerm: Dispatch<SetStateAction<string>>;
  recipeLoading: boolean;
  filteredRecipeCatalog: RecipeDefinition[];
  selectedRecipeId: string | null;
  setSelectedRecipeId: Dispatch<SetStateAction<string | null>>;
  recipeSavingId: string | null;
  selectedRecipe: RecipeDefinition | null;
  selectedRecipePreview: MealInput | null;
  selectedRecipeTotals: MealTotals | null;
  toggleRecipeFavorite: (recipe: RecipeDefinition, nextFavorite: boolean) => Promise<void>;
  recipeDetailLoading: boolean;
  recipeScale: ScaleStop;
  setRecipeScale: Dispatch<SetStateAction<ScaleStop>>;
}

export function RecipesScreen({
  recipeTone,
  recipeStatus,
  recipeError,
  recipeImportTone,
  recipeImportStatus,
  recipeImportError,
  recipeSearchTerm,
  setRecipeSearchTerm,
  recipeLoading,
  filteredRecipeCatalog,
  selectedRecipeId,
  setSelectedRecipeId,
  recipeSavingId,
  selectedRecipe,
  selectedRecipePreview,
  selectedRecipeTotals,
  toggleRecipeFavorite,
  recipeDetailLoading,
  recipeScale,
  setRecipeScale
}: RecipesScreenProps): ReactElement {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Recipes</Text>
      <Text style={styles.panelTitle}>Recipe library and import review</Text>
      <Text style={styles.panelDetail}>
        Browse the full recipe catalog in alphabetical order, narrow it with fuzzy search, and open each recipe inline to review the details.
      </Text>

      <View style={[styles.inlineStatus, { borderColor: toneColor(recipeTone) }]}>
        <Text style={styles.inlineStatusLabel}>{recipeStatus}</Text>
        {recipeError ? <Text style={styles.inlineStatusDetail}>{recipeError}</Text> : null}
      </View>

      <View style={[styles.inlineStatus, { borderColor: toneColor(recipeImportTone) }]}>
        <Text style={styles.inlineStatusLabel}>{recipeImportStatus}</Text>
        {recipeImportError ? <Text style={styles.inlineStatusDetail}>{recipeImportError}</Text> : null}
      </View>

      <View style={styles.recipeImportCard}>
        <Text style={styles.recipeMetaLabel}>Import review</Text>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>No live recipe import selected</Text>
          <Text style={styles.detailSubtitle}>
            Imported recipes will appear here after a real text, PDF, or image upload is submitted.
          </Text>
        </View>
      </View>

      <View style={styles.recipeSection}>
        <View style={styles.searchRow}>
          <TextInput
            value={recipeSearchTerm}
            onChangeText={setRecipeSearchTerm}
            placeholder="Find oats, chicken, parfait..."
            placeholderTextColor={tc.fg_7c8aa5}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {recipeLoading ? (
          <View style={styles.detailCard}>
            <ActivityIndicator size="small" color={tc.fg_17324d} />
            <Text style={styles.detailSubtitle}>Fetching recipes...</Text>
          </View>
        ) : filteredRecipeCatalog.length === 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>No recipe matches yet</Text>
            <Text style={styles.detailSubtitle}>
              Try another title or ingredient term to narrow the recipe list.
            </Text>
          </View>
        ) : (
          <View style={styles.foodList}>
            {filteredRecipeCatalog.map((recipe) => {
              const active = recipe.id === selectedRecipeId;
              const saving = recipeSavingId === recipe.id;
              const detailRecipe = active && selectedRecipe?.id === recipe.id ? selectedRecipe : recipe;
              const scaledRecipe = active && selectedRecipePreview?.id === recipe.id ? selectedRecipePreview : detailRecipe;
              const scaledTotals =
                active && selectedRecipeTotals && selectedRecipe?.id === recipe.id
                  ? selectedRecipeTotals
                  : mealTotals({
                      id: detailRecipe.id,
                      name: detailRecipe.title,
                      serving_count: detailRecipe.default_yield,
                      ingredients: detailRecipe.ingredients
                    });

              return (
                <View key={recipe.id} style={[styles.recipeAccordionCard, active && styles.recipeAccordionCardActive]}>
                  <Pressable
                    style={styles.recipeAccordionHeader}
                    onPress={() => setSelectedRecipeId((current) => (current === recipe.id ? null : recipe.id))}
                  >
                    <View style={styles.foodRowCopy}>
                      <View style={styles.recipeRowTitleWrap}>
                        <Text style={styles.listTitle}>{recipe.title}</Text>
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            void toggleRecipeFavorite(recipe, !recipe.favorite);
                          }}
                          style={[styles.recipeStarButton, recipe.favorite && styles.recipeStarButtonActive]}
                          disabled={saving}
                        >
                          <Text style={styles.recipeStarButtonLabel}>
                            {saving ? 'Saving...' : recipe.favorite ? '★' : '☆'}
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={styles.listCaption}>
                        {recipe.steps.length} steps · {recipe.ingredients.length} ingredients · {recipe.assets.length} assets
                      </Text>
                    </View>
                    <View style={styles.recipeAccordionMeta}>
                      <Text style={styles.listMetric}>{recipe.default_yield} servings</Text>
                      <Text style={styles.recipeAccordionCaret}>{active ? '▲' : '▼'}</Text>
                    </View>
                  </Pressable>

                  {active ? (
                    <View style={styles.recipeAccordionBody}>
                      {recipeDetailLoading && selectedRecipe?.id === recipe.id ? (
                        <View style={styles.recipeDetailLoading}>
                          <ActivityIndicator size="small" color={tc.fg_17324d} />
                          <Text style={styles.detailSubtitle}>Loading recipe detail...</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.recipeDetailHeader}>
                            <View style={styles.recipeDetailHeaderCopy}>
                              <View style={styles.recipeRowTitleWrap}>
                                <Text style={styles.detailTitle}>{detailRecipe.title}</Text>
                              </View>
                              <Text style={styles.detailSubtitle}>
                                {detailRecipe.steps.length} steps · {detailRecipe.ingredients.length} ingredients ·{' '}
                                {detailRecipe.assets.length} assets · {detailRecipe.default_yield} servings
                              </Text>
                            </View>
                          </View>

                          <ScaleStopSelector
                            label="Recipe scale"
                            helperText="The fixed stops keep the serving preview readable while you step through the accordion."
                            value={recipeScale}
                            values={scaleStops}
                            onChange={setRecipeScale}
                          />

                          <View style={styles.metricRow}>
                            <MetricTile
                              label="Scaled yield"
                              value={`${round1(detailRecipe.default_yield * recipeScale)} servings`}
                            />
                            <MetricTile label="Recipe calories" value={`${scaledTotals.calories} kcal`} />
                            <MetricTile
                              label="Per serving"
                              value={`${scaledTotals.per_serving_calories} kcal`}
                            />
                          </View>

                          {detailRecipe.steps.length > 0 ? (
                            <View style={styles.recipeMetaBlock}>
                              <Text style={styles.recipeMetaLabel}>Steps</Text>
                              {detailRecipe.steps.map((step, index) => (
                                <Text key={`${detailRecipe.id}-step-${index}`} style={styles.recipeStep}>
                                  {index + 1}. {step}
                                </Text>
                              ))}
                            </View>
                          ) : null}

                          {scaledRecipe.ingredients.length > 0 ? (
                            <View style={styles.recipeMetaBlock}>
                              <Text style={styles.recipeMetaLabel}>Ingredients</Text>
                              {scaledRecipe.ingredients.map((ingredient) => (
                                <Text key={`${detailRecipe.id}-${ingredient.id}`} style={styles.recipeMetaItem}>
                                  {ingredient.name} · {ingredient.grams} g
                                </Text>
                              ))}
                            </View>
                          ) : null}

                          <View style={styles.recipeMetaBlock}>
                            <Text style={styles.recipeMetaLabel}>Assets</Text>
                            {detailRecipe.assets.length === 0 ? (
                              <Text style={styles.recipeMetaItem}>No imported assets attached yet.</Text>
                            ) : (
                              detailRecipe.assets.map((asset, index) => (
                                <Text key={`${detailRecipe.id}-asset-${index}`} style={styles.recipeMetaItem}>
                                  {asset.kind.toUpperCase()} asset {asset.url ? 'linked' : 'embedded'}
                                </Text>
                              ))
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.recipeSecondaryCard}>
        <Text style={styles.panelEyebrow}>Import and scale</Text>
        <Text style={styles.panelDetail}>
          Text, PDF, and image ingestion will appear here once the import composer is wired in.
        </Text>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>No live import composer yet</Text>
          <Text style={styles.detailSubtitle}>
            Imported recipes will show up here after a real text, PDF, or image submission.
          </Text>
        </View>
      </View>
    </View>
  );
}
