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
  History,
} from 'lucide-react';

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export default function AdminSidebar({
  isCollapsed,
  setIsCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    {
      label: 'Visão Geral',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    { label: 'Usuários', href: '/admin/users', icon: Users },
    { label: 'Assinaturas', href: '/admin/licenses', icon: CreditCard },
    { label: 'Auditoria de Sinc.', href: '/admin/sync-logs', icon: History },
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
      className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-950 transition-all duration-300 border-r border-gray-200 dark:border-slate-800 lg:relative ${
        isCollapsed
          ? '-translate-x-full lg:translate-x-0 lg:w-20'
          : 'translate-x-0 w-64'
      }`}
    >
      {/* Botão de Colapsar (Apenas Desktop) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-8 h-6 w-6 items-center justify-center rounded-full border shadow-sm z-50 bg-white border-gray-200 text-gray-500 hover:text-primary dark:bg-slate-800 dark:border-gray-700 dark:text-gray-400"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header: Torre de Controle */}
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
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/10'
                  : 'hover:bg-gray-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 ${isActive ? 'text-primary' : ''}`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <a
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 ${isCollapsed ? 'justify-center' : ''}`}
            title="Área do Usuário"
          >
            <LayoutDashboard size={18} />
            {!isCollapsed && <span>Abrir Dashboard</span>}
          </a>
        </div>
      </nav>

      {/* Footer com vApp */}
      <div className="border-t p-4 border-gray-100 dark:border-slate-800">
        <div
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <img
            src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
            alt="RepVendas"
            className="h-6 w-auto object-contain"
          />
          {!isCollapsed && (
            <div className="flex flex-col text-[10px] font-bold uppercase text-slate-400">
              <span className="text-slate-700 dark:text-slate-200">
                RepVendas
              </span>
              <span>v1.0.0</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
