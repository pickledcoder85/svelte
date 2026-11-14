import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// iOS Safari zooms into text fields under 16px when tapped and leaves the page zoomed.
describe('iOS input zoom guard', () => {
  it('keeps text fields at 16px or more on touch screens', () => {
    const html = readFileSync(resolve(__dirname, '../../public/index.html'), 'utf8');
    expect(html).toMatch(/@media \(pointer: coarse\)\s*\{\s*input,\s*textarea,\s*select\s*\{\s*font-size: max\(16px, 1em\) !important;/);
  });

  it('does not block pinch zoom in the viewport', () => {
    const html = readFileSync(resolve(__dirname, '../../public/index.html'), 'utf8');
    expect(html).not.toMatch(/maximum-scale|user-scalable=no/);
  });
});
