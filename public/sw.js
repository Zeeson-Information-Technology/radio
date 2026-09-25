/**
 * Service Worker — Al-Manhaj Radio
 * Handles background push notifications for go-live alerts.
 * Runs in the background even when the app/browser is closed.
 */

const CACHE_NAME = 'almanhaj-v1';
const OFFLINE_URL = '/offline';

// Install — cache the offline page immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve offline page when navigation fails
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (page loads), not API/asset requests
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then(cached => cached || Response.error())
    )
  );
});

// Push event — fired when server sends a push notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Al-Manhaj Radio', body: event.data.text() };
  }

  const title = payload.title || 'Al-Manhaj Radio';
  const options = {
    body: payload.body || 'A new broadcast has started.',
    icon: '/apple-icon',
    badge: '/icon',
    tag: 'go-live',           // replaces previous notification — no spam
    renotify: true,
    data: { url: payload.url || '/radio' },
    actions: [
      { action: 'listen', title: '▶ Listen Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200], // haptic pattern on mobile
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click — open the radio page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/radio';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If radio page is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes('/radio') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
