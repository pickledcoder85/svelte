/* Relish service worker: caches the app shell only. Never caches /api (personal data). */
/* Served with Cache-Control: no-cache, so a changed file reaches phones on next launch. */

const SHELL_CACHE = 'relish-shell-v3';
const ASSET_CACHE = 'relish-assets-v1';
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];
// Content-hashed build output: safe to serve from cache forever.
const IMMUTABLE_PATHS = ['/_expo/static/', '/assets/', '/zxing/'];
// Old hashed bundles pile up across deploys; keep only the newest entries.
const MAX_ASSET_ENTRIES = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.json', '/icons/apple-touch-icon.png', '/splash.jpg', '/splash-dark.jpg']))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => !KNOWN_CACHES.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/api') {
    return; // Let the browser handle it: API data is never cached.
  }
  if (url.searchParams.has('relish-update-check')) {
    return; // The app checking for a new deploy: always the network, never cached.
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }
  if (IMMUTABLE_PATHS.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put('/', response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match('/')) || (await cache.match(request));
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trimCache(cache);
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ASSET_ENTRIES;
  for (let index = 0; index < excess; index += 1) {
    await cache.delete(keys[index]);
  }
}

/* Reminder notifications (Web Push). The server encrypts each message for this phone. */
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch (error) {
    message = { body: event.data ? event.data.text() : '' };
  }
  const title = message.title || 'Relish';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: message.body || '',
      icon: '/icons/apple-touch-icon.png',
      badge: '/icons/apple-touch-icon.png',
      tag: message.tag || 'relish',
      data: { url: message.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
  if (target.origin !== self.location.origin) {
    return; // only ever open Relish itself
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      if (open) {
        // Bring the open app forward and let it switch screens itself (never reload it: that
        // could lose unsaved edits).
        open.postMessage({ type: 'relish-open', url: target.pathname + target.search });
        return open.focus();
      }
      return self.clients.openWindow(target.href);
    })
  );
});
