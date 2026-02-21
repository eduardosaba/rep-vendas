import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Zap,
  BarChart3,
} from 'lucide-react';
import formatSyncStatus from '@/lib/utils/syncStatus';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ReprocessButton } from '@/components/admin/ReprocessButton';
import ReprocessRowButton from '@/components/admin/ReprocessRowButton';
import { BrandFilter } from '@/components/admin/BrandFilter';
import { EconomyDashboard } from '@/components/admin/EconomyDashboard';
import CheckInconsistencyButton from '@/components/admin/CheckInconsistencyButton';

export const metadata: Metadata = {
  title: 'Auditoria de Imagens | RepVendas',
  description: 'Relatório de saúde do catálogo e internalização de imagens',
};

export const dynamic = 'force-dynamic';

export default async function ImageAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string } | undefined>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = (await searchParams) || {};
  const selectedBrand = resolvedSearchParams.brand;

  // Carregamento paralelo das quatro consultas principais para acelerar a renderização
  const [summaryRes, brandsRes, errorsRes, perfRes] = await Promise.all([
    selectedBrand
      ? supabase
          .from('image_audit_summary')
          .select('*')
          .eq('brand', selectedBrand)
      : supabase.from('image_audit_summary').select('*'),

    supabase
      .from('products')
      .select('brand')
      .not('brand', 'is', null)
      .order('brand'),

    (() => {
      let q = supabase
        .from('products')
        .select('id, name, brand, sync_error')
        .eq('sync_status', 'failed')
        .limit(10);
      if (selectedBrand) q = q.eq('brand', selectedBrand);
      return q;
    })(),

    (() => {
      let q = supabase
        .from('products')
        .select(
          'sum(original_size_kb) as original_sum, sum(optimized_size_kb) as optimized_sum'
        )
        .eq('sync_status', 'synced');
      if (selectedBrand) q = q.eq('brand', selectedBrand);
      return q.single();
    })(),
  ]);

  const summary = summaryRes.data;
  const uniqueBrands = Array.from(
    new Set(brandsRes.data?.map((b) => b.brand) || [])
  );
  const recentErrors = errorsRes.data;
  const perfAgg: any = perfRes.data || {};

  const performanceTotals = {
    original: Number(perfAgg.original_sum) || 0,
    optimized: Number(perfAgg.optimized_sum) || 0,
  };

  const totals = {
    synced:
      summary?.reduce(
        (acc, curr) =>
          acc + (curr.sync_status === 'synced' ? curr.total_products : 0),
        0
      ) || 0,
    pending:
      summary?.reduce(
        (acc, curr) =>
          acc + (curr.sync_status === 'pending' ? curr.total_products : 0),
        0
      ) || 0,
    failed: summary?.reduce((acc, curr) => acc + curr.total_errors, 0) || 0,
    total_products:
      summary?.reduce((acc, curr) => acc + (curr.total_products || 0), 0) || 0,
    total_internalized:
      summary?.reduce((acc, curr) => acc + (curr.total_internalized || 0), 0) ||
      0,
  };

  const healthScore =
    totals.total_products > 0
      ? Math.round((totals.total_internalized / totals.total_products) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Saúde do Catálogo
            </h1>
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 size={18} />
              <p className="text-sm font-medium">
                Análise de infraestrutura para{' '}
                <span className="text-indigo-600 font-bold">
                  {selectedBrand || 'Todas as Marcas'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BrandFilter brands={uniqueBrands} />

            <Link href="/dashboard/manage-external-images">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 h-12 flex gap-2 font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none">
                <Zap size={16} fill="white" />
                Central de Mídia
              </Button>
            </Link>

            <ReprocessButton disabled={totals.failed === 0} />
          </div>
        </header>

        {/* INDICADOR DE SAÚDE GLOBAL */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Status de Blindagem
              </p>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white">
                {healthScore}%
              </h2>
            </div>
            <p className="text-xs font-bold text-slate-500">
              {totals.total_internalized} de {totals.total_products} imagens
              internalizadas
            </p>
          </div>
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${healthScore > 90 ? 'bg-emerald-500' : healthScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:translate-y-[-4px] transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600">
                <ShieldCheck size={24} />
              </div>
              <span className="text-3xl font-black text-slate-900 dark:text-slate-200">
                {totals.total_internalized}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Internalizados
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:translate-y-[-4px] transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl text-amber-600">
                <Clock size={24} />
              </div>
              <span className="text-3xl font-black text-slate-900 dark:text-slate-200">
                {totals.pending}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Aguardando Fila
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:translate-y-[-4px] transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl text-red-600">
                <AlertTriangle size={24} />
              </div>
              <span className="text-3xl font-black text-red-600">
                {totals.failed}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Erros Críticos
            </p>
          </div>
        </div>

        {/* DASHBOARD ECONOMIA */}
        <EconomyDashboard
          originalTotal={performanceTotals.original}
          optimizedTotal={performanceTotals.optimized}
        />

        {/* TABELA DE ERROS RECENTES (Estilizada como Card) */}
        {recentErrors && recentErrors.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-red-100 dark:border-red-950/30 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-red-50 dark:border-red-900/20 bg-red-50/20 flex items-center justify-between">
              <h2 className="font-black text-xs uppercase tracking-widest text-red-800 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Diagnóstico de Falhas Recentes
              </h2>
              <span className="text-[10px] font-bold text-red-500">
                Ação necessária em {recentErrors.length} itens
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                    <th className="px-6 py-4">Marca</th>
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4">Motivo da Falha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentErrors.map((err) => (
                    <tr
                      key={err.id}
                      className="hover:bg-red-50/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                        {err.brand}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                        {err.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-500 font-mono text-[11px] bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                          {err.sync_error}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DETALHAMENTO COMPLETO */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-slate-100">
              Análise por Segmento / Marca
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                  <th className="px-6 py-4">Marca</th>
                  <th className="px-6 py-4">Status Atual</th>
                  <th className="px-6 py-4 text-center">Produtos</th>
                  <th className="px-6 py-4 text-center">Internalizados</th>
                  <th className="px-6 py-4 text-center">Falhas</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary?.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-100">
                      {row.brand || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${row.sync_status === 'synced' ? 'bg-emerald-100 text-emerald-700' : row.sync_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {row.sync_status === 'synced' ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        {formatSyncStatus(row.sync_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">
                      {row.total_products}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-600">
                      {row.total_internalized}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-red-500">
                      {row.total_errors}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <div className="flex justify-end gap-2">
                        <CheckInconsistencyButton
                          brand={row.brand}
                          status={row.sync_status}
                        />
                        {(row.sync_status === 'failed' ||
                          row.sync_status === 'pending') && (
                          <ReprocessRowButton
                            brand={row.brand}
                            status={row.sync_status}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
