import { initializeApp, getApps, getApp } from 'firebase/app';
import type { Messaging } from 'firebase/messaging';

// Configurações usando as variáveis de ambiente da Vercel
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: any = null;
let messaging: Messaging | null = null;

// Inicializa o app no cliente (se ainda não inicializado)
if (typeof window !== 'undefined') {
  if (!firebaseConfig.projectId) {
    console.warn(
      '[firebase] NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing — messaging disabled'
    );
  } else {
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (e) {
      console.warn('[firebase] failed to initialize app', e);
      app = null;
    }
  }
}

// Inicializa messaging somente quando necessário, com checagem de capacidades
export async function ensureMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (typeof window === 'undefined' || !app) return null;
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    console.info(
      '[firebase] messaging disabled: browser does not support service workers / push'
    );
    return null;
  }

  try {
    const mod = await import('firebase/messaging');
    const { getMessaging } = mod;
    try {
      messaging = getMessaging(app);
      return messaging;
    } catch (innerErr) {
      console.warn('[firebase] messaging not available after all', innerErr);
      messaging = null;
      return null;
    }
  } catch (err) {
    console.warn('[firebase] failed to load firebase/messaging', err);
    return null;
  }
}

export { app };

// Função para obter o Token do Representante (protegida)
export const getFcmToken = async () => {
  try {
    const m = await ensureMessaging();
    if (!m) return null;
    const rawVapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!rawVapid) {
      console.warn('[firebase] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing');
      return null;
    }

    // sanitize common mistakes: surrounding quotes, whitespace
    const vapidKey = String(rawVapid).trim().replace(/^"|"$/g, '');

    // basic validation: should be URL-safe base64-like string (letters, numbers, -, _)
    const isLikelyVapid = /^[A-Za-z0-9\-_]+=*$/.test(vapidKey);
    if (!isLikelyVapid || vapidKey.length < 10) {
      console.warn(
        '[firebase] NEXT_PUBLIC_FIREBASE_VAPID_KEY looks invalid — please provide the public VAPID key (URL-safe base64 string) in .env as NEXT_PUBLIC_FIREBASE_VAPID_KEY'
      );
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    try {
      const token = await getToken(m, { vapidKey });
      return token;
    } catch (err: unknown) {
      // More actionable log for the typical PushManager InvalidAccessError
      console.error('Erro ao obter token FCM:', err);
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter token FCM:', error);
    return null;
  }
};
