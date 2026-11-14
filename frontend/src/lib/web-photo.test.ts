import { describe, expect, it } from 'vitest';

import { MAX_PHOTO_DIMENSION, dataUrlToBase64, fitWithin } from './web-photo';

describe('web photo helpers', () => {
  it('shrinks large iPhone photos to the max dimension, keeping the aspect ratio', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_PHOTO_DIMENSION, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: MAX_PHOTO_DIMENSION });
    expect(fitWithin(8064, 6048, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('never enlarges small photos', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('handles empty and extreme sizes', () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(16000, 10)).toEqual({ width: 1600, height: 1 });
  });

  it('strips data URL prefixes', () => {
    expect(dataUrlToBase64('data:image/jpeg;base64,/9j/4AAQ')).toBe('/9j/4AAQ');
    expect(dataUrlToBase64('/9j/4AAQ')).toBe('/9j/4AAQ');
  });
});
