'use client';

import { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
} from 'lucide-react';

// Mock Data (Enquanto não integra com Stripe real)
const MOCK_SUBS = [
  {
    id: '1',
    email: 'cliente@exemplo.com',
    plan: 'Pro',
    status: 'active',
    amount: 99.9,
    next_billing: '2024-11-20',
  },
  {
    id: '2',
    email: 'loja@oticas.com',
    plan: 'Enterprise',
    status: 'active',
    amount: 299.9,
    next_billing: '2024-11-15',
  },
  {
    id: '3',
    email: 'teste@cancelado.com',
    plan: 'Basic',
    status: 'canceled',
    amount: 49.9,
    next_billing: '-',
  },
  {
    id: '4',
    email: 'devedor@exemplo.com',
    plan: 'Pro',
    status: 'past_due',
    amount: 99.9,
    next_billing: '2024-10-20',
  },
];

export default function AdminLicensesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-bold">
            <CheckCircle size={12} /> Ativo
          </span>
        );
      case 'past_due':
        return (
          <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold">
            <AlertTriangle size={12} /> Atrasado
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-bold">
            <XCircle size={12} /> Cancelado
          </span>
        );
    }
  };

  const filtered = MOCK_SUBS.filter((s) => s.email.includes(searchTerm));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Assinaturas e Licenças
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar assinante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 dark:border-slate-700 outline-none"
          />
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg">
          <p className="text-indigo-200 text-sm font-medium uppercase">
            MRR (Receita Recorrente)
          </p>
          <h3 className="text-3xl font-bold mt-1">R$ 12.450,00</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
          <p className="text-gray-500 text-sm font-medium uppercase">
            Total Assinantes
          </p>
          <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
            142
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
          <p className="text-red-500 text-sm font-medium uppercase">
            Inadimplência
          </p>
          <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
            2.4%
          </h3>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Plano</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Renovação</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map((sub) => (
              <tr
                key={sub.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {sub.email}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
                    {sub.plan}
                  </span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                  R$ {sub.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-gray-500">{sub.next_billing}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 hover:underline text-xs font-bold">
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
