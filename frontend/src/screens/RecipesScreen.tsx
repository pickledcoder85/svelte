import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { ScaleStopSelector } from '../components/ScaleStopSelector';
import { useT } from '../i18n';
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
  const t = useT();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>{t('recipes.eyebrow')}</Text>
      <Text style={styles.panelTitle}>{t('recipes.title')}</Text>
      <Text style={styles.panelDetail}>{t('recipes.detail')}</Text>

      <View style={[styles.inlineStatus, { borderColor: toneColor(recipeTone) }]}>
        <Text style={styles.inlineStatusLabel}>{recipeStatus}</Text>
        {recipeError ? <Text style={styles.inlineStatusDetail}>{recipeError}</Text> : null}
      </View>

      <View style={[styles.inlineStatus, { borderColor: toneColor(recipeImportTone) }]}>
        <Text style={styles.inlineStatusLabel}>{recipeImportStatus}</Text>
        {recipeImportError ? <Text style={styles.inlineStatusDetail}>{recipeImportError}</Text> : null}
      </View>

      <View style={styles.recipeImportCard}>
        <Text style={styles.recipeMetaLabel}>{t('recipes.importReview')}</Text>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{t('recipes.noImportTitle')}</Text>
          <Text style={styles.detailSubtitle}>{t('recipes.noImportDetail')}</Text>
        </View>
      </View>

      <View style={styles.recipeSection}>
        <View style={styles.searchRow}>
          <TextInput
            value={recipeSearchTerm}
            onChangeText={setRecipeSearchTerm}
            placeholder={t('recipes.placeholder')}
            placeholderTextColor={tc.fg_7c8aa5}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {recipeLoading ? (
          <View style={styles.detailCard}>
            <ActivityIndicator size="small" color={tc.fg_17324d} />
            <Text style={styles.detailSubtitle}>{t('recipes.fetching')}</Text>
          </View>
        ) : filteredRecipeCatalog.length === 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{t('recipes.noMatchTitle')}</Text>
            <Text style={styles.detailSubtitle}>{t('recipes.noMatchDetail')}</Text>
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
                            {saving ? t('recipes.saving') : recipe.favorite ? '★' : '☆'}
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={styles.listCaption}>
                        {t('recipes.counts', { steps: recipe.steps.length, ingredients: recipe.ingredients.length, assets: recipe.assets.length })}
                      </Text>
                    </View>
                    <View style={styles.recipeAccordionMeta}>
                      <Text style={styles.listMetric}>{t('recipes.servings', { count: recipe.default_yield })}</Text>
                      <Text style={styles.recipeAccordionCaret}>{active ? '▲' : '▼'}</Text>
                    </View>
                  </Pressable>

                  {active ? (
                    <View style={styles.recipeAccordionBody}>
                      {recipeDetailLoading && selectedRecipe?.id === recipe.id ? (
                        <View style={styles.recipeDetailLoading}>
                          <ActivityIndicator size="small" color={tc.fg_17324d} />
                          <Text style={styles.detailSubtitle}>{t('recipes.loadingDetail')}</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.recipeDetailHeader}>
                            <View style={styles.recipeDetailHeaderCopy}>
                              <View style={styles.recipeRowTitleWrap}>
                                <Text style={styles.detailTitle}>{detailRecipe.title}</Text>
                              </View>
                              <Text style={styles.detailSubtitle}>
                                {t('recipes.counts', {
                                  steps: detailRecipe.steps.length,
                                  ingredients: detailRecipe.ingredients.length,
                                  assets: detailRecipe.assets.length
                                })}{' '}
                                · {t('recipes.servings', { count: detailRecipe.default_yield })}
                              </Text>
                            </View>
                          </View>

                          <ScaleStopSelector
                            label={t('recipes.scale')}
                            helperText={t('recipes.scaleHint')}
                            value={recipeScale}
                            values={scaleStops}
                            onChange={setRecipeScale}
                          />

                          <View style={styles.metricRow}>
                            <MetricTile
                              label={t('recipes.scaledYield')}
                              value={t('recipes.servings', { count: round1(detailRecipe.default_yield * recipeScale) })}
                            />
                            <MetricTile label={t('recipes.recipeCalories')} value={t('common.kcal', { value: scaledTotals.calories })} />
                            <MetricTile
                              label={t('recipes.perServing')}
                              value={t('common.kcal', { value: scaledTotals.per_serving_calories })}
                            />
                          </View>

                          {detailRecipe.steps.length > 0 ? (
                            <View style={styles.recipeMetaBlock}>
                              <Text style={styles.recipeMetaLabel}>{t('recipes.steps')}</Text>
                              {detailRecipe.steps.map((step, index) => (
                                <Text key={`${detailRecipe.id}-step-${index}`} style={styles.recipeStep}>
                                  {index + 1}. {step}
                                </Text>
                              ))}
                            </View>
                          ) : null}

                          {scaledRecipe.ingredients.length > 0 ? (
                            <View style={styles.recipeMetaBlock}>
                              <Text style={styles.recipeMetaLabel}>{t('recipes.ingredients')}</Text>
                              {scaledRecipe.ingredients.map((ingredient) => (
                                <Text key={`${detailRecipe.id}-${ingredient.id}`} style={styles.recipeMetaItem}>
                                  {ingredient.name} · {ingredient.grams} g
                                </Text>
                              ))}
                            </View>
                          ) : null}

                          <View style={styles.recipeMetaBlock}>
                            <Text style={styles.recipeMetaLabel}>{t('recipes.assets')}</Text>
                            {detailRecipe.assets.length === 0 ? (
                              <Text style={styles.recipeMetaItem}>{t('recipes.noAssets')}</Text>
                            ) : (
                              detailRecipe.assets.map((asset, index) => (
                                <Text key={`${detailRecipe.id}-asset-${index}`} style={styles.recipeMetaItem}>
                                  {t(asset.url ? 'recipes.assetLinked' : 'recipes.assetEmbedded', { kind: asset.kind.toUpperCase() })}
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
        <Text style={styles.panelEyebrow}>{t('recipes.importScale')}</Text>
        <Text style={styles.panelDetail}>{t('recipes.importScaleDetail')}</Text>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{t('recipes.noComposerTitle')}</Text>
          <Text style={styles.detailSubtitle}>{t('recipes.noComposerDetail')}</Text>
        </View>
      </View>
    </View>
  );
}
