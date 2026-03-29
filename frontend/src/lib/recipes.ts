import type { RecipeDefinition } from '../types';

export function sortRecipesAlphabetically(recipes: RecipeDefinition[]): RecipeDefinition[] {
  return [...recipes].sort((left, right) => left.title.localeCompare(right.title));
}

export function filterRecipesFuzzy(recipes: RecipeDefinition[], query: string): RecipeDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return sortRecipesAlphabetically(recipes);
  }

  return [...recipes]
    .map((recipe) => ({ recipe, score: fuzzyScore(recipe, normalizedQuery) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.recipe.title.localeCompare(right.recipe.title);
    })
    .map((entry) => entry.recipe);
}

function fuzzyScore(recipe: RecipeDefinition, query: string): number {
  const title = recipe.title.toLowerCase();

  if (title === query) {
    return 500;
  }

  if (title.startsWith(query)) {
    return 400 - title.length;
  }

  const wordIndex = title.split(/[\s,.-]+/).findIndex((part) => part.startsWith(query));
  if (wordIndex >= 0) {
    return 320 - wordIndex;
  }

  if (title.includes(query)) {
    return 260 - title.indexOf(query);
  }

  const ingredientHit = recipe.ingredients.findIndex((ingredient) =>
    ingredient.name.toLowerCase().includes(query)
  );
  if (ingredientHit >= 0) {
    return 180 - ingredientHit;
  }

  let queryIndex = 0;
  let gapPenalty = 0;
  let lastMatch = -1;
  for (let index = 0; index < title.length && queryIndex < query.length; index += 1) {
    if (title[index] === query[queryIndex]) {
      if (lastMatch >= 0) {
        gapPenalty += index - lastMatch - 1;
      }
      lastMatch = index;
      queryIndex += 1;
    }
  }

  if (queryIndex === query.length) {
    return 120 - gapPenalty;
  }

  return -1;
}
