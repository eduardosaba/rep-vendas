import { getFcmToken } from './firebase';
import { createClient } from '@/lib/supabase/client';

// Chame setupNotifications(userId) após login do usuário
export async function setupNotifications(userId: string) {
  try {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const token = await getFcmToken();
    if (!token) return;

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
