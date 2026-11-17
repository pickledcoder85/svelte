import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import { toneColor } from '../lib/app-format';
import { foodMacroLine, formatFoodAmount, formatFoodQuantity, formatFoodReference } from '../lib/foods';
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
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Your foods</Text>
      <Text style={styles.panelDetail}>Your food bank and favorites first; searching also finds USDA foods. ✕ removes a food from your bank.</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={foodDraft}
          onChangeText={setFoodDraft}
          placeholder="Search yogurt, oats, blueberries..."
          placeholderTextColor={tc.fg_7c8aa5}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
          <Pressable style={styles.primaryButton} onPress={submitFoodSearch}>
          <Text style={styles.primaryButtonLabel}>{isSubmittingSearch ? '...' : 'Refresh'}</Text>
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
                      {(food.brand ?? 'Unbranded')} · {food.source} · {food.favorite ? 'Favorite' : 'Search match'}
                    </Text>
                  </View>
                  <Text style={styles.listMetric}>{food.calories} kcal</Text>
                </View>

                <View style={styles.foodCardMetaRow}>
                  <Text style={styles.foodCardChip}>{`Base ${formatFoodReference(food)}`}</Text>
                  <Text style={styles.foodCardChip}>{`Qty ${formatFoodQuantity(quantity)}`}</Text>
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
                      {isSavingLogEntry ? 'Saving...' : `Add ${formatFoodAmount(food, foodQuantityForId(food.id))} to today`}
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
                      accessibilityLabel={confirmDeleteKey === `bank:${food.id}` ? `Confirm removing ${food.name}` : `Remove ${food.name} from your food bank`}
                    >
                      <Text style={[styles.todayRemoveLabel, confirmDeleteKey === `bank:${food.id}` && styles.todayRemoveConfirmLabel]}>
                        {confirmDeleteKey === `bank:${food.id}` ? 'Remove?' : '✕'}
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
                {selectedFood.brand ?? 'Unbranded'} · {selectedFood.source}
              </Text>
            </View>
            <Text style={styles.detailSubtitle}>{selectedFood.favorite ? 'Favorite' : 'Search match'}</Text>
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="Calories" value={`${selectedFood.calories}`} compact />
            <MetricTile label="Macros" value={foodMacroLine(selectedFood)} compact />
          </View>
          <View style={styles.foodCardMetaRow}>
            <Text style={styles.foodCardChip}>{`Base ${formatFoodReference(selectedFood)}`}</Text>
            <Text style={styles.foodCardChip}>{`Qty ${formatFoodQuantity(foodQuantityForId(selectedFood.id))}`}</Text>
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
                {isSavingLogEntry ? 'Saving...' : `Add ${formatFoodAmount(selectedFood, foodQuantityForId(selectedFood.id))} to today`}
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
              ? 'Already cached in this session’s favorite foods.'
              : 'Tap the heart to save this search result into favorites.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
