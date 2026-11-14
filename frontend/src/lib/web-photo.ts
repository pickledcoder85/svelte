/**
 * Web (iPhone PWA) photo capture for scans.
 *
 * Uses a file input with `capture="environment"`, which opens the iPhone's own camera screen.
 * That avoids getUserMedia, whose permission iOS re-asks on every launch of a home-screen
 * app, and it returns a full-resolution still, which reads small label print better than a
 * video frame. Photos are downscaled and re-encoded as JPEG before upload: that turns HEIC
 * into a format the server accepts and keeps requests small.
 */

export const MAX_PHOTO_DIMENSION = 1600;
export const PHOTO_JPEG_QUALITY = 0.75;

export type PreparedPhoto = {
  base64: string;
  width: number;
  height: number;
};

/** Scales (width, height) to fit within `max` on the longest side, never enlarging. */
export function fitWithin(width: number, height: number, max: number = MAX_PHOTO_DIMENSION): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Strips the `data:<type>;base64,` prefix from a data URL. */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/**
 * Opens the camera (or photo library, the user's choice on iOS) and resolves with the chosen
 * file, or null if the user cancels. Must be called directly from a tap handler.
 */
export function pickPhotoFromCamera(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    input.style.opacity = '0';

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // Safari 17+ fires `cancel` when the camera sheet is dismissed.
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

async function decodeImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall back to an <img> element below (older Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url)
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error('This photo could not be read. Try taking it again.');
  }
}

/** Downscales a photo to MAX_PHOTO_DIMENSION and returns JPEG base64 (no data-URL prefix). */
export async function prepareScanPhoto(file: Blob): Promise<PreparedPhoto> {
  const decoded = await decodeImage(file);
  try {
    const size = fitWithin(decoded.width, decoded.height);
    if (size.width === 0) {
      throw new Error('This photo is empty. Try taking it again.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('This browser cannot prepare photos for scanning.');
    }
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    const base64 = dataUrlToBase64(canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY));
    // Free the canvas backing store right away; iOS caps total canvas memory.
    canvas.width = 0;
    canvas.height = 0;
    return { base64, width: size.width, height: size.height };
  } finally {
    decoded.release();
  }
}
