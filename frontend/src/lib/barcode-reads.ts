/**
 * Live barcode reads are noisy: a blurry frame can decode to a wrong but valid-looking code.
 * A code is only trusted after the same value comes back on consecutive frames.
 */

export const REQUIRED_MATCHING_READS = 2;
/** Matching reads further apart than this start over (the phone probably moved). */
export const READ_WINDOW_MS = 1500;

/** Retail product formats. QR codes and shipping codes are ignored. */
export const RETAIL_BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;

export type ReadConfirmer = {
  /** Record one frame's read; returns the code once it is confirmed, otherwise null. */
  push(code: string | null, atMs: number): string | null;
  reset(): void;
};

export function createReadConfirmer(
  required: number = REQUIRED_MATCHING_READS,
  windowMs: number = READ_WINDOW_MS
): ReadConfirmer {
  let candidate: string | null = null;
  let count = 0;
  let lastAt = 0;

  return {
    push(code, atMs) {
      if (!code) {
        // A frame with no read does not break a streak; only time or a different code does.
        return null;
      }
      if (code === candidate && atMs - lastAt <= windowMs) {
        count += 1;
      } else {
        candidate = code;
        count = 1;
      }
      lastAt = atMs;
      return count >= required ? code : null;
    },
    reset() {
      candidate = null;
      count = 0;
      lastAt = 0;
    }
  };
}

/** The guide band of a video frame to decode: centred, most of the width, a third of the height. */
export function guideCrop(videoWidth: number, videoHeight: number): { x: number; y: number; width: number; height: number } {
  const width = Math.round(videoWidth * 0.9);
  const height = Math.round(Math.min(videoHeight * 0.4, width * 0.6));
  return {
    x: Math.round((videoWidth - width) / 2),
    y: Math.round((videoHeight - height) / 2),
    width,
    height
  };
}

/** Smart mode's taller frame (86% wide, 4:5): barcodes anywhere in it are decoded. */
export function smartGuideCrop(videoWidth: number, videoHeight: number): { x: number; y: number; width: number; height: number } {
  const width = Math.round(videoWidth * 0.86);
  const height = Math.round(Math.min(videoHeight * 0.9, width / 0.8));
  return {
    x: Math.round((videoWidth - width) / 2),
    y: Math.round((videoHeight - height) / 2),
    width,
    height
  };
}
