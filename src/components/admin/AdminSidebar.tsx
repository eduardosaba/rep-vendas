'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes'; // Hook do tema
import {
  Users,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  LayoutDashboard,
  Package,
  ToggleLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Moon,
  Sun,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme(); // Hook para controlar o tema

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();

  // Evita erro de hidratação (renderiza o tema correto apenas no cliente)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const menuItems = [
    {
      label: 'Visão Geral',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    { label: 'Usuários', href: '/admin/users', icon: Users },
    { label: 'Assinaturas', href: '/admin/licenses', icon: CreditCard },
    { label: 'Planos & Preços', href: '/admin/plans', icon: Package },
    {
      label: 'Controle de Features',
      href: '/admin/features',
      icon: ToggleLeft,
    },
    { label: 'Métricas', href: '/admin/metrics', icon: BarChart2 },
    { label: 'Logs & Debug', href: '/admin/debug', icon: ShieldAlert },
    { label: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  if (!mounted) return null;

  return (
    <aside
      className={`
        relative flex flex-col h-screen sticky top-0 transition-all duration-300 border-r
        /* CORES DO MODO CLARO */
        bg-white border-gray-200 text-slate-600
        /* CORES DO MODO ESCURO (Dark Mode) */
        dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Botão de Colapsar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm z-50
        bg-white border-gray-200 text-gray-500 hover:text-indigo-600
        dark:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b px-4 border-gray-200 dark:border-slate-800">
        {isCollapsed ? (
          <span className="font-bold text-xl text-indigo-600 dark:text-indigo-500">
            T
          </span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg tracking-wide text-slate-800 dark:text-white">
              TORRE
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Controle
            </span>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md' // Ativo é igual nos dois (destaque forte)
                  : 'hover:bg-gray-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white' // Hover adaptativo
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Toggle Theme & Logout */}
      <div className="border-t p-4 border-gray-200 dark:border-slate-800 space-y-2">
        {/* Toggle Dark Mode */}
        <button
          onClick={toggleTheme}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
            hover:bg-gray-100 text-slate-600
            dark:hover:bg-slate-800 dark:text-slate-300
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title="Alternar Tema"
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-slate-600" />
          )}
          {!isCollapsed && (
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Sair"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
