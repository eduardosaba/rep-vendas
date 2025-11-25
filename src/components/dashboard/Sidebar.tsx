'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CircleHelp, // Ícone para a Central de Ajuda
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Logo from '@/components/Logo';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', href: '/dashboard' },
    { icon: ShoppingBag, label: 'Pedidos', href: '/dashboard/orders' },
    { icon: Package, label: 'Produtos', href: '/dashboard/products' },
    { icon: Users, label: 'Clientes', href: '/dashboard/clients' },
    { icon: Settings, label: 'Configurações', href: '/dashboard/settings' },
    { icon: CircleHelp, label: 'Ajuda', href: '/dashboard/help' }, // Novo Item
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className={`relative flex flex-col border-r bg-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } min-h-screen`}
    >
      {/* Botão de Colapsar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm hover:bg-gray-50 z-10"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
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

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
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
            >
              <item.icon
                size={20}
                className={isActive ? 'text-indigo-600' : 'text-gray-500'}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Sair"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
}
