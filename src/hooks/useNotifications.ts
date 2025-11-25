import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  created_at: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // 1. Carregar notificações iniciais
    const fetchNotifications = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        // Normalize createdAt for components that expect camelCase
        const normalized = data.map((n: any) => ({
          ...n,
          createdAt: n.created_at,
        }));
        setNotifications(normalized);
        setUnreadCount(normalized.filter((n: any) => !n.read).length);
      }
      setLoading(false);
    };

    fetchNotifications();

    // 2. Inscrever em atualizações em Tempo Real (Real-time)
    const subscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Tocar um som ou mostrar Toast
          addToast({
            title: newNotification.title,
            description: newNotification.message,
            type: newNotification.type,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, addToast]);

  const markAsRead = async (id: string) => {
    // Atualiza localmente para UI rápida
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Atualiza no banco
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
