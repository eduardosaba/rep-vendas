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
  Sun,
  Moon,
  LogOut,
  Settings,
  Store,
} from 'lucide-react';
import Image from 'next/image';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

export function DashboardHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Estados
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Painel de Controle');
  const [catalogSlug, setCatalogSlug] = useState('');
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      client_name_guest?: string;
      total_value: number;
      created_at: string;
      display_id: number;
    }>
  >([]);

  // UI
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Função para buscar notificações do banco (pedidos pendentes)

  const fetchNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('orders')
      .select('id, client_name_guest, total_value, created_at, display_id')
      .eq('user_id', user.id)
      .eq('status', 'Pendente')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setNotifications(data);
  };

  // 1. Carregar Dados Iniciais
  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let settingsChannel: ReturnType<typeof supabase.channel> | null = null;

    const getData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');

        // Buscar avatar
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        const avatarUrl =
          profile?.avatar_url || user.user_metadata?.avatar_url || null;
        setUserAvatar(avatarUrl);

        // Buscar configurações
        const { data: settings } = await supabase
          .from('settings')
          .select('name, catalog_slug, logo_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings) {
          if (settings.name) setStoreName(settings.name);
          if (settings.catalog_slug) setCatalogSlug(settings.catalog_slug);
          if (settings.logo_url) setStoreLogo(settings.logo_url);
        }

        fetchNotifications();

        // Listener Profile
        profileChannel = supabase
          .channel(`profile-changes-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload: { new: { avatar_url?: string | null } }) => {
              const newAvatarUrl = payload.new?.avatar_url;
              if (newAvatarUrl !== undefined) {
                setUserAvatar(newAvatarUrl || null);
              }
            }
          )
          .subscribe();

        // Listener Settings
        settingsChannel = supabase
          .channel(`settings-changes-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'settings',
              filter: `user_id=eq.${user.id}`,
            },
            (payload: {
              new: {
                logo_url?: string | null;
                name?: string;
                catalog_slug?: string;
              };
            }) => {
              if (payload.new?.logo_url !== undefined) {
                setStoreLogo(payload.new.logo_url || null);
              }
              if (payload.new?.name) {
                setStoreName(payload.new.name);
              }
              if (payload.new?.catalog_slug !== undefined) {
                setCatalogSlug(payload.new.catalog_slug || '');
              }
            }
          )
          .subscribe();
      }
    };

    setMounted(true);
    getData();

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (settingsChannel) supabase.removeChannel(settingsChannel);
    };
    // REMOVIDO [supabase] das dependências para evitar loop de reconexão
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Listener Realtime para pedidos pendentes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('dashboard-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // REMOVIDO [supabase] das dependências
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node))
        setIsNotifOpen(false);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (email: string) =>
    email ? email.substring(0, 2).toUpperCase() : 'US';
  const unreadCount = notifications.length;

  if (!mounted)
    return <div className="h-20 border-b bg-white dark:bg-slate-950" />;

  return (
    <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 transition-colors dark:bg-slate-950/80 dark:border-slate-800">
      {/* Esquerda: Logo e Título */}
      <div className="flex items-center gap-4">
        {/* Botão Hamburger para Mobile */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        {/* Logo do usuário ou sistema */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 relative">
            <Image
              src={storeLogo || SYSTEM_LOGO_URL}
              alt={storeName}
              width={112}
              height={40}
              className="object-contain object-left"
              sizes="(max-width: 768px) 100px, 120px"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block truncate max-w-[200px]">
            {storeName}
          </h1>
        </div>
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center gap-3">
        {/* Busca Global */}
        <div className="hidden md:block relative group mr-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[var(--primary)] transition-colors" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-10 w-64 rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-20 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
          />
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notificações */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 md:right-0 left-0 md:left-auto top-full mt-3 w-full md:w-80 max-w-sm mx-auto md:mx-0 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Pedidos Pendentes
                </p>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      router.push('dashboard/notifications/');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver todos
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum pedido pendente.
                  </div>
                ) : (
                  notifications.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setIsNotifOpen(false);
                        router.push(`/dashboard/orders?id=${order.id}`);
                      }}
                      className="px-4 py-3 border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-medium text-primary dark:text-primary">
                          Pedido #{order.display_id}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 font-medium">
                        {order.client_name_guest || 'Cliente'}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-1">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(order.total_value || 0)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-700 dark:text-white">
                Minha Conta
              </span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[100px]">
                {userEmail}
              </span>
            </div>
            <div className="relative h-10 w-10 rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)] border-opacity-20 dark:bg-opacity-20 overflow-hidden">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt="Avatar"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <span className="font-bold text-xs">
                  {getInitials(userEmail)}
                </span>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1">
                <Link
                  href="/dashboard/user"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <User size={16} /> Meu Perfil
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Settings size={16} /> Configurações da Loja
                </Link>
                {catalogSlug && (
                  <a
                    href={`/catalogo/${catalogSlug}`}
                    target="_blank"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors my-1"
                  >
                    <Store size={16} /> Ver Minha Loja
                  </a>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
