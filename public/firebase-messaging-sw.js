importScripts(
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js'
);

const firebaseConfig = {
  apiKey: 'AIzaSyB9s5ShWusl_970WGdz5mj982FgNDwnuvU',
  authDomain: 'repvendas-f0911.firebaseapp.com',
  projectId: 'repvendas-f0911',
  storageBucket: 'repvendas-f0911.firebasestorage.app',
  messagingSenderId: '159699646033',
  appId: '1:159699646033:web:e8bdd6be31961cb260ea70',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Debug: indica que o service worker do FCM foi carregado
console.log('[firebase-messaging-sw] carregado');

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] onBackgroundMessage', payload);
  const notificationTitle = payload?.notification?.title || 'Notificação';
  const notificationOptions = {
    body: payload?.notification?.body || '',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload?.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Opção adicional para logar eventos de push diretos (caso chegue sem passar pelo compat)
self.addEventListener('push', (event) => {
  try {
    console.log('[firebase-messaging-sw] push event', event);
  } catch (e) {
    // ignore
  }
});

// Handle click na notificação para focar/abrir a aplicação
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
