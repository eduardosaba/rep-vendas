'use client';

import React, { useEffect, useState } from 'react';
import { getJobDetailsAction } from '@/modules/product-update-engine/application/actions';
import { X, FileText, ArrowRight, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';

interface JobItemDiffModalProps {
  jobId: string | null;
  onClose: () => void;
  onRollbackSuccess?: () => void;
}

export function JobItemDiffModal({ jobId, onClose }: JobItemDiffModalProps) {
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'rolled_back' | 'conflict'>('all');

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    getJobDetailsAction(jobId).then((res) => {
      setLoading(false);
      if (res.success) {
        setJob(res.job);
        setItems(res.items || []);
      } else {
        setError(res.error || 'Erro ao carregar detalhes.');
      }
    });
  }, [jobId]);

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Auditoria de Histórico — {job?.file_name || 'Carregando...'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Job ID: {jobId} • Aba: {job?.sheet_name || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Buscando auditoria de alterações...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          ) : (
            <>
              {/* Job Stats Banner */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Total Linhas</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{job?.total_rows}</div>
                </div>
                <div className="p-3 border border-emerald-200 dark:border-emerald-900 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="text-emerald-600 font-bold uppercase text-[10px]">Alterados</div>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">{job?.changed_rows}</div>
                </div>
                <div className="p-3 border border-amber-200 dark:border-amber-900 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="text-amber-600 font-bold uppercase text-[10px]">Status</div>
                  <div className="text-base font-bold text-amber-600 mt-0.5 uppercase">{job?.status}</div>
                </div>
                <div className="p-3 border border-rose-200 dark:border-rose-900 rounded-xl bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="text-rose-600 font-bold uppercase text-[10px]">Falhas</div>
                  <div className="text-base font-bold text-rose-600 mt-0.5">{job?.failed_rows}</div>
                </div>
              </div>

              {/* Items Diff List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Itens Alterados ({items.length})
                  </h4>

                  {/* Status Filter Tabs */}
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
                    {[
                      { id: 'all', label: `Todos (${items.length})` },
                      { id: 'applied', label: `Aplicados (${items.filter((i) => i.status === 'applied').length})` },
                      { id: 'rolled_back', label: `Revertidos (${items.filter((i) => i.status === 'rolled_back').length})` },
                      { id: 'conflict', label: `Conflitos (${items.filter((i) => i.status === 'conflict').length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          statusFilter === tab.id
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Nenhum registro encontrado para este filtro.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredItems.map((it) => (
                      <div
                        key={it.id}
                        className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Ref: {it.products?.reference || 'N/A'}</span>
                            <span className="text-slate-400 font-normal">• {it.products?.name || 'Produto sem nome'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Campo: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">{it.target_field}</code>
                          </div>
                        </div>

                        {/* Values Diff */}
                        <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-rose-600 line-through">{JSON.stringify(it.old_value)}</span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="text-emerald-600 font-bold">{JSON.stringify(it.new_value)}</span>
                        </div>

                        {/* Status Tag */}
                        <div className="flex items-center gap-1 font-semibold text-[11px]">
                          {it.status === 'applied' && (
                            <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Aplicado
                            </span>
                          )}
                          {it.status === 'rolled_back' && (
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <RotateCcw size={12} /> Revertido
                            </span>
                          )}
                          {it.status === 'conflict' && (
                            <span className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={12} /> Conflito
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
