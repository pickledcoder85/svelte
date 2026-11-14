/** Splash image size. Must match `.launch-splash img` in public/index.html (min(70vw, 300px), 600:840). */
export const SPLASH_ASPECT_RATIO = 840 / 600;
export const SPLASH_MAX_WIDTH = 300;
export const SPLASH_WIDTH_FRACTION = 0.7;

export function launchSplashSize(windowWidth: number): { width: number; height: number } {
  const width = Math.max(0, Math.min(windowWidth * SPLASH_WIDTH_FRACTION, SPLASH_MAX_WIDTH));
  return { width, height: width * SPLASH_ASPECT_RATIO };
}

/** How long launch waits for the display font before showing the app with a fallback font. */
export const FONT_WAIT_MS = 2000;

/**
 * Keep the launch splash up until the display font is ready, so headings do not pop in after
 * the rest of the screen. A font error or the wait cap releases it, so launch never hangs.
 */
export function holdSplashForFonts(input: { fontLoaded: boolean; fontError: boolean; waitExpired: boolean }): boolean {
  return !input.fontLoaded && !input.fontError && !input.waitExpired;
}
