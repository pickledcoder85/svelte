/** Service worker registration for the installed web app (production builds only). */

export function shouldRegisterServiceWorker(input: {
  platform: string;
  isDevelopmentBuild: boolean;
  hasServiceWorker: boolean;
  protocol: string;
  hostname: string;
}): boolean {
  if (input.platform !== 'web' || input.isDevelopmentBuild || !input.hasServiceWorker) {
    return false;
  }
  // Browsers only allow service workers in secure contexts.
  return input.protocol === 'https:' || input.hostname === 'localhost' || input.hostname === '127.0.0.1';
}

export function registerServiceWorker(platform: string, isDevelopmentBuild: boolean): void {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const loc = typeof window !== 'undefined' ? window.location : undefined;
  if (
    !nav ||
    !loc ||
    !shouldRegisterServiceWorker({
      platform,
      isDevelopmentBuild,
      hasServiceWorker: 'serviceWorker' in nav,
      protocol: loc.protocol,
      hostname: loc.hostname
    })
  ) {
    return;
  }
  // A failed registration only means no offline shell; the app still works online.
  nav.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
}
