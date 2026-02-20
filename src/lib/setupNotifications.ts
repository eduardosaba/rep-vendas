import { getFcmToken } from './firebase';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Chame setupNotifications(userId) após login do usuário
export async function setupNotifications(userId: string) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Web Push requires a secure context (HTTPS) except for localhost.
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn(
        '[setupNotifications] insecure origin — web push requires HTTPS or localhost'
      );
      toast.warning(
        'Notificações só funcionam em HTTPS. Teste em localhost ou usando um túnel HTTPS (ex: ngrok).'
      );
      return;
    }

    const permission = await Notification.requestPermission();
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
      return;
    }

    const token = await getFcmToken();
    if (!token) {
      // avoid spamming user with repeated warnings if VAPID/key invalid
      console.warn('[setupNotifications] no FCM token obtained — notifications disabled for this session');
      return;
    }

    // salva no Supabase (ajuste conforme seu cliente Supabase)
    const supabase = createClient();
    try {
      await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', userId);
      console.log('FCM token salvo no profile');
    } catch (err) {
      console.error('Erro salvando token no Supabase', err);
    }
  } catch (err) {
    console.error('Erro em setupNotifications', err);
  }
}
