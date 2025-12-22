'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  CreditCard,
  BarChart2,
  Settings,
  LayoutDashboard,
  Package,
  ToggleLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Rocket,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // admin area is restricted to master users by server-side logic
  // no need to fetch/check master role here in the sidebar

  // logout and theme toggle removed from admin sidebar (admin area has its own flows)

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
    // { label: 'Logs & Debug', href: '/admin/debug', icon: ShieldAlert }, // Desabilitado temporariamente - usa fs que não funciona em build
    // 2. Adicionei o item aqui
    { label: 'Novidades & Updates', href: '/admin/updates', icon: Rocket },
    { label: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  if (!mounted) return null;

  return (
    <aside
      style={{ backgroundColor: 'var(--header-bg)' }}
      className={`
        relative flex flex-col h-screen sticky top-0 transition-all duration-300 border-r
        border-gray-200 text-slate-600 dark:border-slate-800 dark:text-slate-400
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Botão de Colapsar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm z-50
        bg-white border-gray-200 text-gray-500 hover:text-[var(--primary)]
        dark:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b px-4 border-gray-200 dark:border-slate-800">
        {isCollapsed ? (
          <span className="font-bold text-xl text-[var(--primary)] dark:text-[var(--primary)]">
            T
          </span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg tracking-wide text-[var(--primary)] dark:text-[var(--primary-foreground)]">
              TORRE
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--primary)]/70 dark:text-[var(--primary-foreground)]/70">
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
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'hover:bg-gray-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Link ao Dashboard (nova aba) */}
        <a
          href="/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Dashboard' : 'Abrir Dashboard (nova aba)'}
        >
          <LayoutDashboard size={20} />
          {!isCollapsed && <span>Abrir Dashboard</span>}
        </a>
      </nav>

      {/* Footer: Toggle Theme & Logout */}
      <div className="border-t p-4 border-gray-200 dark:border-slate-800">
        <div
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <img
            src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
            alt="RepVendas"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = '/images/logo.png';
            }}
          />
          {!isCollapsed && (
            <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                RepVendas
              </span>
              <span>v{process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
