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

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
