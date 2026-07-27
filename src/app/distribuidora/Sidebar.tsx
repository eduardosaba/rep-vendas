'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Box, 
  ShoppingCart, 
  DollarSign, 
  Palette, 
  Settings 
} from 'lucide-react';
import { ApplicationContext } from '@/shared/types/application';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/distribuidora' },
  { name: 'Produtos', icon: Package, href: '/distribuidora/produtos' },
  { name: 'Equipe', icon: Users, href: '/distribuidora/equipe' },
  { name: 'Estoque', icon: Box, href: '/distribuidora/estoque' },
  { name: 'Pedidos', icon: ShoppingCart, href: '/distribuidora/pedidos' },
  { name: 'Financeiro', icon: DollarSign, href: '/distribuidora/financeiro' },
  { name: 'Branding', icon: Palette, href: '/distribuidora/branding' },
  { name: 'Configurações', icon: Settings, href: '/distribuidora/configuracoes' },
];

export function Sidebar({ context }: { context: ApplicationContext }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-bold text-lg truncate" style={{ color: context.branding?.primaryColor || 'inherit' }}>
          {context.organization?.name || 'Distribuidora'}
        </h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500">
        <p>Plano: <span className="font-semibold text-slate-700 dark:text-slate-300">{context.plan?.name || 'Free'}</span></p>
      </div>
    </aside>
  );
}
