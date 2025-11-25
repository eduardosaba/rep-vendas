'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  Check,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationDropdownProps {
  userId?: string;
}

export default function NotificationDropdown({
  userId,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(userId);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const displayUnread = unreadCount > 9 ? '9+' : unreadCount;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    await Promise.all(unreadNotifications.map((n) => markAsRead(n.id)));
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const toggleOpen = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Notificações (${unreadCount} não lidas)`}
        className="relative rounded-full p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
          >
            {displayUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Notificações
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await handleMarkAllAsRead();
                    } catch (err) {
                      console.error('Erro ao marcar todas como lidas', err);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    role="menuitem"
                    tabIndex={0}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        try {
                          await handleMarkAsRead(notification.id);
                        } catch (err) {
                          console.error(
                            'Erro ao marcar notificação como lida',
                            err
                          );
                        }
                      }
                    }}
                    className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await handleMarkAsRead(notification.id);
                                } catch (err) {
                                  console.error(
                                    'Erro ao marcar notificação como lida',
                                    err
                                  );
                                }
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="Marcar como lida"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <p
                          className={`text-sm ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}
                        >
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {(() => {
                            const dateStr =
                              (notification as any).createdAt ||
                              (notification as any).created_at;
                            return dateStr
                              ? new Date(dateStr).toLocaleString('pt-BR')
                              : '';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
