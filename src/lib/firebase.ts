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
let vapidErrorLogged = false;

function isLikelyValidVapidKey(vapidKey: string): boolean {
  // VAPID public key is usually an unpadded base64url string (~87 chars).
  // Accept a safe range and only URL-safe base64 characters.
  if (!vapidKey) return false;
  if (vapidKey.length < 80 || vapidKey.length > 140) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(vapidKey)) return false;

  const upper = vapidKey.toUpperCase();
  if (
    upper.includes('YOUR_VAPID_KEY') ||
    upper.includes('PUBLIC_VAPID_KEY') ||
    upper.includes('SUA_CHAVE') ||
    upper.includes('EXAMPLE')
  ) {
    return false;
  }

  return true;
}

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

    if (!isLikelyValidVapidKey(vapidKey)) {
      console.warn(
        '[firebase] NEXT_PUBLIC_FIREBASE_VAPID_KEY looks invalid — use the PUBLIC Web Push certificate key from Firebase (base64url), without quotes or placeholders'
      );
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    try {
      const token = await getToken(m, { vapidKey });
      return token;
    } catch (err: unknown) {
      // Avoid spamming the console if the VAPID key is invalid — log once
      if (!vapidErrorLogged) {
        console.warn(
          '[firebase] failed to subscribe for push notifications. Check NEXT_PUBLIC_FIREBASE_VAPID_KEY and Firebase Web Push certificates.',
          err
        );
        vapidErrorLogged = true;
      } else {
        console.debug('[firebase] FCM token error (silenced):', err);
      }
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter token FCM:', error);
    return null;
  }
};
