import { describe, expect, it } from 'vitest';

import { demoIngestionOutputs } from '../mock-data';
import { describeOutput, formatStructuredJson, pendingOutputs } from './ingestionReviewHelpers';

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
});
