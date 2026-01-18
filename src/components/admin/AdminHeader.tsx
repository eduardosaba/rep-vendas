'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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

export default function AdminHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [platform, setPlatform] = useState({ logo_url: null as string | null });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('user_status')
      .select('user_id, is_online, last_seen')
      .limit(10);

    if (data) {
      const mapped = (data as any[]).map((row) => ({
        id: `${row.user_id}-${row.last_seen}`,
        title: row.is_online
          ? `Online: ${row.user_id.substring(0, 8)}...`
          : `Offline: ${row.user_id.substring(0, 8)}...`,
        created_at: row.last_seen || new Date().toISOString(),
        read_at: null,
      }));
      setNotifications(mapped);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    const getData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserAvatar(user.user_metadata?.avatar_url || null);
        fetchNotifications();
      }
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('logo_url')
        .eq('id', 1)
        .maybeSingle();
      if (settings) setPlatform({ logo_url: settings.logo_url });
    };
    getData();
  }, [fetchNotifications, supabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!mounted)
    return <div className="h-16 border-b bg-white dark:bg-slate-950" />;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-6 bg-white dark:bg-slate-950 dark:border-slate-800 transition-colors">
      <div className="flex items-center gap-4">
        {/* Botão de Menu para Admin - Chama a função do Layout */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-primary dark:text-slate-400"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-3">
          {platform.logo_url ? (
            <img src={platform.logo_url} alt="Logo" className="h-8 w-auto" />
          ) : (
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white">
              <LayoutDashboard size={18} />
            </div>
          )}
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
            Torre de Controle
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
            className="p-2 text-gray-500 hover:text-primary dark:text-slate-400 relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 border-b dark:border-slate-800 font-bold text-sm">
                Notificações Recentes
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 border-b dark:border-slate-800 text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {n.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 hidden md:block"></div>

        {/* Perfil Master */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 focus:outline-none group"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold dark:text-white group-hover:text-primary transition-colors">
                Master Admin
              </span>
              <span className="text-[10px] text-gray-500">{userEmail}</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} className="h-full w-full object-cover" />
              ) : (
                userEmail.substring(0, 2).toUpperCase()
              )}
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border dark:border-slate-800 p-1 animate-in fade-in zoom-in-95">
              <Link
                href="/admin/user"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg"
              >
                <User size={16} /> Perfil Admin
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg"
              >
                <Settings size={16} /> Configurações
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg border-t dark:border-slate-800 mt-1"
              >
                <LogOut size={16} /> Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
