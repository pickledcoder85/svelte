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
    .map((food) => ({ food, score: fuzzyScore(food.name, normalizedQuery) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (left.food.favorite !== right.food.favorite) {
        return left.food.favorite ? -1 : 1;
      }
      if (right.score !== left.score) {
        return right.score - left.score;
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
