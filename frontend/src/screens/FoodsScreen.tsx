import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { useT } from '../i18n';
import { toneColor } from '../lib/app-format';
import { formatFoodAmount, formatFoodQuantity, formatFoodReference } from '../lib/foods';
import { tc } from '../theme/palette';
import type { FoodItem } from '../types';
import { styles } from './shared/styles';

export interface FoodsScreenProps {
  foodDraft: string;
  setFoodDraft: Dispatch<SetStateAction<string>>;
  submitFoodSearch: () => void;
  isSubmittingSearch: boolean;
  foodTone: 'checking' | 'live';
  foodStatus: string;
  foodError: string | null;
  foodResults: FoodItem[];
  selectedFood: FoodItem | null;
  setSelectedFoodId: Dispatch<SetStateAction<string>>;
  foodQuantityForId: (foodId: string) => number;
  adjustFoodQuantity: (foodId: string, delta: number) => void;
  quickAddFoodToToday: (food: FoodItem) => Promise<void>;
  isSavingLogEntry: boolean;
  toggleFoodFavorite: (food: FoodItem) => Promise<void>;
  foodFavoriteSavingId: string | null;
  removeFromBank: (food: FoodItem) => Promise<void>;
  confirmDeleteKey: string | null;
}

export function FoodsScreen({
  foodDraft,
  setFoodDraft,
  submitFoodSearch,
  isSubmittingSearch,
  foodTone,
  foodStatus,
  foodError,
  foodResults,
  selectedFood,
  setSelectedFoodId,
  foodQuantityForId,
  adjustFoodQuantity,
  quickAddFoodToToday,
  isSavingLogEntry,
  toggleFoodFavorite,
  foodFavoriteSavingId,
  removeFromBank,
  confirmDeleteKey
}: FoodsScreenProps): ReactElement {
  const t = useT();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{t('foods.title')}</Text>
      <Text style={styles.panelDetail}>{t('foods.detail')}</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={foodDraft}
          onChangeText={setFoodDraft}
          placeholder={t('foods.placeholder')}
          placeholderTextColor={tc.fg_7c8aa5}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
          <Pressable style={styles.primaryButton} onPress={submitFoodSearch}>
          <Text style={styles.primaryButtonLabel}>{isSubmittingSearch ? '...' : t('foods.refresh')}</Text>
        </Pressable>
      </View>

      <View style={[styles.inlineStatus, { borderColor: toneColor(foodTone) }]}>
        <Text style={styles.inlineStatusLabel}>{foodStatus}</Text>
        {foodError ? <Text style={styles.inlineStatusDetail}>{foodError}</Text> : null}
      </View>

      <View style={styles.foodList}>
        {foodResults.map((food) => {
          const active = food.id === selectedFood?.id;
          const quantity = foodQuantityForId(food.id);
          return (
            <Pressable
              key={food.id}
              style={[styles.foodRow, active && styles.foodRowActive]}
              onPress={() => setSelectedFoodId(food.id)}
            >
              <View style={styles.foodCardCopy}>
                <View style={styles.foodRowHeader}>
                  <View style={styles.foodRowCopy}>
                    <Text style={styles.listTitle}>{food.name}</Text>
                    <Text style={styles.listCaption}>
                      {food.brand ?? t('foods.unbranded')} · {food.source} · {food.favorite ? t('foods.favorite') : t('foods.searchMatch')}
                    </Text>
                  </View>
                  <Text style={styles.listMetric}>{t('common.kcal', { value: food.calories })}</Text>
                </View>

                <View style={styles.foodCardMetaRow}>
                  <Text style={styles.foodCardChip}>{t('foods.base', { amount: formatFoodReference(food) })}</Text>
                  <Text style={styles.foodCardChip}>{t('foods.quantity', { amount: formatFoodQuantity(quantity) })}</Text>
                </View>

                <View style={styles.foodCardActionsRow}>
                  <View style={styles.quantityStepper}>
                    <Pressable
                      style={styles.quantityStepperButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        adjustFoodQuantity(food.id, -0.5);
                      }}
                      disabled={quantity <= 0.5}
                    >
                      <Text style={styles.quantityStepperButtonLabel}>−</Text>
                    </Pressable>
                    <Text style={styles.quantityStepperValue}>{formatFoodQuantity(quantity)}</Text>
                    <Pressable
                      style={styles.quantityStepperButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        adjustFoodQuantity(food.id, 0.5);
                      }}
                    >
                      <Text style={styles.quantityStepperButtonLabel}>+</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.inlinePillButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      void quickAddFoodToToday(food);
                    }}
                    disabled={isSavingLogEntry}
                  >
                    <Text style={styles.inlinePillButtonLabel}>
                      {isSavingLogEntry ? t('foods.saving') : t('foods.addToToday', { amount: formatFoodAmount(food, foodQuantityForId(food.id)) })}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.favoriteToggleButton,
                      food.favorite && styles.favoriteToggleButtonActive
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();
                      void toggleFoodFavorite(food);
                    }}
                    disabled={foodFavoriteSavingId === food.id}
                  >
                    <Text
                      style={[
                        styles.favoriteToggleButtonLabel,
                        food.favorite && styles.favoriteToggleButtonLabelActive
                      ]}
                    >
                      {foodFavoriteSavingId === food.id ? '...' : food.favorite ? '♥' : '♡'}
                    </Text>
                  </Pressable>
                  {food.in_bank ? (
                    <Pressable
                      style={[styles.todayRemoveButton, confirmDeleteKey === `bank:${food.id}` && styles.todayRemoveConfirm]}
                      onPress={(event) => {
                        event.stopPropagation();
                        void removeFromBank(food);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t(confirmDeleteKey === `bank:${food.id}` ? 'foods.confirmRemove' : 'foods.removeFromBank', { name: food.name })}
                    >
                      <Text style={[styles.todayRemoveLabel, confirmDeleteKey === `bank:${food.id}` && styles.todayRemoveConfirmLabel]}>
                        {confirmDeleteKey === `bank:${food.id}` ? t('foods.removeConfirm') : '✕'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedFood ? (
        <View style={styles.detailCard}>
          <View style={styles.recipeRowTitleWrap}>
            <View>
              <Text style={styles.detailTitle}>{selectedFood.name}</Text>
              <Text style={styles.detailSubtitle}>
                {selectedFood.brand ?? t('foods.unbranded')} · {selectedFood.source}
              </Text>
            </View>
            <Text style={styles.detailSubtitle}>{selectedFood.favorite ? t('foods.favorite') : t('foods.searchMatch')}</Text>
          </View>
          <View style={styles.metricRow}>
            <MetricTile label={t('foods.calories')} value={`${selectedFood.calories}`} compact />
            <MetricTile label={t('foods.macros')} value={t('foods.macroLine', { ...selectedFood.macros })} compact />
          </View>
          <View style={styles.foodCardMetaRow}>
            <Text style={styles.foodCardChip}>{t('foods.base', { amount: formatFoodReference(selectedFood) })}</Text>
            <Text style={styles.foodCardChip}>{t('foods.quantity', { amount: formatFoodQuantity(foodQuantityForId(selectedFood.id)) })}</Text>
          </View>
          <View style={styles.foodCardActionsRow}>
            <View style={styles.quantityStepper}>
              <Pressable
                style={styles.quantityStepperButton}
                onPress={() => adjustFoodQuantity(selectedFood.id, -0.5)}
                disabled={foodQuantityForId(selectedFood.id) <= 0.5}
              >
                <Text style={styles.quantityStepperButtonLabel}>−</Text>
              </Pressable>
              <Text style={styles.quantityStepperValue}>{formatFoodQuantity(foodQuantityForId(selectedFood.id))}</Text>
              <Pressable
                style={styles.quantityStepperButton}
                onPress={() => adjustFoodQuantity(selectedFood.id, 0.5)}
              >
                <Text style={styles.quantityStepperButtonLabel}>+</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.inlinePillButton}
              onPress={() => void quickAddFoodToToday(selectedFood)}
              disabled={isSavingLogEntry}
            >
              <Text style={styles.inlinePillButtonLabel}>
                {isSavingLogEntry ? t('foods.saving') : t('foods.addToToday', { amount: formatFoodAmount(selectedFood, foodQuantityForId(selectedFood.id)) })}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.favoriteToggleButton,
                selectedFood.favorite && styles.favoriteToggleButtonActive
              ]}
              onPress={() => void toggleFoodFavorite(selectedFood)}
              disabled={foodFavoriteSavingId === selectedFood.id}
            >
              <Text
                style={[
                  styles.favoriteToggleButtonLabel,
                  selectedFood.favorite && styles.favoriteToggleButtonLabelActive
                ]}
              >
                {foodFavoriteSavingId === selectedFood.id ? '...' : selectedFood.favorite ? '♥' : '♡'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.detailSubtitle}>
            {selectedFood.favorite
              ? t('foods.cachedFavorite')
              : t('foods.tapHeart')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
