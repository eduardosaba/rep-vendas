'use client';

import { usePathname, useRouter } from 'next/navigation';
import NotificationDropdown from '../NotificationDropdown';
import {
  UserCircle,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  User,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Logo from '@/components/Logo';
import type { Settings } from '@/lib/types';

export function DashboardTopbar({ settings }: { settings?: Settings | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    avatar_url: null,
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pega o título da página baseado na rota
  const getPageTitle = () => {
    if (pathname.includes('/products')) return 'Gestão de Produtos';
    if (pathname.includes('/orders')) return 'Pedidos e Vendas';
    if (pathname.includes('/clients')) return 'Clientes';
    if (pathname.includes('/settings')) return 'Configurações';
    if (pathname.includes('/account')) return 'Minha Conta';
    if (pathname.includes('/help')) return 'Ajuda';
    if (pathname === '/dashboard') return 'Visão Geral';
    return 'Dashboard';
  };

  const supabase = sharedSupabase;

  // Carregar Usuário e Perfil
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Busca dados extras do perfil (nome, avatar)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        setUserProfile({
          name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          avatar_url: profile?.avatar_url,
        });
      }
    };
    getUser();
  }, [supabase]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Título da Página + Logo */}
      <div className="flex items-center gap-4">
        <Logo
          settings={settings}
          className="h-8 w-auto"
          useSystemLogo={!settings?.logo_url}
        />
        <h2 className="text-xl font-bold text-gray-800">{getPageTitle()}</h2>
      </div>

      {/* Ações Direita */}
      <div className="flex items-center gap-4">
        {/* Notificações */}
        <NotificationDropdown userId={userId} />

        {/* Separador */}
        <div className="h-6 w-px bg-gray-200"></div>

        {/* Dropdown de Perfil */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-lg transition-colors focus:outline-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">
                {userProfile.name}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                {userProfile.email}
              </p>
            </div>

            <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
              {userProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userProfile.avatar_url}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle size={24} className="rv-text-primary" />
              )}
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Menu Suspenso */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 z-50">
              <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-bold text-gray-900">
                  {userProfile.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile.email}
                </p>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard/account"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                >
                  <User size={16} /> Meu Perfil
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                >
                  <SettingsIcon size={16} /> Configurações da Loja
                </Link>
              </div>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
