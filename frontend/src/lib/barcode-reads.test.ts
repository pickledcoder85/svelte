import { describe, expect, it } from 'vitest';

import { createReadConfirmer, guideCrop } from './barcode-reads';

describe('barcode read confirmation', () => {
  it('confirms a code after two matching reads', () => {
    const confirmer = createReadConfirmer();
    expect(confirmer.push('036000291452', 0)).toBeNull();
    expect(confirmer.push('036000291452', 140)).toBe('036000291452');
  });

  it('starts over when a different code is read', () => {
    const confirmer = createReadConfirmer();
    confirmer.push('036000291452', 0);
    expect(confirmer.push('036000291453', 140)).toBeNull();
    expect(confirmer.push('036000291452', 280)).toBeNull();
    expect(confirmer.push('036000291452', 420)).toBe('036000291452');
  });

  it('ignores empty frames but not long gaps', () => {
    const confirmer = createReadConfirmer();
    confirmer.push('036000291452', 0);
    expect(confirmer.push(null, 140)).toBeNull();
    expect(confirmer.push('036000291452', 280)).toBe('036000291452');

    const slow = createReadConfirmer();
    slow.push('036000291452', 0);
    expect(slow.push('036000291452', 2000)).toBeNull();
    expect(slow.push('036000291452', 2100)).toBe('036000291452');
  });

  it('forgets everything on reset', () => {
    const confirmer = createReadConfirmer();
    confirmer.push('036000291452', 0);
    confirmer.reset();
    expect(confirmer.push('036000291452', 100)).toBeNull();
  });
});

describe('guide crop', () => {
  it('takes a centred band of the frame', () => {
    expect(guideCrop(1280, 720)).toEqual({ x: 64, y: 216, width: 1152, height: 288 });
    // Portrait frames: the band is limited by width, not height.
    expect(guideCrop(720, 1280)).toEqual({ x: 36, y: 446, width: 648, height: 389 });
  });
});
