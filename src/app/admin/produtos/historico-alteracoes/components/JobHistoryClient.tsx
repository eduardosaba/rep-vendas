'use client';

import React, { useEffect, useState } from 'react';
import { getJobsHistoryAction, rollbackJobAction } from '@/modules/product-update-engine/application/actions';
import { JobItemDiffModal } from './JobItemDiffModal';
import { History, RotateCcw, Eye, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function JobHistoryClient() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [rollbackResult, setRollbackResult] = useState<{ jobId: string; msg: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    const res = await getJobsHistoryAction();
    setLoading(false);
    if (res.success) {
      setJobs(res.jobs || []);
    } else {
      setError(res.error || 'Erro ao carregar histórico.');
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRollback = async (jobId: string, fileName: string) => {
    if (!confirm(`Tem certeza que deseja reverter as alterações do arquivo "${fileName}"? Isso irá restaurar os valores originais auditados.`)) {
      return;
    }

    setRollingBackId(jobId);
    setRollbackResult(null);

    const res = await rollbackJobAction(jobId);
    setRollingBackId(null);

    if (res.success) {
      if (res.conflicts > 0) {
        setRollbackResult({
          jobId,
          type: 'warning',
          msg: `Rollback parcialmente concluído: ${res.rolledBack} itens revertidos, ${res.conflicts} itens em conflito (dado alterado por terceiros).`,
        });
      } else {
        setRollbackResult({
          jobId,
          type: 'success',
          msg: `Rollback concluído com sucesso! ${res.rolledBack} itens restaurados para o valor original.`,
        });
      }
      fetchJobs();
    } else {
      setRollbackResult({
        jobId,
        type: 'error',
        msg: res.errors.join(' | ') || 'Falha ao executar rollback.',
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <Link href="/admin/produtos/atualizacao-inteligente" className="flex items-center gap-1 hover:underline">
              <ArrowLeft size={12} /> Motor Inteligente
            </Link>
            <span>• Auditoria</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="text-indigo-600" size={28} /> Central de Histórico & Auditoria
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consulte o histórico de importações executadas, inspecione alterações linha a linha e execute rollback auditado.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar Lista
        </button>
      </div>

      {/* Alert Result */}
      {rollbackResult && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            rollbackResult.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : rollbackResult.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {rollbackResult.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{rollbackResult.msg}</span>
          </div>
          <button onClick={() => setRollbackResult(null)} className="underline text-[11px]">
            Fechar
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <RefreshCw size={32} className="mx-auto animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Carregando histórico de jobs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm font-semibold">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <FileSpreadsheet size={40} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum job de atualização executado até o momento.</p>
            <p className="text-xs text-slate-400">As atualizações executadas pelo Motor Inteligente aparecerão aqui com suporte a audit diff.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 uppercase font-bold text-[10px]">
                  <th className="p-4">Arquivo / Data</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Total Linhas</th>
                  <th className="p-4 text-center">Alterados</th>
                  <th className="p-4 text-center">Falhas</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{j.file_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {new Date(j.created_at).toLocaleString('pt-BR')} • Aba: {j.sheet_name || 'N/A'}
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
                          j.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : j.status === 'rolled_back'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : j.status === 'partially_rolled_back'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {j.status === 'completed' && <CheckCircle2 size={12} />}
                        {j.status.includes('rolled_back') && <RotateCcw size={12} />}
                        {j.status}
                      </span>
                    </td>

                    <td className="p-4 text-center font-bold">{j.total_rows}</td>
                    <td className="p-4 text-center text-emerald-600 font-bold">{j.changed_rows}</td>
                    <td className="p-4 text-center text-rose-600 font-bold">{j.failed_rows}</td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedJobId(j.id)}
                          className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded-lg transition-colors text-[11px]"
                        >
                          <Eye size={14} /> Inspecionar Diff
                        </button>

                        {j.status === 'completed' && (
                          <button
                            onClick={() => handleRollback(j.id, j.file_name)}
                            disabled={rollingBackId === j.id}
                            className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-semibold px-3 py-1.5 rounded-lg transition-colors text-[11px] disabled:opacity-50"
                          >
                            <RotateCcw size={14} className={rollingBackId === j.id ? 'animate-spin' : ''} />
                            {rollingBackId === j.id ? 'Revertendo...' : 'Rollback'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Diff */}
      <JobItemDiffModal jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
}
