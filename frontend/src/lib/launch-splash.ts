/** Splash image size. Must match `.launch-splash img` in public/index.html (min(70vw, 300px), 600:840). */
export const SPLASH_ASPECT_RATIO = 840 / 600;
export const SPLASH_MAX_WIDTH = 300;
export const SPLASH_WIDTH_FRACTION = 0.7;

export function launchSplashSize(windowWidth: number): { width: number; height: number } {
  const width = Math.max(0, Math.min(windowWidth * SPLASH_WIDTH_FRACTION, SPLASH_MAX_WIDTH));
  return { width, height: width * SPLASH_ASPECT_RATIO };
}
