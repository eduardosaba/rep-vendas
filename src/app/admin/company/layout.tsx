'use client';

import React from 'react';
import Link from 'next/link';

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-6">
        <div className="mb-8">
          <h2 className="text-xl font-black">Painel da Distribuidora</h2>
          <p className="text-sm text-gray-500">Gerencie catálogo, clientes e pedidos</p>
        </div>

        <nav className="flex flex-col gap-2">
          <Link href="/admin/company/dashboard" className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">Dashboard</Link>
          <Link href="/admin/company/orders" className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">Pedidos</Link>
          <Link href="/admin/company/customers" className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">Clientes (CRM)</Link>
          <Link href="/admin/company/team" className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">Equipe</Link>
          <Link href="/admin/company/catalog" className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">Catálogo & Site</Link>
          <Link href="/admin/company/settings" className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">Personalização</Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
