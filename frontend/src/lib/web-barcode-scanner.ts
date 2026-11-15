/**
 * Live barcode scanning in the browser (the iPhone PWA).
 *
 * iOS Safari has no native BarcodeDetector, so this uses the `barcode-detector` ponyfill, which
 * decodes with zxing-cpp compiled to WebAssembly. The WASM file is self-hosted at
 * /zxing/<version>/ (copied there by scripts/copy-zxing-wasm.mjs), never fetched from a CDN.
 * The library loads only when the scanner opens, so it adds nothing to app start-up.
 */
import { createReadConfirmer, guideCrop, RETAIL_BARCODE_FORMATS } from './barcode-reads';
import {
  ANALYSIS_WIDTH,
  contrast,
  createStabilityTracker,
  motion,
  sharpness,
  toGray,
  type StabilityState
} from './frame-stability';

/** Time between decode attempts, about 7 a second. */
export const SCAN_INTERVAL_MS = 140;
/** The cropped band is scaled to at most this width before decoding. */
const MAX_DECODE_WIDTH = 960;

export type BarcodeScannerHandle = { stop(): void };

export type BarcodeScannerOptions = {
  onCode(code: string): void;
  onError(message: string): void;
  /** Also capture one full frame once the view is steady and sharp (package front or label). */
  autoCapture?: {
    onProgress(state: StabilityState): void;
    onCapture(frame: Blob): void;
  };
};

/** A barcode seen this recently wins over auto-capture (let the decoder confirm it). */
const BARCODE_GRACE_MS = 1200;
const CAPTURE_QUALITY = 0.92;

type Detector = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };

let detectorPromise: Promise<Detector> | null = null;

export function zxingWasmUrl(version: string, file: string): string {
  return `/zxing/${version}/${file}`;
}

function loadDetector(): Promise<Detector> {
  detectorPromise ??= import('barcode-detector/ponyfill').then((module) => {
    module.setZXingModuleOverrides({
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? zxingWasmUrl(module.ZXING_WASM_VERSION, path) : prefix + path
    });
    return new module.BarcodeDetector({ formats: [...RETAIL_BARCODE_FORMATS] }) as Detector;
  });
  detectorPromise.catch(() => {
    detectorPromise = null; // Let a later open try again.
  });
  return detectorPromise;
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is off. Allow the camera for Relish, or take a photo instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Take a photo instead.';
  }
  return "The camera couldn't start. Take a photo instead.";
}

/** Starts the rear camera in `video` and reports the first confirmed retail barcode. */
export async function startBarcodeScanner(
  video: HTMLVideoElement,
  options: BarcodeScannerOptions
): Promise<BarcodeScannerHandle> {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stream: MediaStream | null = null;

  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
    stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };

  if (!navigator.mediaDevices?.getUserMedia) {
    options.onError("This browser can't open a live camera. Take a photo instead.");
    return { stop };
  }

  // Start the decoder download alongside the camera prompt; report whichever fails.
  const detectorReady = loadDetector();
  detectorReady.catch(() => undefined);
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      // Auto-capture sends a frame to be read, so ask for more detail (small label text).
      video: options.autoCapture
        ? { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    if (stopped) {
      stop();
      return { stop };
    }
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
  } catch (error) {
    stop();
    options.onError(cameraErrorMessage(error));
    return { stop };
  }

  let detector: Detector;
  try {
    detector = await detectorReady;
  } catch {
    stop();
    options.onError("The barcode reader couldn't load. Check your connection, or take a photo instead.");
    return { stop };
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const confirmer = createReadConfirmer();
  const tracker = createStabilityTracker();
  const analysis = document.createElement('canvas');
  const analysisContext = analysis.getContext('2d', { willReadFrequently: true });
  let previousGray: Float32Array | null = null;
  let lastBarcodeAt = Number.NEGATIVE_INFINITY;
  let capturing = false;

  const captureFrame = () => {
    capturing = true;
    const full = document.createElement('canvas');
    full.width = video.videoWidth;
    full.height = video.videoHeight;
    full.getContext('2d')?.drawImage(video, 0, 0, full.width, full.height);
    full.toBlob(
      (blob) => {
        stop();
        if (blob) {
          options.autoCapture?.onCapture(blob);
        } else {
          options.onError("The picture couldn't be captured. Take a photo instead.");
        }
      },
      'image/jpeg',
      CAPTURE_QUALITY
    );
  };

  const checkStability = (now: number) => {
    if (!options.autoCapture || !analysisContext || capturing || video.videoWidth === 0) {
      return;
    }
    analysis.width = ANALYSIS_WIDTH;
    analysis.height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * ANALYSIS_WIDTH));
    analysisContext.drawImage(video, 0, 0, analysis.width, analysis.height);
    const gray = toGray(analysisContext.getImageData(0, 0, analysis.width, analysis.height).data);
    const reading = {
      motion: motion(previousGray, gray),
      sharpness: sharpness(gray, analysis.width, analysis.height),
      contrast: contrast(gray)
    };
    previousGray = gray;
    if (now - lastBarcodeAt < BARCODE_GRACE_MS) {
      tracker.reset();
      options.autoCapture.onProgress({ progress: 0, ready: false, hint: 'hold-steady' });
      return;
    }
    const state = tracker.update(reading);
    options.autoCapture.onProgress(state);
    if (state.ready) {
      captureFrame();
    }
  };

  const tick = async () => {
    if (stopped) {
      return;
    }
    let code: string | null = null;
    if (context && video.videoWidth > 0) {
      const crop = guideCrop(video.videoWidth, video.videoHeight);
      const scale = Math.min(1, MAX_DECODE_WIDTH / crop.width);
      canvas.width = Math.round(crop.width * scale);
      canvas.height = Math.round(crop.height * scale);
      context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
      try {
        code = (await detector.detect(canvas))[0]?.rawValue ?? null;
      } catch {
        code = null;
      }
    }
    const now = performance.now();
    if (code) {
      lastBarcodeAt = now;
    }
    const confirmed = confirmer.push(code, now);
    if (confirmed && !stopped) {
      stop();
      options.onCode(confirmed);
      return;
    }
    checkStability(now);
    if (capturing || stopped) {
      return;
    }
    timer = setTimeout(() => void tick(), SCAN_INTERVAL_MS);
  };
  void tick();
  return { stop };
}
