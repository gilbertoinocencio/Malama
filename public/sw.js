// =====================================================
// MALAMA — Custom Service Worker
// Handles precaching + Web Push notifications
// =====================================================

// Precache manifest injected by vite-plugin-pwa (injectManifest strategy)
const PRECACHE_ENTRIES = self.__WB_MANIFEST || [];
const CACHE_NAME = 'malama-precache-v1';

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
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Navegação offline sem cache exato: devolve o shell do SPA.
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/index.html');
          if (shell) return shell;
        }
        // respondWith(undefined) lança TypeError — devolve um erro de rede válido.
        return Response.error();
      })
  );
});

// ─── Push: show OS notification ─────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Malama', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Malama';
  const options = {
    body:    data.body  || '',
    icon:    data.icon  || '/logo.jpg',
    badge:   '/logo.jpg',
    tag:     data.tag   || 'malama-notification',
    renotify: true,
    data:    data.url   ? { url: data.url } : {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: open/focus the app on the right screen ─────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windowClients => {
      // Foca uma janela já aberta e navega até a rota do deep-link
      // (o App lê ?view=... no boot e abre a tela certa).
      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus();
          if (url !== '/' && 'navigate' in client) {
            try { await client.navigate(url); } catch { /* ignora e mantém a janela focada */ }
          }
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
