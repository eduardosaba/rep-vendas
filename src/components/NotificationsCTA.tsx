"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { setupNotifications } from '@/lib/setupNotifications';
import { createClient } from '@/lib/supabase/client';

export default function NotificationsCTA({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleEnable = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.info('Permissão de notificações não concedida.');
        setDisabled(true);
        setLoading(false);
        return;
      }

      // call the existing setup flow to save token
      await setupNotifications(userId);

      // persist choice in DB
      const supabase = createClient();
      await supabase.from('profiles').update({ notifications_enabled: true }).eq('id', userId);

      toast.success('Notificações ativadas!');
      setDisabled(true);
    } catch (err) {
      console.error('enable notifications failed', err);
      toast.error('Não foi possível ativar notificações');
    } finally {
      setLoading(false);
    }
  };

  // check dismissed flag on mount
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Only show CTA on mobile devices
        const ua = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
        if (!isMobile) {
          setVisible(false);
          return;
        }

        if (typeof window.localStorage?.getItem === 'function') {
          const dismissed = window.localStorage.getItem('rv_notifications_cta_dismissed');
          if (dismissed === '1') setVisible(false);
        }
      }
    } catch (e) {}
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Ative Notificações</h3>
          <p className="mt-1 text-xs text-gray-500">Receba atualizações e novos pedidos diretamente no seu dispositivo.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={handleEnable} disabled={loading || disabled}>
              {loading ? 'Solicitando...' : disabled ? 'Ativado' : 'Ativar notificações'}
            </Button>
            <button
              className="ml-2 inline-flex items-center rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => {
                setDisabled(true);
                if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
                  window.localStorage.setItem('rv_notifications_cta_dismissed', '1');
                }
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
