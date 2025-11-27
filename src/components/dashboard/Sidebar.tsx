'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Settings,
  LogOut,
  BarChart3,
  Store,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import Logo from '@/components/Logo'; // Ajuste se o caminho do seu logo for diferente

// MAPA DE ROTAS CORRIGIDO (Links em PT -> Pastas em EN)
const menuItems = [
  {
    title: 'Visão Geral',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Pedidos',
    href: '/dashboard/orders', // Pasta: src/app/dashboard/orders
    icon: ShoppingCart,
  },
  {
    title: 'Produtos',
    href: '/dashboard/products', // Pasta: src/app/dashboard/products
    icon: Package,
  },
  {
    title: 'Clientes',
    href: '/dashboard/clients', // Pasta: src/app/dashboard/clients
    icon: Users,
  },
  {
    title: 'Relatórios',
    href: '/dashboard/reports', // Vamos criar esta pasta placeholder
    icon: BarChart3,
  },
  {
    title: 'Configurações',
    href: '/dashboard/settings', // Pasta: src/app/dashboard/settings
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        {/* Se o seu componente Logo exigir props, ajuste aqui */}
        <div className="font-bold text-xl text-blue-900 flex items-center gap-2">
          <Store className="text-blue-600" /> RepVendas
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
