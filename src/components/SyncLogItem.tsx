'use client';

import React, { useState } from 'react';
import { ChevronRight, Search, History as HistoryIcon } from 'lucide-react';
import { toast } from 'sonner';

interface SyncLog {
  id: string;
  created_at: string;
  filename?: string;
  total_processed?: number;
  updated_count?: number;
  mismatch_count?: number;
  mismatch_list?: any[];
  target_column?: string;
  rollback_data?: any[];
  rolled_back?: boolean;
}

export default function SyncLogItem({ log }: { log: SyncLog }) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rolledBack, setRolledBack] = useState<boolean>(!!log.rolled_back);

  return (
    <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
      <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="p-4 rounded-2xl shadow-sm text-gray-100 bg-gray-50">
            <HistoryIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {new Date(log.created_at).toLocaleString('pt-BR')}
              </span>
              {log.mismatch_count && log.mismatch_count > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase">
                  Divergência
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">
              {log.filename || 'Operação'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
              Arquivo: {log.filename}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 border-l border-gray-100 pl-8">
          <div>
            <p className="text-[9px] font-black uppercase text-gray-400">
              Linhas
            </p>
            <p className="text-lg font-black text-slate-700">
              {log.total_processed || 0}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-gray-400">
              Sucesso
            </p>
            <p className="text-lg font-black text-emerald-500">
              {log.updated_count || 0}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-gray-400">
              Falhas
            </p>
            <p
              className={`text-lg font-black ${log.mismatch_count && log.mismatch_count > 0 ? 'text-red-500' : 'text-slate-200'}`}
            >
              {log.mismatch_count || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          {log.rollback_data && log.rollback_data.length > 0 && (
            <div className="mr-4">
              {rolledBack ? (
                <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">
                  Desfeito
                </span>
              ) : (
                <button
                  disabled={processing}
                  onClick={async () => {
                    if (!confirm('Deseja desfazer esta operação?')) return;
                    try {
                      setProcessing(true);
                      const p = fetch('/api/admin/rollback-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ logId: log.id }),
                      }).then((r) => r.json());
                      toast.promise(p, {
                        loading: 'Desfazendo operação...',
                        success: 'Operação desfeita com sucesso',
                        error: 'Falha ao desfazer',
                      });
                      const res = await p;
                      if (res?.success) {
                        setRolledBack(true);
                      }
                    } catch (e: any) {
                      console.error(e);
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs"
                >
                  Desfazer
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => setOpen((s) => !s)}
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-2"
            aria-expanded={open}
          >
            {open ? 'Fechar' : 'Detalhes'}{' '}
            <ChevronRight
              size={14}
              className={`${open ? 'rotate-90' : ''} transition-transform`}
            />
          </button>
        </div>
      </div>

      {open && log.mismatch_count && log.mismatch_count > 0 && (
        <div className="bg-slate-50 border-t border-gray-100 p-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-3">
            <Search size={14} /> Referências não encontradas no sistema
          </div>
          <div className="flex flex-wrap gap-2">
            {log.mismatch_list?.slice(0, 50).map((m: any, idx: number) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
              >
                {m.key || m}
              </div>
            ))}
            {log.mismatch_count > 50 && (
              <span className="text-xs text-slate-400 font-bold self-center ml-2">
                + {log.mismatch_count - 50} itens
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
