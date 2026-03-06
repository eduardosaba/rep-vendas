"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Definindo a interface para evitar erros de 'implicit any'
interface PopupLog {
  user_email: string | null;
  viewed_at: string | null;
  created_at: string;
}

export default function PopupViewStats({ popupId }: { popupId: string | number }) {
  const [logs, setLogs] = useState<PopupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const supabase = createClient();

  // Memoização da busca para evitar loops e facilitar o refresh
  const fetchLogs = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('popup_logs')
        .select('user_email, viewed_at, created_at')
        .eq('popup_id', String(popupId))
        .order('viewed_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error('load popup logs', e);
    } finally {
      setLoading(false);
    }
  }, [popupId, supabase]);

  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  const handleReset = async () => {
    if (!confirm('Resetar visualizações para este popup? Isso fará com que todos recebam novamente.')) return;
    
    try {
      setResetting(true);
      const res = await fetch('/api/popup/reset-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popupId: String(popupId) }),
      });
      
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Falha ao resetar');
      
      await fetchLogs(); // Recarrega a lista
      toast.success('Visualizações resetadas com sucesso');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao resetar');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center text-slate-500 animate-pulse">
      Carregando estatísticas...
    </div>
  );

  const viewsCount = logs.filter(l => l.viewed_at).length;

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Rastreio de Engajamento
          </h3>
          <p className="text-xs text-slate-500">Acompanhe quem já interagiu com esta atualização</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="text-right hidden sm:block">
            <span className="block text-xl font-black text-primary">{viewsCount}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Visualizações</span>
          </div>
          
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 transition-all disabled:opacity-50"
          >
            <RotateCcw size={14} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Limpando...' : 'Resetar'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Representante</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Interação</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log, idx) => (
                <tr key={`${log.user_email}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-200">
                    {log.user_email || 'Usuário Sem E-mail'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.viewed_at ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Visto
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Clock className="w-3 h-3 mr-1" /> Recebido
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                    {log.viewed_at ? new Date(log.viewed_at).toLocaleString('pt-BR') : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-400">Aguardando as primeiras interações dos representantes...</p>
          </div>
        )}
      </div>
    </div>
  );
}