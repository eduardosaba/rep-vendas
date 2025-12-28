'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  HelpCircle,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Database,
  History, // Adicionado para Auditoria Global
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('sidebarCollapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
        // On mobile, default to collapsed for better UX
        setIsCollapsed(true);
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        // Depuração: verificar se os itens existem e o pathname atual
        // Abra o console do navegador para checar estes valores
        // eslint-disable-next-line no-console
        console.debug(
          'AdminSidebar: menuItems=',
          menuItems,
          'pathname=',
          pathname,
          'isCollapsed=',
          isCollapsed
        );
      } catch (e) {}
    }
  }, [mounted, pathname, isCollapsed]);

  // Menu Master: Gestão da Plataforma e Monitoramento de Uso
  const menuItems = [
    {
      label: 'Visão Geral',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    { label: 'Usuários', href: '/admin/users', icon: Users },
    { label: 'Assinaturas', href: '/admin/licenses', icon: CreditCard },
    {
      label: 'Auditoria de Sinc.', // NOVO: Monitoramento das métricas de uso (PROCV)
      href: '/admin/sync-logs',
      icon: History,
    },
    { label: 'Planos & Preços', href: '/admin/plans', icon: Package },
    {
      label: 'Matriz de Recursos',
      href: '/admin/plans/features',
      icon: ShieldCheck,
    },
    {
      label: 'Controle de Features',
      href: '/admin/features',
      icon: ToggleLeft,
    },
    { label: 'Métricas Globais', href: '/admin/metrics', icon: BarChart2 },
    { label: 'Logs & Debug', href: '/admin/debug', icon: ShieldAlert },
    { label: 'Novidades & Updates', href: '/admin/updates', icon: Rocket },
    { label: 'Sobre / Ajuda', href: '/admin/help', icon: HelpCircle },
    { label: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  if (!mounted) return null;

  return (
    <aside
      className={`bg-white dark:bg-slate-950
        flex flex-col h-screen sticky top-0 transition-all duration-300 border-r
        border-gray-200 text-slate-600 dark:border-slate-800 dark:text-slate-400
        ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Botão de Colapsar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm z-50
        bg-white border-gray-200 text-gray-500 hover:text-primary
        dark:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header: Torre de Controle Master */}
      <div className="flex h-16 items-center justify-center border-b px-4 border-gray-100 dark:border-slate-800">
        {isCollapsed ? (
          <span className="font-black text-xl text-primary">T</span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
              TORRE<span className="text-primary">.</span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">
              Admin Master
            </span>
          </div>
        )}
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'hover:bg-gray-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={18} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Separador e Link para o Dashboard do Usuário */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/5 text-primary ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Dashboard' : 'Ir para Área do Usuário'}
          >
            <LayoutDashboard size={18} />
            {!isCollapsed && <span>Abrir Dashboard</span>}
          </a>
        </div>
      </nav>

      {/* Footer com Logo */}
      <div className="border-t p-4 border-gray-100 dark:border-slate-800">
        <div
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <img
            src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
            alt="RepVendas"
            className="h-8 w-auto object-contain"
          />
          {!isCollapsed && (
            <div className="flex flex-col text-[10px] font-bold uppercase text-slate-400 leading-tight">
              <span className="text-slate-700 dark:text-slate-200">
                RepVendas
              </span>
              <span>v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
