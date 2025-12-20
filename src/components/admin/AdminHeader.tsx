'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  X,
} from 'lucide-react';

export default function AdminHeader() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Estados
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [platform, setPlatform] = useState({ logo_url: null as string | null });
  const [notifications, setNotifications] = useState<any[]>([]); // Dados Reais

  // UI
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

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
  }, []);

  // 2. Função para buscar notificações do banco
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10); // Pega as 10 últimas

    if (data) setNotifications(data);
  };

  // 3. Listener Realtime (Opcional - Atualiza quando chega notificação nova)
  useEffect(() => {
    const channel = supabase
      .channel('admin-notif')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 4. Fechar ao clicar fora
  useEffect(() => {
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-6 transition-colors dark:bg-slate-950 dark:border-slate-800">
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white shadow-sm">
              <LayoutDashboard size={20} strokeWidth={2.5} />
            </div>
          )}
          <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
            <div className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
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
                        {notif.description || notif.content}
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
            <div className="flex flex-col items-end hidden sm:flex">
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
            <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
                  href="/dashboard/user"
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
