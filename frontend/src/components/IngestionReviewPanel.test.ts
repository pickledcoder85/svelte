import { describe, expect, it } from 'vitest';

import { demoIngestionOutputs } from '../mock-data';
import {
  buildAcceptedNutritionPayload,
  buildNutritionDraft,
  describeOutput,
  formatStructuredJson,
  pendingOutputs
} from './ingestionReviewHelpers';

describe('ingestion review helpers', () => {
  it('filters pending outputs for the queue list', () => {
    const pending = pendingOutputs(demoIngestionOutputs);

    expect(pending).toHaveLength(2);
    expect(pending.every((output) => output.review_state === 'pending')).toBe(true);
  });

  it('describes outputs from structured json before extracted text', () => {
    expect(describeOutput(demoIngestionOutputs[0])).toBe('Rolled oats');
    expect(describeOutput(demoIngestionOutputs[2])).toBe('Summer Berry Parfait');
  });

  it('formats structured json for display', () => {
    expect(formatStructuredJson(null)).toBe('No structured JSON captured.');
    expect(formatStructuredJson({ product_name: 'Greek yogurt' })).toContain('Greek yogurt');
  });

  it('builds an editable nutrition draft from structured json', () => {
    const draft = buildNutritionDraft(demoIngestionOutputs[0].structured_json);

    expect(draft.product_name).toBe('Rolled oats');
    expect(draft.serving_size).toBe('1 cup (80g)');
    expect(draft.calories).toBe('300');
    expect(draft.protein).toBe('10');
  });

  it('builds an accepted nutrition payload from a review draft', () => {
    const payload = buildAcceptedNutritionPayload({
      product_name: 'Test protein bar',
      brand_name: 'Codex Foods',
      serving_size: '1 bar',
      calories: '220',
      protein: '20',
      carbs: '24',
      fat: '7'
    });

    expect(payload.extracted_text).toContain('Test protein bar');
    expect(payload.structured_json).toEqual({
      product_name: 'Test protein bar',
      brand_name: 'Codex Foods',
      serving_size: '1 bar',
      calories: 220,
      macros: { protein: 20, carbs: 24, fat: 7 }
    });
  });
});
