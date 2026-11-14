export type EntryMode = 'live' | 'preview';

/**
 * Picks what a screen shows when it has no live data. Preview mode shows demo data;
 * live mode (or an undecided mode) shows the empty value so made-up numbers are
 * never presented as the user's own.
 */
export function fallbackForMode<T>(entryMode: EntryMode | null, previewValue: T, liveValue: T): T {
  return entryMode === 'preview' ? previewValue : liveValue;
}

/** Builds the error text for a live load that failed, without claiming demo data is shown. */
export function liveLoadErrorMessage(error: unknown, subject: string): string {
  const detail = error instanceof Error && error.message.trim() ? error.message.trim() : null;
  const base = `${subject} could not be loaded.`;
  return detail ? `${base} ${detail}` : `${base} Check your connection and try again.`;
}
