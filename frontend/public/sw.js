/* Relish service worker: caches the app shell only. Never caches /api (personal data). */
/* Served with Cache-Control: no-cache, so a changed file reaches phones on next launch. */

const SHELL_CACHE = 'relish-shell-v1';
const ASSET_CACHE = 'relish-assets-v1';
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];
// Content-hashed build output: safe to serve from cache forever.
const IMMUTABLE_PATHS = ['/_expo/static/', '/assets/'];
// Old hashed bundles pile up across deploys; keep only the newest entries.
const MAX_ASSET_ENTRIES = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.json', '/icons/apple-touch-icon.png']))
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
