// Firebase Messaging desativado temporariamente.
// Mantemos este arquivo para evitar erro 404 caso algum service worker antigo tente carregá-lo.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.registration.unregister();
        console.log(
          '[Firebase SW] Service worker desregistrado temporariamente.'
        );
      } catch (error) {
        console.warn('[Firebase SW] Falha ao desregistrar:', error);
      }
    })()
  );
});

self.addEventListener('push', () => {
  // Notificações push desativadas temporariamente.
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
});
