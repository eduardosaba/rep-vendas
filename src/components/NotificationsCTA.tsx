'use client';

import { setupNotifications } from '@/lib/setupNotifications';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';

export default function NotificationsCTA({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [visible, setVisible] = useState(false);

  const notificationsEnabled =
    process.env.NEXT_PUBLIC_ENABLE_FIREBASE_NOTIFICATIONS === 'true';

  function isLikelyValidVapidKey(vapidKey: string) {
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

  const rawVapid = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '')
    .trim()
    .replace(/^"|"$/g, '');

  const vapidValid = isLikelyValidVapidKey(rawVapid);

  const handleEnable = async () => {
    if (!notificationsEnabled) {
      toast.info('Notificações estão desativadas temporariamente.');
      setVisible(false);
      return;
    }

    if (!userId) return;

    setLoading(true);

    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      if (!('Notification' in window)) {
        toast.error('Este navegador não suporta notificações.');
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        toast.info('Permissão de notificações não concedida.');
        return;
      }

      const token = await setupNotifications(userId);

      const supabase = createClient();

      await supabase
        .from('profiles')
        .update({ notifications_enabled: true })
        .eq('id', userId);

      if (token) {
        toast.success('Notificações ativadas com sucesso!');
      }

      setDisabled(true);
      setVisible(false);
    } catch (err) {
      console.error('Falha ao ativar notificações:', err);
      toast.error('Erro técnico ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!notificationsEnabled) {
      setVisible(false);
      setDisabled(true);
      return;
    }

    const checkVisibility = () => {
      if (typeof window === 'undefined') return;

      const envForce = process.env.NEXT_PUBLIC_FORCE_NOTIF_CTA === '1';
      const urlForce =
        new URLSearchParams(window.location.search).get('force_cta') === '1';

      if (envForce || urlForce) {
        setVisible(true);
        return;
      }

      const supports = 'Notification' in window && 'serviceWorker' in navigator;

      const dismissed =
        typeof window.localStorage?.getItem === 'function' &&
        window.localStorage.getItem('rv_notifications_cta_dismissed') === '1';

      const permission = Notification.permission;

      if (permission === 'granted') {
        setVisible(false);
        setDisabled(true);
        return;
      }

      if (supports && !dismissed) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    checkVisibility();
  }, [userId, notificationsEnabled]);

  if (!notificationsEnabled) return null;
  if (!visible) return null;

  return (
    <div>
      {!vapidValid && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Chave VAPID inválida:</strong> as notificações Web Push não
          funcionarão sem a chave pública VAPID correta.
          <div className="mt-2">
            Verifique a variável{' '}
            <span className="font-mono">NEXT_PUBLIC_FIREBASE_VAPID_KEY</span> no
            seu ambiente. Obtenha a chave em Firebase Console → Project settings
            → Cloud Messaging → Web Push certificates.
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl border-2 border-blue-100 bg-blue-50 p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
            <Bell className="h-6 w-6 animate-ring" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-blue-900">
              Configurar Alertas de Pedidos
            </h3>

            <p className="text-sm text-blue-700/80">
              Deseja receber um aviso sonoro e visual toda vez que um cliente
              fechar um pedido no seu catálogo?
            </p>

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleEnable}
                disabled={loading || disabled}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {loading
                  ? 'Configurando...'
                  : disabled
                    ? 'Ativado!'
                    : 'Sim, quero ser avisado'}
              </Button>

              <button
                className="text-sm text-blue-400 hover:text-blue-600 transition-colors"
                onClick={() => {
                  try {
                    window.localStorage.setItem(
                      'rv_notifications_cta_dismissed',
                      '1'
                    );
                  } catch {
                    // ignore
                  }

                  setVisible(false);
                }}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
