import { describe, expect, it } from 'vitest';

import { demoIngestionOutputs } from '../mock-data';
import {
  buildAcceptedNutritionPayload,
  buildNutritionDraft,
  describeOutput,
  formatStructuredJson,
  getNutritionVariants,
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

  it('preserves variants in accepted nutrition payloads', () => {
    const payload = buildAcceptedNutritionPayload(
      {
        product_name: 'Quaker Instant Oatmeal Variety Pack',
        brand_name: 'Quaker',
        serving_size: '1 packet',
        calories: '160',
        protein: '4',
        carbs: '33',
        fat: '2.5'
      },
      {
        multiple_variants_detected: true,
        variants: [
          {
            variant_name: 'Apples & Cinnamon',
            serving_size: '1 packet',
            calories: 160,
            macros: { protein: 4, carbs: 33, fat: 2.5 }
          }
        ]
      }
    );

    expect(payload.structured_json.multiple_variants_detected).toBe(true);
    expect(payload.structured_json.variants).toHaveLength(1);
  });

  it('reads nutrition variants from structured json', () => {
    const variants = getNutritionVariants({
      variants: [
        {
          variant_name: 'Maple & Brown Sugar',
          serving_size: '1 packet',
          calories: 160,
          macros: { protein: 4, carbs: 33, fat: 2.5 }
        }
      ]
    });

    expect(variants).toHaveLength(1);
    expect(variants[0].variant_name).toBe('Maple & Brown Sugar');
  });

  it('drops the scanned weight when the serving was edited', () => {
    const payload = buildAcceptedNutritionPayload(
      { product_name: 'Bar', brand_name: '', serving_size: '1 bar (40 g)', calories: '190', protein: '4', carbs: '29', fat: '7' },
      { serving_size: '100 g', serving_grams: 100, serving_basis: 'g', barcode: '00036000291452' }
    );
    expect(payload.structured_json).not.toHaveProperty('serving_grams');
    expect(payload.structured_json).toMatchObject({ serving_size: '1 bar (40 g)', barcode: '00036000291452' });
  });

  it('keeps the scan fields the form does not edit when accepting', () => {
    const payload = buildAcceptedNutritionPayload(
      {
        product_name: 'Granola Bar',
        brand_name: 'Trail Co',
        serving_size: '1 bar (40 g)',
        calories: '190',
        protein: '4',
        carbs: '29',
        fat: '7'
      },
      {
        product_name: 'Granola bar',
        barcode: '00036000291452',
        data_source: 'open_food_facts',
        serving_grams: 40,
        attribution: 'Data from Open Food Facts (ODbL)'
      }
    );
    expect(payload.structured_json).toMatchObject({
      product_name: 'Granola Bar',
      barcode: '00036000291452',
      data_source: 'open_food_facts',
      serving_grams: 40,
      attribution: 'Data from Open Food Facts (ODbL)'
    });
  });
});
