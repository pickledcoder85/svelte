/**
 * Auto-capture for the scanner: is the picture steady and sharp enough to send?
 *
 * Runs on the phone on a small grey copy of each frame (free; nothing is sent). Motion is the
 * average change between two frames; sharpness is the variance of the Laplacian (edges are
 * crisp when it's high, smeared when it's low); contrast rules out a blank wall or the dark.
 * It first waits for something to be brought into view (a big change in the picture), so a
 * table or room that happens to be still is never captured; then, once enough steady, sharp
 * frames in a row are seen, one full frame is captured.
 */
import type { TFunction } from '../i18n/translate';

export const ANALYSIS_WIDTH = 240;
/** Average brightness change (0–255) between frames that still counts as holding still. */
export const MOTION_MAX = 7;
/** Laplacian variance below this is blurry at ANALYSIS_WIDTH. */
export const SHARPNESS_MIN = 60;
/** Brightness spread below this is a blank or dark view, not a package. */
export const CONTRAST_MIN = 18;
/** Steady frames in a row before capture (about a second at 7 frames a second). */
export const STEADY_FRAMES = 7;
/** A change this big (bringing the package into view) arms the capture. */
export const ARM_MOTION = 16;

export function toGray(rgba: ArrayLike<number>): Float32Array {
  const gray = new Float32Array(rgba.length / 4);
  for (let i = 0, p = 0; p < gray.length; i += 4, p += 1) {
    gray[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return gray;
}

export function sharpness(gray: Float32Array, width: number, height: number): number {
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const value = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += value;
      sumSquares += value * value;
      count += 1;
    }
  }
  if (count === 0) {
    return 0;
  }
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

export function contrast(gray: Float32Array): number {
  if (gray.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of gray) {
    sum += value;
  }
  const mean = sum / gray.length;
  let variance = 0;
  for (const value of gray) {
    variance += (value - mean) ** 2;
  }
  return Math.sqrt(variance / gray.length);
}

export function motion(previous: Float32Array | null, current: Float32Array): number {
  if (!previous || previous.length !== current.length || current.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  let total = 0;
  for (let i = 0; i < current.length; i += 1) {
    total += Math.abs(current[i] - previous[i]);
  }
  return total / current.length;
}

export interface FrameReading {
  motion: number;
  sharpness: number;
  contrast: number;
}

export type StabilityHint = 'bring-it-in' | 'hold-steady' | 'too-blurry' | 'nothing-to-read' | 'steady';

export interface StabilityState {
  /** 0–1, for the ring. */
  progress: number;
  ready: boolean;
  hint: StabilityHint;
}

/**
 * Waits for something to be brought into view, then counts steady, sharp frames. A big shake
 * starts over, a small wobble or a blurry frame only steps back, so the count doesn't flicker.
 */
export function createStabilityTracker(needed = STEADY_FRAMES) {
  let steady = 0;
  let armed = false;
  return {
    update(reading: FrameReading): StabilityState {
      let hint: StabilityHint;
      if (!armed) {
        if (Number.isFinite(reading.motion) && reading.motion >= ARM_MOTION) {
          armed = true;
        }
        return { progress: 0, ready: false, hint: 'bring-it-in' };
      }
      if (reading.contrast < CONTRAST_MIN) {
        steady = 0;
        hint = 'nothing-to-read';
      } else if (reading.motion > MOTION_MAX * 2) {
        steady = 0;
        hint = 'hold-steady';
      } else if (reading.motion > MOTION_MAX) {
        steady = Math.max(0, steady - 1);
        hint = 'hold-steady';
      } else if (reading.sharpness < SHARPNESS_MIN) {
        steady = Math.max(0, steady - 1);
        hint = 'too-blurry';
      } else {
        steady = Math.min(needed, steady + 1);
        hint = 'steady';
      }
      return { progress: steady / needed, ready: steady >= needed, hint };
    },
    /** Start over (a barcode came into view): keep waiting for steadiness, still armed. */
    reset() {
      steady = 0;
    }
  };
}

export function hintText(hint: StabilityHint, t: TFunction): string {
  switch (hint) {
    case 'bring-it-in':
      return t('scan.scanner.hints.bringItIn');
    case 'hold-steady':
      return t('scan.scanner.hints.holdSteady');
    case 'too-blurry':
      return t('scan.scanner.hints.tooBlurry');
    case 'nothing-to-read':
      return t('scan.scanner.hints.nothingToRead');
    default:
      return t('scan.scanner.hints.holdStill');
  }
}
