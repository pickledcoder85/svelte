/** Web only: fades out and removes the HTML launch splash layer from public/index.html. */

export const LAUNCH_SPLASH_ELEMENT_ID = 'launch-splash';
export const LAUNCH_SPLASH_FADE_MS = 200;

type SplashDocument = {
  getElementById(id: string): { classList: { add(name: string): void }; remove(): void } | null;
};

export function dismissLaunchSplash(
  doc: SplashDocument | undefined = typeof document !== 'undefined' ? document : undefined,
  schedule: (callback: () => void, ms: number) => unknown = setTimeout
): boolean {
  const splash = doc?.getElementById(LAUNCH_SPLASH_ELEMENT_ID);
  if (!splash) {
    return false;
  }
  splash.classList.add('is-hidden');
  // Remove after the CSS fade (plus a little slack) so it never blocks taps.
  schedule(() => splash.remove(), LAUNCH_SPLASH_FADE_MS + 50);
  return true;
}
