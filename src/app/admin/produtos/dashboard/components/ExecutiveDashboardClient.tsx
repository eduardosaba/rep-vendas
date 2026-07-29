'use client';

import React, { useEffect, useState } from 'react';
import { getExecutiveDashboardStatsAction } from '@/modules/product-update-engine/application/actions';
import {
  LayoutDashboard,
  Package,
  CheckCircle2,
  XCircle,
  DollarSign,
  Boxes,
  FileSpreadsheet,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export function ExecutiveDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    const res = await getExecutiveDashboardStatsAction();
    setLoading(false);
    if (res.success && res.kpis) {
      setKpis(res.kpis);
    } else {
      setError(res.error || 'Erro ao carregar métricas.');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <span>Visão Panorâmica</span>
            <span>• Operações de Catálogo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" size={28} /> Dashboard Executivo de Produtos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe métricas em tempo real sobre a saúde do catálogo, preços, estoque e jobs executados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar KPIs
          </button>
          <Link
            href="/admin/produtos/atualizacao-inteligente"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            <FileSpreadsheet size={14} /> Novo Job por Planilha
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-3">
          <RefreshCw size={36} className="mx-auto animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Carregando indicadores em tempo real...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 text-sm font-semibold">{error}</div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Total no Catálogo</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpis?.totalProducts}</div>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                  <Package size={20} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-3">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> {kpis?.activeProducts} Ativos
                </span>
                <span className="text-rose-500 font-semibold flex items-center gap-1">
                  <XCircle size={12} /> {kpis?.inactiveProducts} Inativos
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Preço Médio Catálogo</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {kpis?.averagePrice ? `R$ ${kpis.averagePrice.toFixed(2)}` : 'R$ 0,00'}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-600" /> Média ponderada de preços de venda
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Volume em Estoque</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpis?.totalStockQuantity}</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-xl">
                  <Boxes size={20} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500">Unidades totais disponíveis</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Jobs Executados</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpis?.totalJobsExecuted}</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
                <span className="text-emerald-600 font-semibold">{kpis?.completedJobs} Concluídos</span>
                <span>•</span>
                <span className="text-amber-600 font-semibold">{kpis?.rolledBackJobs} Revertidos</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Jobs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Navigation Cards */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Ações Rápidas</h3>

              <Link
                href="/admin/produtos/atualizacao-inteligente"
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500 transition-colors shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-lg">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600">
                      Motor de Atualização
                    </div>
                    <div className="text-[11px] text-slate-400">Importe e atualize via Excel</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>

              <Link
                href="/admin/produtos/historico-alteracoes"
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500 transition-colors shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-lg">
                    <RotateCcw size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600">
                      Histórico & Auditoria
                    </div>
                    <div className="text-[11px] text-slate-400">Inspecione diff e faça rollback</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>

              <Link
                href="/admin/produtos/gestao-precos"
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500 transition-colors shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600">
                      Gestão de Preço
                    </div>
                    <div className="text-[11px] text-slate-400">Presets de remarcação e %</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>
            </div>

            {/* Recent Jobs Panel */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Últimas Atualizações Executadas</h3>
                <Link href="/admin/produtos/historico-alteracoes" className="text-xs text-indigo-600 font-semibold hover:underline">
                  Ver Todas
                </Link>
              </div>

              {kpis?.recentJobs?.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Nenhuma atualização executada recentemente.</p>
              ) : (
                <div className="space-y-3">
                  {kpis?.recentJobs?.map((j: any) => (
                    <div
                      key={j.id}
                      className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{j.file_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(j.created_at).toLocaleString('pt-BR')} • {j.changed_rows} alterados
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          j.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {j.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
