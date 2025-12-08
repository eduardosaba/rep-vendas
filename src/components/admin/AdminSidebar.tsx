'use client';

import Link from 'next/link';
import { Users, CreditCard, BarChart2, Settings, LogOut } from 'lucide-react';

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 h-screen sticky top-0 p-4">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Admin</h2>
        <p className="text-xs text-gray-500">Torre de controle</p>
      </div>

      <nav className="space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <BarChart2 size={16} /> Visão Geral
        </Link>

        <Link
          href="/admin/users"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <Users size={16} /> Usuários
        </Link>

        <Link
          href="/admin/licenses"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <CreditCard size={16} /> Licenças
        </Link>

        <Link
          href="/admin/metrics"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <BarChart2 size={16} /> Métricas
        </Link>

        <Link
          href="/admin/debug"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <Settings size={16} /> DEBUG
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <Settings size={16} /> Configurações
        </Link>
      </nav>

      <div className="mt-6">
        <button className="w-full flex items-center gap-2 justify-center px-3 py-2 rounded bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
