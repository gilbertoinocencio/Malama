// =====================================================
// NURA — Custom Service Worker
// Handles precaching + Web Push notifications
// =====================================================

// Precache manifest injected by vite-plugin-pwa (injectManifest strategy)
const PRECACHE_ENTRIES = self.__WB_MANIFEST || [];
const CACHE_NAME = 'nura-precache-v1';

// ─── Install: cache precache manifest entries ───────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const urls = PRECACHE_ENTRIES.map(entry =>
        typeof entry === 'string' ? entry : entry.url
      );
      return cache.addAll(urls).catch(() => {
        // If some assets fail to cache (e.g. network unavailable), ignore
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: claim clients immediately ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first with cache fallback ───────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests; skip non-http(s) and Supabase/API calls
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http')
  ) return;

  const url = new URL(event.request.url);
  // Let Supabase and Gemini API calls go network-only
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Push: show OS notification ─────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Nura', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Nura';
  const options = {
    body:    data.body  || '',
    icon:    data.icon  || '/logo.jpg',
    badge:   '/logo.jpg',
    tag:     data.tag   || 'nura-notification',
    renotify: true,
    data:    data.url   ? { url: data.url } : {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: open the app ───────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if possible
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
