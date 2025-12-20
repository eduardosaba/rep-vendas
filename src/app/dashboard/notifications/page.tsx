import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Bell, Check, X, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar notificações do usuário
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const safeNotifications = notifications || [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <X className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    const opacity = read ? 'bg-opacity-5' : 'bg-opacity-10';
    switch (type) {
      case 'success':
        return `bg-green-50 dark:bg-green-950 ${opacity}`;
      case 'error':
        return `bg-red-50 dark:bg-red-950 ${opacity}`;
      case 'warning':
        return `bg-yellow-50 dark:bg-yellow-950 ${opacity}`;
      default:
        return `bg-blue-50 dark:bg-blue-950 ${opacity}`;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={24} className="text-[var(--primary)]" />
            Notificações
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
              : 'Todas as notificações foram lidas'}
          </p>
        </div>

        {/* Botão Marcar todas como lidas */}
        {unreadCount > 0 && (
          <form
            action={async () => {
              'use server';
              const supabase = await createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('notifications')
                  .update({ read: true })
                  .eq('user_id', user.id)
                  .eq('read', false);
              }
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-[var(--primary)] text-white hover:opacity-90 w-full sm:w-auto justify-center"
            >
              <Check size={18} /> Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {/* LISTA DE NOTIFICAÇÕES */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {safeNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma notificação</p>
            <p className="text-sm">Você está em dia!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {safeNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                  !notification.read ? 'border-l-4 border-[var(--primary)]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          !notification.read
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--primary)]" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <time className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleString(
                          'pt-BR',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </time>
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="text-xs text-[var(--primary)] hover:underline font-medium"
                        >
                          Ver detalhes →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
