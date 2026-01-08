'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications'; // Ajuste o caminho se necessário

interface NotificationDropdownProps {
  userId?: string;
}

export default function NotificationDropdown({
  userId,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(userId);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [stylePos, setStylePos] = useState<React.CSSProperties | null>(null);

  const displayUnread = unreadCount > 9 ? '9+' : unreadCount;

  // Fechar ao clicar fora (considera botão + portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        (buttonRef.current === target || buttonRef.current.contains(target))
      ) {
        return;
      }
      if (portalRef.current && portalRef.current.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calcula posição do dropdown quando abre e ao redimensionar/scroll
  useEffect(() => {
    if (!isOpen) return;
    const compute = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const gap = 8; // mt-2
      const vw = window.innerWidth;

      if (vw < 640) {
        // mobile: fixed full-width with small margin
        setStylePos({
          position: 'fixed',
          left: '16px',
          right: '16px',
          top: `${rect.bottom + gap}px`,
          width: 'auto',
          zIndex: 9999,
        });
      } else {
        // desktop: fixed aligned to the right of the button with width ~320px
        const w = 320;
        let left = rect.right - w;
        if (left < 8) left = 8;
        if (left + w > vw - 8) left = vw - w - 8;
        setStylePos({
          position: 'fixed',
          top: `${rect.bottom + gap}px`,
          left: `${left}px`,
          width: `${w}px`,
          zIndex: 9999,
        });
      }
    };

    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {displayUnread}
          </span>
        )}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={portalRef}
            style={stylePos || {}}
            className="origin-top rounded-xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-primary hover:text-primary/90 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  Carregando...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm">Tudo limpo por aqui!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex gap-3 p-4 hover:bg-gray-50 transition-colors relative group ${!notif.read ? 'bg-primary/10' : ''}`}
                    >
                      <div className="mt-0.5">{getIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        {notif.link ? (
                          <Link
                            href={notif.link}
                            onClick={() => {
                              setIsOpen(false);
                              markAsRead(notif.id);
                            }}
                            className="block focus:outline-none"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </Link>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {notif.message}
                            </p>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-2">
                          {new Date(notif.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-primary hover:text-primary/90 p-1 self-start opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Marcar como lida"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
