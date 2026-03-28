import type { IngestionOutput } from '../types';

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
