'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, LayoutDashboard, Palette, ShoppingBag, Users } from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/admin' },
  { label: 'Equipe de Vendas', icon: Users, href: '/dashboard/admin/equipe' },
  { label: 'Central de Pedidos', icon: ShoppingBag, href: '/dashboard/orders' },
  { label: 'Catálogo & Cores', icon: Palette, href: '/dashboard/admin/configuracoes' },
  { label: 'Importação (Procv)', icon: Database, href: '/admin/import-status' },
];

export default function SidebarPro() {
  const pathname = usePathname();
  const safePathname = pathname || '';

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-slate-100 min-h-screen p-6 hidden lg:flex lg:flex-col">
      <div className="mb-10 px-2">
        <p className="text-xs font-black tracking-wider text-slate-400 uppercase">Painel Distribuidora</p>
        <h2 className="text-2xl font-black italic text-slate-900">
          RepVendas<span className="text-emerald-600">.PRO</span>
        </h2>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = safePathname === item.href || safePathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                active
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 p-4 bg-slate-900 rounded-3xl text-white">
        <p className="text-[10px] font-black opacity-60 uppercase">Plano Ativo</p>
        <p className="font-bold">Distribuidora Gold</p>
      </div>
    </aside>
  );
}
