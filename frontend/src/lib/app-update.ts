/**
 * Picking up a new deploy in the installed app. iOS resumes a home-screen web app from memory
 * instead of relaunching it, so a deploy isn't seen until the app is closed. Each deploy changes
 * the app's script name (AppEntry-<hash>.js), so on returning to the app Relish fetches a fresh
 * index.html and compares the script it names with the one running. When they differ it reloads,
 * but only when nothing is in progress (no sheet open, not typing, not in setup); otherwise it
 * waits until that's done.
 */

/** Asks the service worker to pass the request straight to the network (see public/sw.js). */
export const UPDATE_CHECK_PARAM = 'relish-update-check';
/** At most one check this often (returning to the app twice in a row checks once). */
export const MIN_CHECK_INTERVAL_MS = 60_000;

const BUNDLE = /\/_expo\/static\/js\/web\/AppEntry-([0-9a-f]+)\.js/;

/** The app script's hash named in a page, or null. */
export function bundleHash(text: string): string | null {
  return text.match(BUNDLE)?.[1] ?? null;
}

/** The hash of the script this page is running, or null (a development build has none). */
export function loadedBundleHash(doc: Pick<Document, 'querySelectorAll'> | undefined = typeof document !== 'undefined' ? document : undefined): string | null {
  if (!doc) {
    return null;
  }
  for (const script of Array.from(doc.querySelectorAll('script[src]'))) {
    const hash = bundleHash(script.getAttribute('src') ?? '');
    if (hash) {
      return hash;
    }
  }
  return null;
}

/** The hash in the deployed index.html, fresh from the server; null when it can't be read. */
export async function latestBundleHash(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(`/?${UPDATE_CHECK_PARAM}=1`, { cache: 'no-store', credentials: 'same-origin' });
    return response.ok ? bundleHash(await response.text()) : null;
  } catch {
    return null; // offline: try again next time
  }
}

export type UpdateDecision = 'none' | 'reload' | 'wait';

export function updateDecision(loaded: string | null, latest: string | null, busy: boolean): UpdateDecision {
  if (!loaded || !latest || loaded === latest) {
    return 'none';
  }
  return busy ? 'wait' : 'reload';
}

/** Typing in a field (a reload would lose what's typed). */
export function isTyping(doc: Pick<Document, 'activeElement'> | undefined = typeof document !== 'undefined' ? document : undefined): boolean {
  const element = doc?.activeElement as HTMLElement | null | undefined;
  if (!element) {
    return false;
  }
  const tag = element.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean(element.isContentEditable);
}
