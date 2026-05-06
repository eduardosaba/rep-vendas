import { getFcmToken } from './firebase';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Detecta se IndexedDB está utilizável (alguns modos incógnito bloqueiam)
async function isIndexedDBAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return false;
  return new Promise((resolve) => {
    try {
      const dbName = 'rv_indexeddb_test';
      const req = indexedDB.open(dbName);
      let settled = false;
      req.onsuccess = function () {
        try { req.result.close(); indexedDB.deleteDatabase(dbName); } catch (e) {}
        if (!settled) { settled = true; resolve(true); }
      };
      req.onupgradeneeded = function () { /* ok */ };
      req.onerror = function () { if (!settled) { settled = true; resolve(false); } };
      setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, 1000);
    } catch (e) {
      resolve(false);
    }
  });
}

// Chame setupNotifications(userId) após login do usuário
export async function setupNotifications(userId: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;

    // Web Push requires a secure context (HTTPS) except for localhost.
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn(
        '[setupNotifications] insecure origin — web push requires HTTPS or localhost'
      );
      toast.warning(
        'Notificações só funcionam em HTTPS. Teste em localhost ou usando um túnel HTTPS (ex: ngrok).'
      );
      return null;
    }

    // Detect IndexedDB availability early (Incognito / blocked storage can break FCM)
    const idbOk = await isIndexedDBAvailable();
    if (!idbOk) {
      console.warn('[setupNotifications] IndexedDB not available — likely incognito or blocked');
      try {
        toast.warning('IndexedDB inacessível no navegador (ex: modo incógnito). Notificações podem falhar. Use modo normal ou outro navegador.');
      } catch (e) {}
      return null;
    }

    // Respect existing permission state: do not re-prompt if denied.
    const current = Notification.permission;
    if (current === 'denied') {
      // Avoid spamming the console and UI: show informational toast only once per browser
      const key = 'rv_notifications_denied_seen';
      try {
        const seen = typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
          ? window.localStorage.getItem(key)
          : null;
        if (!seen) {
          console.debug('[setupNotifications] notifications permission previously denied');
          toast.info('Permissão de notificações bloqueada pelo navegador. Habilite nas configurações da página.');
          if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
            window.localStorage.setItem(key, '1');
          }
        }
      } catch (e) {
        // ignore localStorage errors
      }
      return null;
    }

    const permission = current === 'default' ? await Notification.requestPermission() : current;
    if (permission !== 'granted') {
      // Only show the informational toast on mobile devices — desktop users
      // commonly rely on system-level notification settings and the message
      // can be noisy. Use a localStorage flag to avoid repeating the message.
      try {
        const ua = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
        const key = 'rv_notifications_permission_seen';
        const seen = typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
          ? window.localStorage.getItem(key)
          : null;
        if (isMobile && !seen) {
          toast.info('Permissão de notificações não concedida.');
          if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
            window.localStorage.setItem(key, '1');
          }
        } else {
          // debug removed
        }
      } catch (e) {
        // ignore errors reading/writing localStorage
      }
      return null;
    }

    const token = await getFcmToken();
    if (!token) {
      // avoid spamming user with repeated warnings if VAPID/key invalid
      console.warn('[setupNotifications] no FCM token obtained — notifications disabled for this session');
      return null;
    }

    // salva no Supabase em tabela dedicada user_fcm_tokens (multi-device)
    const supabase = createClient();
    try {
      const deviceType = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert(
          {
            user_id: userId,
            token: token,
            device_type: deviceType,
          },
          { onConflict: 'token' }
        );

      if (error) {
        console.error('Erro ao inserir token em user_fcm_tokens', error);
      } else {
        console.log('FCM token salvo em user_fcm_tokens');
      }

      return token;
    } catch (err) {
      console.error('Erro salvando token no Supabase', err);
      return token;
    }
  } catch (err) {
    console.error('Erro em setupNotifications', err);
    return null;
  }
}
