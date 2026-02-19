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

    console.debug('[setupNotifications] solicitando permissão de Notification');
    const permission = await Notification.requestPermission();
    console.debug('[setupNotifications] permission=', permission);
    if (permission !== 'granted') {
      toast.info('Permissão de notificações não concedida.');
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
