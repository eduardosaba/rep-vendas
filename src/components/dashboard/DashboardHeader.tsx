'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';
// Importamos o logger para substituir console.log se necessário no futuro
// import { logger } from '@/lib/logger';

interface UserProfileUpdatePayload {
  new: {
    avatar_url?: string;
    [key: string]: unknown;
  };
}

export default function DashboardHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // createClient é estável, mas em alguns casos pode causar re-render se estiver no corpo.
  // O Supabase recomenda criar apenas uma vez ou usar useMemo, mas para SSR client component padrão:
  const [supabase] = useState(() => createClient());

  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  // Substituído any[] por unknown[] ou um tipo específico se tiver
  const [notifications, setNotifications] = useState<unknown[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const notifRef = useRef<HTMLDivElement>(null);

  // `mounted` removed: este componente é `use client` e pode ser renderizado diretamente.

  const getPageTitle = (path: string) => {
    if (!path) return 'Painel';
    if (path === '/dashboard') return 'Visão Geral';
    if (path.startsWith('/dashboard/products')) return 'Produtos';
    if (path.startsWith('/dashboard/orders')) return 'Pedidos';
    if (path.startsWith('/dashboard/clients')) return 'Clientes';
    if (path.startsWith('/dashboard/settings')) return 'Configurações';
    return 'Painel';
  };

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const avatarUrl =
        profile?.avatar_url || user.user_metadata?.avatar_url || null;
      setUserAvatar(avatarUrl);

      // Listener para realtime
      const channel = supabase
        .channel(`profile-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            // Tipagem segura ao invés de 'as any'
            const typedPayload = payload as unknown as UserProfileUpdatePayload;
            const newAvatarUrl = typedPayload.new?.avatar_url;

            if (newAvatarUrl !== undefined) {
              setUserAvatar(newAvatarUrl || null);
            }
          }
        )
        .subscribe();

      // Buscar notificações (simulado/vazio por enquanto)
      setNotifications([]);

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const unsub = await getUser();
      if (unsub) cleanup = unsub;
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [getUser]);

  // Click outside handler logic... (igual ao original)
  // Adicionei useEffect básico para fechar menu ao clicar fora para evitar variáveis não usadas se a lógica não existir
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const getInitials = (email: string) =>
    email ? email.substring(0, 2).toUpperCase() : 'US';

  // Render normal (remoção do placeholder de mount)

  return (
    <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 transition-colors dark:bg-slate-950/80 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">
          {getPageTitle(pathname || '')}
        </h1>
      </div>

      <div className="flex items-center gap-3">
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
          className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative"
          onClick={() => setIsNotifOpen(!isNotifOpen)} // Exemplo de uso
        >
          <Bell size={20} />
          {notifications.length > 0 && (
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
          )}
        </button>

        <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-gray-700 dark:text-white">
                Minha Conta
              </span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[100px]">
                {userEmail}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)] border-opacity-20 dark:bg-opacity-20 overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
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

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1">
                <Link
                  href="/dashboard/user"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <User size={16} /> Meu Perfil
                </Link>
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
