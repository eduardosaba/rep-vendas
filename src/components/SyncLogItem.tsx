'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  Search,
  History as HistoryIcon,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
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
  const isImageSync = log.target_column === 'image_url';
  const Icon = isImageSync ? ImageIcon : HistoryIcon;

  // Helper para extrair a primeira URL válida de uma string ou array
  const resolveThumbnail = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') return val.split(';')[0].trim();
    if (Array.isArray(val)) {
      const first = val[0];
      return typeof first === 'object' ? first.url : first;
    }
    return val?.url || null;
  };

  return (
    <div
      className={`bg-white rounded-[2rem] border transition-all overflow-hidden ${open ? 'shadow-xl ring-1 ring-slate-100' : 'shadow-sm hover:shadow-md border-gray-200'}`}
    >
      <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div
            className={`p-4 rounded-2xl shadow-sm ${isImageSync ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-50 text-gray-400'}`}
          >
            <Icon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {new Date(log.created_at).toLocaleString('pt-BR')}
              </span>
              {isImageSync && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-tighter">
                  Mídias
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">
              {log.filename || 'Operação Manual'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">
              Coluna Alvo:{' '}
              <span className="text-slate-600">{log.target_column}</span>
            </p>
          </div>
        </div>

        {/* STATS PANEL */}
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

        <div className="flex items-center gap-4">
          {log.rollback_data && log.rollback_data.length > 0 && (
            <div>
              {rolledBack ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase">
                  <CheckCircle2 size={12} /> Desfeito
                </div>
              ) : (
                <button
                  disabled={processing}
                  onClick={async () => {
                    if (
                      !confirm(
                        'Deseja restaurar os valores anteriores a esta sincronização?'
                      )
                    )
                      return;
                    try {
                      setProcessing(true);
                      const p = fetch('/api/admin/rollback-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ logId: log.id }),
                      }).then((r) => r.json());

                      toast.promise(p, {
                        loading: 'Restaurando backup...',
                        success: 'Operação revertida!',
                        error: 'Erro ao reverter.',
                      });

                      const res = await p;
                      if (res?.success) setRolledBack(true);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase hover:bg-red-100 transition-colors"
                >
                  Rollback
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setOpen((s) => !s)}
            className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-primary transition-all"
          >
            <ChevronRight
              size={20}
              className={`${open ? 'rotate-90' : ''} transition-transform`}
            />
          </button>
        </div>
      </div>

      {/* DETALHES EXPANDIDOS */}
      {open && isImageSync && log.rollback_data && (
        <div className="bg-slate-50 border-t border-gray-100 p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] flex items-center gap-2">
              <ImageIcon size={14} /> Amostra das Mídias Processadas
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-3">
              {log.rollback_data.slice(0, 20).map((item, idx) => {
                const thumb = resolveThumbnail(item.old_value);
                return (
                  <div
                    key={idx}
                    className="aspect-square bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm group relative"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
              {log.rollback_data.length > 20 && (
                <div className="aspect-square bg-slate-200 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-500">
                  +{log.rollback_data.length - 20}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIVERGÊNCIAS (NOT FOUND) */}
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
