import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, AlertTriangle, Clock, RefreshCcw } from 'lucide-react';
import SyncStatusBadge from '@/components/ui/SyncStatusBadge';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ReprocessButton } from '@/components/admin/ReprocessButton';
import { BrandFilter } from '@/components/admin/BrandFilter';
import { EconomyDashboard } from '@/components/admin/EconomyDashboard';
export const metadata: Metadata = {
  title: 'Auditoria de Imagens | RepVendas',
  description: 'Relatório de saúde do catálogo e internalização de imagens',
};

export default async function ImageAuditPage({
  searchParams,
}: {
  searchParams: { brand?: string };
}) {
  const supabase = await createClient();
  const selectedBrand = searchParams.brand;

  // 1. Busca os dados resumidos da View (filtrados se houver marca selecionada)
  let summaryQuery = supabase.from('image_audit_summary').select('*');
  if (selectedBrand) summaryQuery = summaryQuery.eq('brand', selectedBrand);
  const { data: summary } = await summaryQuery;

  // 2. Busca lista de marcas únicas para o filtro
  const { data: brandsData } = await supabase
    .from('products')
    .select('brand')
    .not('brand', 'is', null)
    .order('brand');
  const uniqueBrands = Array.from(
    new Set(brandsData?.map((b) => b.brand) || [])
  );

  // 3. Busca os erros mais recentes (filtrados por marca)
  let errorQuery = supabase
    .from('products')
    .select('id, name, brand, sync_error')
    .eq('sync_status', 'failed')
    .limit(10);
  if (selectedBrand) errorQuery = errorQuery.eq('brand', selectedBrand);
  const { data: recentErrors } = await errorQuery;

  // 4. Busca métricas de performance (economia de banda)
  let performanceQuery = supabase
    .from('products')
    .select('original_size_kb, optimized_size_kb')
    .eq('sync_status', 'synced')
    .gt('original_size_kb', 0)
    .gt('optimized_size_kb', 0);
  if (selectedBrand)
    performanceQuery = performanceQuery.eq('brand', selectedBrand);
  const { data: performanceData } = await performanceQuery;

  const performanceTotals = performanceData?.reduce(
    (acc, curr) => ({
      original: acc.original + (curr.original_size_kb || 0),
      optimized: acc.optimized + (curr.optimized_size_kb || 0),
    }),
    { original: 0, optimized: 0 }
  ) || { original: 0, optimized: 0 };

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
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">
              Relatório de Saúde do Catálogo
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Gestão de imagens:{' '}
              <span className="font-bold">
                {selectedBrand || 'Todas as Marcas'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro por Marca */}
            <BrandFilter brands={uniqueBrands} />

            {/* Botão de Reprocessamento Inteligente */}
            <ReprocessButton disabled={totals.failed === 0} />

            <div className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-bold text-slate-400 uppercase">
              Atualizado agora
            </div>
            <Link href="/admin/clear">
              <Button variant="outline" size="sm">
                Voltar à Torre
              </Button>
            </Link>
          </div>
        </header>

        {/* Grid de Métricas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {totals.synced}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Otimizados (WebP)
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl text-amber-600">
                <Clock size={20} />
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {totals.pending}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Na Fila de Processamento
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl text-red-600">
                <AlertTriangle size={20} />
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {totals.failed}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Erros Detectados
            </p>
          </div>
        </div>

        {/* Painel de Economia de Dados */}
        <EconomyDashboard
          originalTotal={performanceTotals.original}
          optimizedTotal={performanceTotals.optimized}
        />

        {/* Tabela de Diagnóstico de Erros */}
        {recentErrors && recentErrors.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/30 overflow-hidden">
            <div className="p-6 border-b border-red-50 dark:border-red-900/20 bg-red-50/30 dark:bg-red-950/20">
              <h2 className="font-bold text-red-800 dark:text-red-400">
                Top Erros para Correção
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="px-6 py-4">Marca</th>
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4">Mensagem de Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentErrors.map((err) => (
                    <tr key={err.id}>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                        {err.brand}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {err.name}
                      </td>
                      <td className="px-6 py-4 text-red-500 font-medium">
                        {err.sync_error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estado vazio quando não há erros */}
        {(!recentErrors || recentErrors.length === 0) && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 p-12 text-center">
            <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Catálogo 100% Saudável
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Nenhum erro detectado no momento. Todas as imagens estão
              otimizadas ou em processamento normal.
            </p>
          </div>
        )}

        {/* Detalhamento por Marca */}
        {summary && summary.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                Detalhamento por Marca
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="px-6 py-4">Marca</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Total Produtos</th>
                    <th className="px-6 py-4">Internalizados</th>
                    <th className="px-6 py-4">Erros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                        {row.brand || 'Sem Marca'}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const status = row.sync_status;
                          const label =
                            status === 'synced'
                              ? 'Sincronizado'
                              : status === 'pending'
                                ? 'Pendente'
                                : status === 'failed'
                                  ? 'Falha'
                                  : status;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                status === 'synced'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                  : status === 'pending'
                                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {status === 'synced' && <ShieldCheck size={12} />}
                              {status === 'pending' && <Clock size={12} />}
                              {status === 'failed' && (
                                <AlertTriangle size={12} />
                              )}
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {row.total_products}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {row.total_internalized}
                      </td>
                      <td className="px-6 py-4 text-red-500 font-medium">
                        {row.total_errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
