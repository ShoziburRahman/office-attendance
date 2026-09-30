self.addEventListener('install', (event) => {
  console.log('SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Minimum fetch handler to satisfy PWA installability.
  // We do not cache any requests to avoid stale attendance data
  // or authentication issues.
  event.respondWith(fetch(event.request));
});
