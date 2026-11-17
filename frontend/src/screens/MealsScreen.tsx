import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { ScaleStopSelector } from '../components/ScaleStopSelector';
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
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Meal builder</Text>
      <TextInput
        value={mealDraft.name}
        onChangeText={updateMealName}
        placeholder="Untitled meal"
        placeholderTextColor={tc.fg_7c8aa5}
        style={styles.mealNameInput}
        autoCapitalize="words"
      />
      <Text style={styles.panelDetail}>
        Adjust the draft ingredients, then snap the serving scale to a fixed stop for a fast mobile-friendly preview.
      </Text>

      <View style={styles.mealBuilderHeaderRow}>
        <View style={styles.mealServingWrap}>
          <Text style={styles.mealMetaLabel}>Servings</Text>
          <TextInput
            value={String(mealDraft.serving_count)}
            onChangeText={updateMealServings}
            keyboardType="numeric"
            inputMode="decimal"
            style={styles.mealServingInput}
          />
        </View>
        <View style={styles.mealBuilderHintWrap}>
          <Text style={styles.mealBuilderHint}>
            Local draft only until meal persistence lands on the backend contract.
          </Text>
        </View>
      </View>

      <ScaleStopSelector
        label="Meal scale"
        helperText="Fixed stops keep the preview predictable while you edit the draft."
        value={mealScale}
        values={scaleStops}
        onChange={setMealScale}
      />

      <View style={styles.mealBuilderActionsRow}>
        <Pressable style={styles.inlinePillButton} onPress={resetMealDraft}>
          <Text style={styles.inlinePillButtonLabel}>Reset draft</Text>
        </Pressable>
        <Text style={styles.mealBuilderHint}>Meal save is still backend-gated, so this stays as a live preview.</Text>
      </View>

      <View style={styles.mealIngredientEditor}>
        {mealDraft.ingredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.mealIngredientRow}>
            <View style={styles.foodRowCopy}>
              <Text style={styles.listTitle}>{ingredient.name}</Text>
              <Text style={styles.listCaption}>
                {ingredient.food_id} · {ingredient.calories_per_100g} kcal / 100g
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
        <Text style={styles.recipeMetaLabel}>Scaled preview</Text>
        {mealPreview.ingredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.listRow}>
            <View>
              <Text style={styles.listTitle}>{ingredient.name}</Text>
              <Text style={styles.listCaption}>{ingredient.grams} g · {ingredient.food_id}</Text>
            </View>
            <Text style={styles.listMetric}>
              {Math.round((ingredient.calories_per_100g * ingredient.grams) / 100)} kcal
            </Text>
          </View>
        ))}

        <View style={styles.metricRow}>
          <MetricTile label="Meal calories" value={`${mealTotalsPreview.calories} kcal`} />
          <MetricTile label="Per serving" value={`${mealTotalsPreview.per_serving_calories} kcal`} />
        </View>
      </View>
    </View>
  );
}
