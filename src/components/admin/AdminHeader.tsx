'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Bell,
  Search,
  User,
  Menu,
  ChevronDown,
  LayoutDashboard,
  Sun,
  Moon,
  LogOut,
  Settings,
} from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  read_at: string | null;
};

export default function AdminHeader() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Estados
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [platform, setPlatform] = useState({ logo_url: null as string | null });
  const [notifications, setNotifications] = useState<Notification[]>([]); // Dados Reais

  // UI
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  type PresenceRow = {
    user_id: string;
    is_online: boolean;
    last_seen?: string;
    users?: { email?: string };
  };

  // 2. Função para buscar notificações do banco
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('user_status')
        .select('user_id, is_online, last_seen, users(email)')
        .order('last_seen', { ascending: false })
        .limit(10);

      if (data) {
        const mapped = (data as PresenceRow[]).map((row) => {
          const email = row.users?.email;
          return {
            id: `${row.user_id}-${row.last_seen}`,
            title: row.is_online
              ? `Usuário online: ${email || row.user_id}`
              : `Usuário offline: ${email || row.user_id}`,
            description: '',
            created_at: row.last_seen || new Date().toISOString(),
            read_at: null,
          } as Notification;
        });
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar presença para notificações', err);
    }
  }, [supabase]);

  // 1. Carregar Dados Iniciais
  useEffect(() => {
    setMounted(true);
    const getData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserAvatar(user.user_metadata?.avatar_url || null);
        fetchNotifications(); // Busca as notificações reais
      }

      // Resiliência: usar .maybeSingle() pois pode não existir configuração
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('logo_url')
        .eq('id', 1)
        .maybeSingle();

      if (settings) setPlatform({ logo_url: settings.logo_url });
    };
    getData();
  }, [fetchNotifications, supabase]);

  // (fetchNotifications moved earlier)

  // 3. Listener Realtime (Opcional - Atualiza quando chega notificação nova)
  useEffect(() => {
    // Realtime: Inscrições de novos usuários e mudanças de presença em `user_status`
    const channel: RealtimeChannel = supabase.channel(
      'admin-presence'
    ) as RealtimeChannel;

    // (Removido listener direto em `users`) — usamos `user_status` como fonte de presença/notificações

    // Inserção em user_status (novo registro de presença)
    (channel as any).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'user_status' },
      async (payload: { new?: PresenceRow }) => {
        const s = payload.new;
        if (!s) return;
        try {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', s.user_id)
            .maybeSingle();
          const email = user?.email;
          if (s.is_online) {
            const notif = {
              id: `${s.user_id}-online-${Date.now()}`,
              title: email ? `Usuário online: ${email}` : 'Usuário online',
              description: '',
              created_at: new Date().toISOString(),
              read_at: null,
            };
            setNotifications((prev) => [notif, ...prev].slice(0, 10));
          }
        } catch (err) {
          console.error('Erro ao buscar usuário para presence INSERT', err);
        }
      }
    );

    // Atualizações em user_status (mudança de online/offline)
    (channel as any).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'user_status' },
      async (payload: { new?: PresenceRow; old?: PresenceRow }) => {
        const n = payload.new;
        const o = payload.old;
        if (!n) return;
        try {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', n.user_id)
            .maybeSingle();
          const email = user?.email;
          if (n.is_online && !o?.is_online) {
            const notif = {
              id: `${n.user_id}-online-${Date.now()}`,
              title: email ? `Usuário online: ${email}` : 'Usuário online',
              description: '',
              created_at: new Date().toISOString(),
              read_at: null,
            };
            setNotifications((prev) => [notif, ...prev].slice(0, 10));
          } else if (!n.is_online && o?.is_online) {
            const notif = {
              id: `${n.user_id}-offline-${Date.now()}`,
              title: email ? `Usuário offline: ${email}` : 'Usuário offline',
              description: '',
              created_at: new Date().toISOString(),
              read_at: null,
            };
            setNotifications((prev) => [notif, ...prev].slice(0, 10));
          }
        } catch (err) {
          console.error('Erro ao buscar usuário para presence UPDATE', err);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // 4. Fechar ao clicar fora
  useEffect(() => {
    console.debug('[AdminHeader] theme', theme);
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node))
        setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (email: string) =>
    email ? email.substring(0, 2).toUpperCase() : 'AD';
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (!mounted)
    return <div className="h-16 border-b bg-white dark:bg-slate-950" />;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-6 transition-colors bg-white dark:bg-slate-950 dark:border-slate-800">
      {/* Esquerda: Logo */}
      <div className="flex items-center gap-4">
        <button className="mr-2 md:hidden text-gray-500 hover:text-[var(--primary)] dark:text-slate-400">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3 select-none">
          {platform.logo_url ? (
            <img
              src={platform.logo_url}
              alt="Logo"
              className="h-9 w-auto object-contain max-w-[150px]"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
              <LayoutDashboard size={20} strokeWidth={2.5} />
            </div>
          )}
          <span
            className="ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase border"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              borderColor: 'rgba(0,0,0,0.06)',
            }}
          >
            Torre de Controle
          </span>
        </div>
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center relative">
          <Search
            className="absolute left-3 text-gray-400 dark:text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-9 w-64 rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
          />
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* --- NOTIFICAÇÕES REAIS --- */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-gray-500 hover:text-[var(--primary)] dark:text-slate-400 dark:hover:text-white transition-colors focus:outline-none"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 animate-pulse"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 top-20 md:top-full mt-0 md:mt-3 w-auto md:w-80 max-w-sm mx-auto md:mx-0 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Notificações
                </p>
                {notifications.length > 0 && (
                  <button className="text-xs text-[var(--primary)] hover:underline">
                    Marcar lidas
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhuma notificação nova.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!notif.read_at ? 'bg-[var(--primary)]/10 dark:bg-[var(--primary)]/10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p
                          className={`text-sm ${!notif.read_at ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}
                        >
                          {notif.title}
                        </p>
                        {!notif.read_at && (
                          <span className="h-2 w-2 rounded-full bg-[var(--primary)] mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                        {notif.description || ''}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-1 hidden md:block"></div>

        {/* --- PERFIL --- */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-700 dark:text-white group-hover:text-indigo-600 transition-colors">
                Master
              </span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[120px]">
                {userEmail}
              </span>
            </div>
            <div className="h-9 w-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/30 dark:bg-[var(--primary)]/20 dark:text-[var(--primary)] dark:border-[var(--primary)]/40 overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold text-sm">
                  {getInitials(userEmail)}
                </span>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isMenuOpen && (
            <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 top-20 md:top-full mt-0 md:mt-3 w-auto md:w-64 max-w-sm mx-auto md:mx-0 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Conta Master
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  {userEmail}
                </p>
              </div>
              <div className="p-1">
                <Link
                  href="/admin/user"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <User size={16} /> Meu Perfil
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Settings size={16} /> Configurações do Sistema
                </Link>
              </div>
              <div className="p-1 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                >
                  <LogOut size={16} /> Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
