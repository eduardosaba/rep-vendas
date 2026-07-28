'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DevHealthDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">CivicOS Dev Health</h1>
        <p className="text-slate-500 mt-2">Painel de Diagnóstico do Ambiente de Desenvolvimento</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contexto do Tenant */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Sessão Atual</h2>
          
          <div className="space-y-4">
            <div>
              <span className="block text-xs text-slate-400">Tenant</span>
              <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                Distribuidora Alpha (Demo)
              </span>
            </div>
            
            <div>
              <span className="block text-xs text-slate-400">Usuário</span>
              <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                admin@alpha.demo
              </span>
            </div>
          </div>
        </div>

        {/* Status dos Módulos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Saúde dos Módulos</h2>
          
          <ul className="space-y-3">
            <ModuleStatus name="Auth / Supabase" status="ok" />
            <ModuleStatus name="Organization" status="ok" />
            <ModuleStatus name="Products" status="ok" />
            <ModuleStatus name="Orders" status="pending" />
            <ModuleStatus name="Picking" status="pending" />
            <ModuleStatus name="Invoice" status="pending" />
            <ModuleStatus name="Shipment" status="pending" />
            <ModuleStatus name="Outbox Events" status="pending" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function ModuleStatus({ name, status }: { name: string, status: 'ok' | 'error' | 'pending' }) {
  return (
    <li className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
      {status === 'ok' && <CheckCircle2 size={18} className="text-green-500" />}
      {status === 'error' && <XCircle size={18} className="text-red-500" />}
      {status === 'pending' && <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>}
    </li>
  );
}
