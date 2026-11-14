import type { FoodItem } from '../types';

export function selectFoodById(foods: FoodItem[], selectedId: string | null): FoodItem | null {
  if (selectedId) {
    const match = foods.find((food) => food.id === selectedId);
    if (match) {
      return match;
    }
  }

  return foods[0] ?? null;
}

export function foodMacroLine(food: FoodItem): string {
  return `${food.macros.protein}P / ${food.macros.carbs}C / ${food.macros.fat}F`;
}

export function formatFoodReference(food: FoodItem): string {
  return `${food.serving_size.toLocaleString()} ${food.serving_unit}`;
}

export function clampFoodQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.max(0.5, Math.min(10, Math.round(quantity * 10) / 10));
}

export function formatFoodQuantity(quantity: number): string {
  return `${clampFoodQuantity(quantity).toFixed(1)}×`;
}

export function calculateFoodGrams(food: FoodItem, quantity: number): number {
  return Math.round(food.serving_size * clampFoodQuantity(quantity) * 10) / 10;
}

export function sortFoodsAlphabetically(foods: FoodItem[]): FoodItem[] {
  return [...foods].sort((left, right) => left.name.localeCompare(right.name));
}

export function sortFoodsForPicker(foods: FoodItem[]): FoodItem[] {
  return [...foods].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export function mergeFoodsById(...groups: FoodItem[][]): FoodItem[] {
  const merged = new Map<string, FoodItem>();
  groups.flat().forEach((food) => {
    const current = merged.get(food.id);
    merged.set(food.id, current ? { ...current, ...food, favorite: current.favorite || food.favorite } : food);
  });
  return [...merged.values()];
}

export function filterFoodsFuzzy(foods: FoodItem[], query: string): FoodItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return sortFoodsForPicker(foods);
  }

  return [...foods]
    .map((food) => ({
      food,
      score: Math.max(
        fuzzyScore(food.name, normalizedQuery),
        food.brand ? fuzzyScore(food.brand, normalizedQuery) - 5 : -1
      )
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.food.favorite !== right.food.favorite) {
        return left.food.favorite ? -1 : 1;
      }

      return left.food.name.localeCompare(right.food.name);
    })
    .map((entry) => entry.food);
}

function fuzzyScore(name: string, query: string): number {
  const normalizedName = name.toLowerCase();

  if (normalizedName === query) {
    return 400;
  }

  if (normalizedName.startsWith(query)) {
    return 300 - normalizedName.length;
  }

  const wordIndex = normalizedName.split(/[\s,.-]+/).findIndex((part) => part.startsWith(query));
  if (wordIndex >= 0) {
    return 250 - wordIndex;
  }

  if (normalizedName.includes(query)) {
    return 200 - normalizedName.indexOf(query);
  }

  let queryIndex = 0;
  let gapPenalty = 0;
  let lastMatch = -1;
  for (let i = 0; i < normalizedName.length && queryIndex < query.length; i += 1) {
    if (normalizedName[i] === query[queryIndex]) {
      if (lastMatch >= 0) {
        gapPenalty += i - lastMatch - 1;
      }
      lastMatch = i;
      queryIndex += 1;
    }
  }

  if (queryIndex === query.length) {
    return 100 - gapPenalty;
  }

  return -1;
}

const GRAM_UNITS = new Set(['g', 'gram', 'grams']);
const MILLILITRE_UNITS = new Set(['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']);

/**
 * Describes how much of a food a quantity means, in the food's own unit.
 *
 * USDA and seeded foods are measured in grams ("150 g"); label scans are measured in their
 * serving unit ("1 × can (355mL)"). The logged entry's `grams` field holds the serving
 * amount, so it is only a weight when the unit is grams.
 */
export function formatFoodAmount(food: Pick<FoodItem, 'serving_size' | 'serving_unit'>, quantity: number): string {
  const unit = (food.serving_unit ?? '').trim();
  const amount = Math.round(food.serving_size * clampFoodQuantity(quantity) * 10) / 10;
  const normalized = unit.toLowerCase();
  if (!unit || GRAM_UNITS.has(normalized)) {
    return `${amount.toLocaleString()} g`;
  }
  if (MILLILITRE_UNITS.has(normalized)) {
    return `${amount.toLocaleString()} ml`;
  }
  const servings = Math.round(clampFoodQuantity(quantity) * 10) / 10;
  return `${servings.toLocaleString()} × ${unit}`;
}
