self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 if(event.request.mode === 'navigate' && new URL(event.request.url).origin === self.location.origin) {
  event.respondWith(fetch(event.request));
 }
});
