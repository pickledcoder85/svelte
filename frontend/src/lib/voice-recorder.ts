/**
 * A short voice recording for "Tell Gus what you have": the browser's own recorder (iPhone
 * Safari records audio/mp4), stopped by the user or after a minute, returned as base64 for the
 * server to turn into text. The microphone is released as soon as recording stops.
 */
export const MAX_RECORDING_MS = 60_000;

const PREFERRED_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

export function voiceSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== 'undefined' &&
    'MediaRecorder' in window
  );
}

export function pickMimeType(isSupported: (type: string) => boolean): string {
  return PREFERRED_TYPES.find((type) => isSupported(type)) ?? '';
}

export interface Recording {
  base64: string;
  mimeType: string;
  durationMs: number;
}

export interface ActiveRecording {
  /** Stop and get the audio (also stops by itself after a minute). */
  stop(): Promise<Recording>;
  /** Stop and throw the audio away. */
  cancel(): void;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the recording.'));
    reader.readAsDataURL(blob);
  });
}

/** Start recording (call from a tap: iOS asks for the microphone then). */
export async function startRecording(onAutoStop?: () => void): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let cancelled = false;
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  const finished = new Promise<Recording>((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (cancelled) {
        reject(new Error('cancelled'));
        return;
      }
      const type = recorder.mimeType || mimeType || 'audio/mp4';
      const blob = new Blob(chunks, { type });
      toBase64(blob)
        .then((base64) => resolve({ base64, mimeType: type, durationMs: Date.now() - startedAt }))
        .catch(reject);
    };
    recorder.onerror = () => reject(new Error('Recording failed.'));
  });
  finished.catch(() => undefined); // a cancel isn't an unhandled error
  recorder.start();
  const timer = setTimeout(() => {
    if (recorder.state !== 'inactive') {
      recorder.stop();
      onAutoStop?.();
    }
  }, MAX_RECORDING_MS);
  return {
    stop() {
      clearTimeout(timer);
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      return finished;
    },
    cancel() {
      clearTimeout(timer);
      cancelled = true;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };
}

/** "0:07". */
export function elapsedLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
