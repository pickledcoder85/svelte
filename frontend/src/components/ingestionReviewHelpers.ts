import type { FoodItem, IngestionOutput, VisionNutritionVariant } from '../types';

export interface EditableNutritionDraft {
  product_name: string;
  brand_name: string;
  serving_size: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export function pendingOutputs(outputs: IngestionOutput[]): IngestionOutput[] {
  return outputs.filter((output) => output.review_state === 'pending');
}

export function describeOutput(output: IngestionOutput): string {
  if (typeof output.structured_json === 'object' && output.structured_json !== null) {
    const payload = output.structured_json as Record<string, unknown>;
    const title = payload.product_name || payload.title;
    if (typeof title === 'string' && title.trim().length > 0) {
      return title;
    }
  }

  if (typeof output.extracted_text === 'string' && output.extracted_text.trim().length > 0) {
    return output.extracted_text.trim().split('\n')[0].slice(0, 48);
  }

  return output.id;
}

export function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatStructuredJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'No structured JSON captured.';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function buildNutritionDraft(value: unknown): EditableNutritionDraft {
  if (typeof value !== 'object' || value === null) {
    return {
      product_name: '',
      brand_name: '',
      serving_size: '1 serving',
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    };
  }

  const payload = value as {
    product_name?: unknown;
    brand_name?: unknown;
    serving_size?: unknown;
    calories?: unknown;
    protein?: unknown;
    carbs?: unknown;
    fat?: unknown;
    macros?: { protein?: unknown; carbs?: unknown; fat?: unknown } | unknown;
  };
  const macros =
    typeof payload.macros === 'object' && payload.macros !== null
      ? (payload.macros as { protein?: unknown; carbs?: unknown; fat?: unknown })
      : null;

  return {
    product_name: typeof payload.product_name === 'string' ? payload.product_name : '',
    brand_name: typeof payload.brand_name === 'string' ? payload.brand_name : '',
    serving_size: typeof payload.serving_size === 'string' ? payload.serving_size : '1 serving',
    calories: formatDraftNumber(payload.calories),
    protein: formatDraftNumber(macros?.protein ?? payload.protein),
    carbs: formatDraftNumber(macros?.carbs ?? payload.carbs),
    fat: formatDraftNumber(macros?.fat ?? payload.fat)
  };
}

export function buildAcceptedNutritionPayload(draft: EditableNutritionDraft, currentStructuredJson?: unknown): {
  extracted_text: string;
  structured_json: {
    product_name: string;
    brand_name: string | null;
    serving_size: string;
    calories: number;
    macros: {
      protein: number;
      carbs: number;
      fat: number;
    };
    multiple_variants_detected?: boolean;
    variants?: VisionNutritionVariant[];
  };
} {
  const productName = draft.product_name.trim();
  const servingSize = draft.serving_size.trim();
  const brandName = draft.brand_name.trim();

  const existing =
    typeof currentStructuredJson === 'object' && currentStructuredJson !== null
      ? (currentStructuredJson as {
          multiple_variants_detected?: unknown;
          variants?: unknown;
        })
      : null;
  const variants = Array.isArray(existing?.variants) ? (existing.variants as VisionNutritionVariant[]) : undefined;

  // Keep every field from the scan (barcode, data source, serving weight, attribution) and
  // override only what the form edits.
  const kept: Record<string, unknown> =
    typeof currentStructuredJson === 'object' && currentStructuredJson !== null && !Array.isArray(currentStructuredJson)
      ? { ...(currentStructuredJson as Record<string, unknown>) }
      : {};
  // A changed serving makes the scanned weight wrong; the server reads it from the new text.
  if (typeof kept.serving_size === 'string' && kept.serving_size.trim() !== servingSize) {
    delete kept.serving_grams;
    delete kept.serving_basis;
    delete kept.servings_per_container;
    delete kept.net_weight_grams;
  }

  return {
    extracted_text: [productName, brandName, servingSize].filter(Boolean).join('\n'),
    structured_json: {
      ...kept,
      product_name: productName,
      brand_name: brandName.length > 0 ? brandName : null,
      serving_size: servingSize || '1 serving',
      calories: Number(draft.calories),
      macros: {
        protein: Number(draft.protein),
        carbs: Number(draft.carbs),
        fat: Number(draft.fat)
      },
      ...(existing?.multiple_variants_detected === true ? { multiple_variants_detected: true } : {}),
      ...(variants && variants.length > 0 ? { variants } : {})
    }
  };
}

export function getNutritionVariants(value: unknown): VisionNutritionVariant[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const payload = value as { variants?: unknown };
  if (!Array.isArray(payload.variants)) {
    return [];
  }
  return payload.variants.filter((variant): variant is VisionNutritionVariant => {
    if (typeof variant !== 'object' || variant === null) {
      return false;
    }
    const item = variant as Partial<VisionNutritionVariant>;
    return (
      typeof item.variant_name === 'string' &&
      typeof item.serving_size === 'string' &&
      typeof item.calories === 'number' &&
      typeof item.macros === 'object' &&
      item.macros !== null
    );
  });
}

function formatDraftNumber(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : String(value);
}

/** How a scan got its nutrition, for the review screen. */
export interface MatchInfo {
  /** 'match': guessed from the package name; 'missing': a package front with no match found. */
  kind: 'match' | 'missing' | null;
  note: string | null;
  alternatives: Array<Record<string, unknown>>;
}

const MATCH_FIELDS = [
  'product_name',
  'brand_name',
  'serving_size',
  'calories',
  'macros',
  'serving_grams',
  'serving_basis',
  'data_source',
  'attribution',
  'food_id'
] as const;

const SOURCE_NAMES: Record<string, string> = {
  food_bank: 'your food bank',
  open_food_facts: 'Open Food Facts',
  usda: 'USDA'
};

export function matchInfo(value: unknown): MatchInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { kind: null, note: null, alternatives: [] };
  }
  const payload = value as Record<string, unknown>;
  const alternatives = Array.isArray(payload.alternatives)
    ? (payload.alternatives.filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>)
    : [];
  if (payload.nutrition_from === 'match') {
    return { kind: 'match', note: typeof payload.match_note === 'string' ? payload.match_note : null, alternatives };
  }
  if (payload.nutrition_found === false) {
    return { kind: 'missing', note: null, alternatives: [] };
  }
  return { kind: null, note: null, alternatives: [] };
}

/** Switch a matched scan to one of its alternatives; the previous match becomes an alternative. */
export function applyAlternative(value: unknown, index: number): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const payload = value as Record<string, unknown>;
  const { alternatives } = matchInfo(payload);
  const chosen = alternatives[index];
  if (!chosen) {
    return value;
  }
  const previous: Record<string, unknown> = {};
  for (const field of MATCH_FIELDS) {
    if (field === 'food_id') {
      previous.food_id = payload.matched_food_id ?? null;
    } else if (field in payload) {
      previous[field] = payload[field];
    }
  }
  // A food-bank match is stored without a data_source; remember where it came from.
  const previousId = typeof payload.matched_food_id === 'string' ? payload.matched_food_id : '';
  if (!previous.data_source && previousId && !previousId.startsWith('usda-') && !previousId.startsWith('off-')) {
    previous.data_source = 'food_bank';
  }
  const next: Record<string, unknown> = { ...payload };
  for (const field of MATCH_FIELDS) {
    if (field !== 'food_id') {
      next[field] = chosen[field] ?? null;
    }
  }
  next.matched_food_id = chosen.food_id ?? null;
  const source = SOURCE_NAMES[String(chosen.data_source ?? '')] ?? 'a food database';
  next.match_note = `Matched to ${String(chosen.product_name ?? 'this food')} from ${source}. Check it against the label, or scan the nutrition label for the exact numbers.`;
  next.alternatives = [previous, ...alternatives.filter((_, position) => position !== index)];
  return next;
}

export function describeAlternative(alternative: Record<string, unknown>): string {
  const name = [alternative.brand_name, alternative.product_name].filter((part) => typeof part === 'string' && part).join(' ');
  const calories = typeof alternative.calories === 'number' ? ` · ${Math.round(alternative.calories)} kcal` : '';
  return `${name || 'Food'}${calories}`;
}

/** A scan's reading as a food to show on the add sheet before anything is saved. */
export function previewFoodFromScan(value: unknown): FoodItem | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const draft = buildNutritionDraft(value);
  const calories = Number(draft.calories);
  if (!draft.calories || !Number.isFinite(calories)) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const grams = typeof payload.serving_grams === 'number' && payload.serving_grams > 0 ? payload.serving_grams : null;
  return {
    id: 'scan-preview',
    name: draft.product_name || 'Scanned food',
    brand: draft.brand_name || null,
    calories,
    serving_size: 1,
    serving_unit: 'serving',
    serving_text: draft.serving_size || null,
    serving_grams: grams,
    serving_basis: grams ? (payload.serving_basis === 'ml' ? 'ml' : 'g') : null,
    macros: { protein: Number(draft.protein) || 0, carbs: Number(draft.carbs) || 0, fat: Number(draft.fat) || 0 },
    source: payload.data_source === 'open_food_facts' ? 'OPEN_FOOD_FACTS' : payload.data_source === 'usda' ? 'USDA' : 'LABEL_SCAN',
    favorite: false,
    in_bank: false,
    per_100g_only: payload.per_100g_only === true
  };
}
