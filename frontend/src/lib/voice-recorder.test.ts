import { describe, expect, it } from 'vitest';

import { elapsedLabel, pickMimeType } from './voice-recorder';

describe('voice recorder', () => {
  it('prefers what iPhone records, then webm', () => {
    expect(pickMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType((type) => type.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickMimeType(() => false)).toBe('');
  });

  it('shows the time recorded', () => {
    expect(elapsedLabel(7_400)).toBe('0:07');
    expect(elapsedLabel(61_000)).toBe('1:01');
  });
});
