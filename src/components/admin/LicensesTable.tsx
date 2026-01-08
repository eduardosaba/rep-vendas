'use client';

import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Clock,
  Package,
} from 'lucide-react';

// Interface baseada na SUA tabela
interface SubscriptionData {
  id: string;
  email: string;
  plan_name: string;
  status: string;
  price: number;
  created_at: string;
}

interface LicensesTableProps {
  subscriptions: SubscriptionData[];
}

export function LicensesTable({ subscriptions }: LicensesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: string | null) => {
    // Normaliza para minúsculo para evitar erros de case sensitive
    const s = (status || '').toLowerCase();

    if (s === 'active' || s === 'ativo') {
      return (
        <span className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-bold w-fit border border-green-100 dark:border-green-900">
          <CheckCircle size={12} /> Ativo
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelado') {
      return (
        <span className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-bold w-fit border border-red-100 dark:border-red-900">
          <XCircle size={12} /> Cancelado
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold w-fit border border-yellow-100 dark:border-yellow-900">
        <AlertTriangle size={12} /> {status || 'Pendente'}
      </span>
    );
  };

  // Filtro
  const filtered = subscriptions.filter(
    (s) =>
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.plan_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de Busca */}
      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por email ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
          />
        </div>
      </div>

      {/* DESKTOP: Tabela Tradicional */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto scrollbar-thin">
          <table
            className="w-full text-sm text-left"
            style={{ minWidth: '700px' }}
          >
            <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-4 sm:px-6 py-4 font-medium min-w-[180px]">
                  Cliente
                </th>
                <th className="px-4 sm:px-6 py-4 font-medium min-w-[100px]">
                  Plano
                </th>
                <th className="px-4 sm:px-6 py-4 font-medium min-w-[100px]">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-4 font-medium text-right min-w-[100px]">
                  Preço
                </th>
                <th className="px-4 sm:px-6 py-4 font-medium min-w-[120px]">
                  Início
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 dark:text-slate-400"
                  >
                    Nenhuma assinatura encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {sub.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Package size={14} className="text-primary" />
                        {sub.plan_name || 'Sem Plano'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(sub.price || 0)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Clock size={14} />
                      {sub.created_at
                        ? new Date(sub.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: Cards Verticais */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
            Nenhuma assinatura encontrada.
          </div>
        ) : (
          filtered.map((sub) => (
            <div
              key={sub.id}
              className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm active:bg-gray-50 dark:active:bg-slate-800/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {sub.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Package size={12} className="text-primary flex-shrink-0" />
                    <span className="truncate">
                      {sub.plan_name || 'Sem Plano'}
                    </span>
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {getStatusBadge(sub.status)}
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Clock size={12} />
                    {sub.created_at
                      ? new Date(sub.created_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                  <p className="text-lg font-black text-[var(--primary)] mt-1">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(sub.price || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
