/**
 * Web only: fades out and removes the HTML launch splash layer from public/index.html.
 *
 * Gherkin stays on screen for at least LAUNCH_SPLASH_MIN_MS from launch, even when the app is
 * ready sooner, so the splash is a moment rather than a flash; then he fades out gently.
 */

export const LAUNCH_SPLASH_ELEMENT_ID = 'launch-splash';
/** Matches the CSS transition on .launch-splash in public/index.html. */
export const LAUNCH_SPLASH_FADE_MS = 500;
/** Shortest time the splash shows, counted from page start. */
export const LAUNCH_SPLASH_MIN_MS = 1800;

type SplashElement = { classList: { add(name: string): void }; remove(): void };
type SplashDocument = {
  getElementById(id: string): SplashElement | null;
};

/** How long to keep the splash before fading, given the time since page start. */
export function splashHoldMs(elapsedMs: number, minimumMs: number = LAUNCH_SPLASH_MIN_MS): number {
  return Math.max(0, Math.round(minimumMs - elapsedMs));
}

export function dismissLaunchSplash(
  doc: SplashDocument | undefined = typeof document !== 'undefined' ? document : undefined,
  schedule: (callback: () => void, ms: number) => unknown = setTimeout,
  elapsedMs: number = typeof performance !== 'undefined' ? performance.now() : LAUNCH_SPLASH_MIN_MS
): boolean {
  const splash = doc?.getElementById(LAUNCH_SPLASH_ELEMENT_ID);
  if (!splash) {
    return false;
  }
  const fade = () => {
    splash.classList.add('is-hidden');
    // Remove after the CSS fade (plus a little slack) so it never blocks taps.
    schedule(() => splash.remove(), LAUNCH_SPLASH_FADE_MS + 50);
  };
  const hold = splashHoldMs(elapsedMs);
  if (hold > 0) {
    schedule(fade, hold);
  } else {
    fade();
  }
  return true;
}
