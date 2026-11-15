import { describe, expect, it } from 'vitest';

import {
  contrast,
  createStabilityTracker,
  motion,
  sharpness,
  STEADY_FRAMES,
  toGray
} from './frame-stability';

function checkerboard(width: number, height: number, cell: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gray[y * width + x] = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? 230 : 20;
    }
  }
  return gray;
}

function blur(gray: Float32Array, width: number, height: number, passes: number): Float32Array {
  let current = gray;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Float32Array(current.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let total = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const yy = Math.min(height - 1, Math.max(0, y + dy));
            const xx = Math.min(width - 1, Math.max(0, x + dx));
            total += current[yy * width + xx];
            count += 1;
          }
        }
        next[y * width + x] = total / count;
      }
    }
    current = next;
  }
  return current;
}

describe('frame stability', () => {
  it('converts RGBA to grey', () => {
    expect(Array.from(toGray([255, 255, 255, 255, 0, 0, 0, 255]))).toEqual([255, 0]);
  });

  it('sharp detail scores higher than the same detail blurred', () => {
    const sharp = checkerboard(64, 48, 4);
    const soft = blur(sharp, 64, 48, 6);
    expect(sharpness(sharp, 64, 48)).toBeGreaterThan(10 * sharpness(soft, 64, 48));
  });

  it('measures motion and contrast', () => {
    const a = checkerboard(32, 32, 4);
    expect(motion(a, a)).toBe(0);
    expect(motion(null, a)).toBe(Number.POSITIVE_INFINITY);
    expect(motion(a, checkerboard(32, 32, 3))).toBeGreaterThan(20);
    expect(contrast(new Float32Array(100).fill(128))).toBe(0);
    expect(contrast(a)).toBeGreaterThan(50);
  });

  it('captures only after enough steady, sharp frames in a row', () => {
    const tracker = createStabilityTracker();
    const good = { motion: 1, sharpness: 500, contrast: 60 };
    for (let i = 1; i < STEADY_FRAMES; i += 1) {
      expect(tracker.update(good).ready).toBe(false);
    }
    expect(tracker.update(good)).toEqual({ progress: 1, ready: true, hint: 'steady' });
    // A shake starts over; blur holds back; a blank view says so.
    expect(tracker.update({ ...good, motion: 30 })).toMatchObject({ progress: 0, hint: 'hold-steady' });
    tracker.update(good);
    tracker.update(good);
    expect(tracker.update({ ...good, sharpness: 5 })).toMatchObject({ hint: 'too-blurry', ready: false });
    expect(tracker.update({ ...good, contrast: 2 })).toMatchObject({ progress: 0, hint: 'nothing-to-read' });
  });
});
