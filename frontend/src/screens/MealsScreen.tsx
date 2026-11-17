import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { ScaleStopSelector } from '../components/ScaleStopSelector';
import { useT } from '../i18n';
import { tc } from '../theme/palette';
import type { MealInput, MealTotals } from '../types';
import { scaleStops, type ScaleStop } from './shared/constants';
import { styles } from './shared/styles';

export interface MealsScreenProps {
  mealDraft: MealInput;
  updateMealName: (name: string) => void;
  updateMealServings: (value: string) => void;
  mealScale: ScaleStop;
  setMealScale: Dispatch<SetStateAction<ScaleStop>>;
  resetMealDraft: () => void;
  updateMealIngredientGrams: (ingredientId: string, gramsValue: string) => void;
  mealPreview: MealInput;
  mealTotalsPreview: MealTotals;
}

export function MealsScreen({
  mealDraft,
  updateMealName,
  updateMealServings,
  mealScale,
  setMealScale,
  resetMealDraft,
  updateMealIngredientGrams,
  mealPreview,
  mealTotalsPreview
}: MealsScreenProps): ReactElement {
  const t = useT();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>{t('buildMeal.eyebrow')}</Text>
      <TextInput
        value={mealDraft.name}
        onChangeText={updateMealName}
        placeholder={t('buildMeal.namePlaceholder')}
        placeholderTextColor={tc.fg_7c8aa5}
        style={styles.mealNameInput}
        autoCapitalize="words"
      />
      <Text style={styles.panelDetail}>{t('buildMeal.detail')}</Text>

      <View style={styles.mealBuilderHeaderRow}>
        <View style={styles.mealServingWrap}>
          <Text style={styles.mealMetaLabel}>{t('buildMeal.servings')}</Text>
          <TextInput
            value={String(mealDraft.serving_count)}
            onChangeText={updateMealServings}
            keyboardType="numeric"
            inputMode="decimal"
            style={styles.mealServingInput}
          />
        </View>
        <View style={styles.mealBuilderHintWrap}>
          <Text style={styles.mealBuilderHint}>{t('buildMeal.localDraft')}</Text>
        </View>
      </View>

      <ScaleStopSelector
        label={t('buildMeal.scale')}
        helperText={t('buildMeal.scaleHint')}
        value={mealScale}
        values={scaleStops}
        onChange={setMealScale}
      />

      <View style={styles.mealBuilderActionsRow}>
        <Pressable style={styles.inlinePillButton} onPress={resetMealDraft}>
          <Text style={styles.inlinePillButtonLabel}>{t('buildMeal.reset')}</Text>
        </Pressable>
        <Text style={styles.mealBuilderHint}>{t('buildMeal.backendGated')}</Text>
      </View>

      <View style={styles.mealIngredientEditor}>
        {mealDraft.ingredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.mealIngredientRow}>
            <View style={styles.foodRowCopy}>
              <Text style={styles.listTitle}>{ingredient.name}</Text>
              <Text style={styles.listCaption}>
                {t('buildMeal.per100', { id: ingredient.food_id, kcal: ingredient.calories_per_100g })}
              </Text>
            </View>
            <View style={styles.mealIngredientInputWrap}>
              <TextInput
                value={String(ingredient.grams)}
                onChangeText={(value) => updateMealIngredientGrams(ingredient.id, value)}
                keyboardType="numeric"
                inputMode="decimal"
                style={styles.mealIngredientInput}
              />
              <Text style={styles.mealIngredientUnit}>g</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.recipeMetaLabel}>{t('buildMeal.scaledPreview')}</Text>
        {mealPreview.ingredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.listRow}>
            <View>
              <Text style={styles.listTitle}>{ingredient.name}</Text>
              <Text style={styles.listCaption}>{t('buildMeal.gramsLine', { grams: ingredient.grams, id: ingredient.food_id })}</Text>
            </View>
            <Text style={styles.listMetric}>
              {t('common.kcal', { value: Math.round((ingredient.calories_per_100g * ingredient.grams) / 100) })}
            </Text>
          </View>
        ))}

        <View style={styles.metricRow}>
          <MetricTile label={t('buildMeal.mealCalories')} value={t('common.kcal', { value: mealTotalsPreview.calories })} />
          <MetricTile label={t('buildMeal.perServing')} value={t('common.kcal', { value: mealTotalsPreview.per_serving_calories })} />
        </View>
      </View>
    </View>
  );
}
