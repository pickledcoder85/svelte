import { describe, expect, it } from 'vitest';
import { buildApiUrl, normalizeApiBaseUrl } from './api';

describe('api helpers', () => {
  it('normalizes base urls', () => {
    expect(normalizeApiBaseUrl('http://localhost:8000/api/')).toBe('http://localhost:8000/api');
    expect(normalizeApiBaseUrl('')).toBe('http://localhost:8000/api');
  });

  it('builds absolute api urls', () => {
    expect(buildApiUrl('/nutrition/weekly-metrics')).toBe('http://localhost:8000/api/nutrition/weekly-metrics');
  });
});
