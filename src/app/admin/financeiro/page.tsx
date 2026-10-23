import React from 'react';
import RequireRole from '@/components/RequireRole';
import RoleGuard from '@/components/auth/RoleGuard.client';
import Link from 'next/link';
import { CreditCard, Sliders, Zap, Percent, ArrowRight } from 'lucide-react';

export default async function Page() {
  return (
    <RequireRole allowedRoles={['master']}>
      <RoleGuard allowedRoles={['master']}>
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              Painel Financeiro & Assinaturas
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Torre de Controle para gerenciamento de gateways, webhooks, assinaturas SaaS e fechamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* CARD 1: ASSINATURAS */}
            <Link
              href="/admin/licenses"
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CreditCard size={24} />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Assinaturas & Licenças
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Visão consolidada de clientes pagantes, em teste, vencidos e contagem de produtos.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600">
                <span>Abrir Assinaturas</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* CARD 2: INTEGRAÇÕES */}
            <Link
              href="/admin/financeiro/integracoes"
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sliders size={24} />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                  Gateways de Pagamento
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Configuração de credenciais do Asaas, ambiente Sandbox/Produção e endpoints de webhook.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600">
                <span>Configurar Gateways</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* CARD 3: TESTES SINTÉTICOS */}
            <Link
              href="/admin/financeiro/testes"
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">
                  Testes Sintéticos
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Simulação de confirmação de pagamentos, renovações, inadimplência e idempotência.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600">
                <span>Simular Eventos</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* CARD 4: FECHAMENTO */}
            <Link
              href="/admin/financeiro/fechamento"
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Percent size={24} />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  Fechamento Mensal
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Conciliação de comissões, faturamento B2B e controle de recebíveis das distribuidoras.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>Abrir Fechamento</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </RoleGuard>
    </RequireRole>
  );
}
