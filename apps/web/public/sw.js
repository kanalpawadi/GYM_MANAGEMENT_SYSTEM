// Minimal service worker: lets the portal show reminder notifications on phones
// and opens the portal when a notification is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => c.url.includes('/portal'));
      if (open) return open.focus();
      return self.clients.openWindow('/portal/dashboard');
    }),
  );
});
