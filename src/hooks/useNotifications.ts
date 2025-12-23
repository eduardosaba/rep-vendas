'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  link?: string;
  read: boolean;
  created_at: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // usar sonner programático
  const supabase = createClient();

  // 1. Carregar notificações iniciais
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setNotifications(data as Notification[]);
      setLoading(false);
    };

    fetchNotifications();

    // 2. LIGAR O REALTIME (O Pulo do Gato 🐱)
    // Buffer + throttle to avoid UI jank when many notifications arrive quickly
    const buffer: Notification[] = [];
    let flushTimer: NodeJS.Timeout | null = null;

    const flushBuffer = () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      if (buffer.length === 0) return;

      // Flush all buffered notifications in one state update
      setNotifications((prev) => {
        const merged = [...buffer.reverse(), ...prev];
        // keep list bounded to 100 items to avoid memory growth
        return merged.slice(0, 100);
      });

      // Show toasts in idle time to avoid blocking
      if (typeof window !== 'undefined') {
        const showNext = () => {
          const n = buffer.shift();
          if (!n) return;
          try {
            // Use requestIdleCallback when available
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(() => {
                toast(n.title, { description: n.message });
                showNext();
              });
            } else {
              setTimeout(() => {
                toast(n.title, { description: n.message });
                showNext();
              }, 100);
            }
          } catch (e) {
            // swallow errors from toast to avoid crashing real-time handler
            showNext();
          }
        };

        showNext();
      }
    };

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // push into buffer and schedule a flush
          buffer.push(newNotif);
          if (!flushTimer) {
            flushTimer = setTimeout(flushBuffer, 200);
          }
        }
      )
      .subscribe();

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Ações
  const markAsRead = async (id: string) => {
    // Otimista (atualiza tela antes do banco)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
