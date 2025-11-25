'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  HelpCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Logo from './Logo';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sidebarCollapsed');
      if (raw !== null) setIsCollapsed(raw === 'true');
    } catch (e) {
      // ignore (SSR or privacy settings)
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    } catch (e) {
      // ignore
    }
  }, [isCollapsed]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', href: '/dashboard' },
    { icon: ShoppingBag, label: 'Pedidos', href: '/dashboard/orders' },
    { icon: Package, label: 'Produtos', href: '/dashboard/products' },
    { icon: Users, label: 'Clientes', href: '/dashboard/clients' },
    { icon: HelpCircle, label: 'Central de Ajuda', href: '/dashboard/help' },
    { icon: Settings, label: 'Configurações', href: '/dashboard/settings' },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      router.push('/login');
    }
  };

  const toggle = () => setIsCollapsed((v) => !v);

  return (
    <aside
      aria-label="Menu lateral"
      className={`relative flex flex-col border-r bg-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } min-h-screen`}
    >
      <button
        aria-pressed={isCollapsed}
        aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
        onClick={toggle}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex h-16 items-center justify-center border-b px-6">
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            <Logo useSystemLogo className="h-8 w-auto" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Logo showText className="h-10 w-auto" />
          </div>
        )}
      </div>

      <nav
        className="flex-1 space-y-1 p-4"
        role="navigation"
        aria-label="Links principais"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href) ?? false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.label : ''}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={20}
                className={isActive ? 'text-indigo-600' : 'text-gray-500'}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Sair"
          aria-label="Sair do sistema"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
}
