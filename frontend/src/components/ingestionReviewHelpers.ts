import type { IngestionOutput } from '../types';

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

export function buildAcceptedNutritionPayload(draft: EditableNutritionDraft): {
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
  };
} {
  const productName = draft.product_name.trim();
  const servingSize = draft.serving_size.trim();
  const brandName = draft.brand_name.trim();

  return {
    extracted_text: [productName, brandName, servingSize].filter(Boolean).join('\n'),
    structured_json: {
      product_name: productName,
      brand_name: brandName.length > 0 ? brandName : null,
      serving_size: servingSize || '1 serving',
      calories: Number(draft.calories),
      macros: {
        protein: Number(draft.protein),
        carbs: Number(draft.carbs),
        fat: Number(draft.fat)
      }
    }
  };
}

function formatDraftNumber(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : String(value);
}
