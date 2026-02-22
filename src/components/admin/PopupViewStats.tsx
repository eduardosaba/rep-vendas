"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock } from 'lucide-react';

export default function PopupViewStats({ popupId }: { popupId: string | number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('popup_logs')
          .select('user_email, viewed_at, created_at')
          .eq('popup_id', String(popupId))
          .order('viewed_at', { ascending: false });
        if (!mounted) return;
        setLogs(data || []);
      } catch (e) {
        console.error('load popup logs', e);
        setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [popupId]);

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
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Falha');
      // reload logs
      const supabase = createClient();
      const { data } = await supabase
        .from('popup_logs')
        .select('user_email, viewed_at, created_at')
        .eq('popup_id', String(popupId))
        .order('viewed_at', { ascending: false });
      setLogs(data || []);
      alert('Visualizações resetadas com sucesso');
    } catch (e: any) {
      console.error('reset error', e);
      alert('Erro ao resetar: ' + (e?.message || e));
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="p-4">Carregando estatísticas...</div>;

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Relatório de Visualização</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{logs.filter(l => l.viewed_at).length} visualizações de {logs.length} envios</span>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-3 py-1 text-sm rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {resetting ? 'Resetando...' : 'Resetar Visualizações'}
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor (E-mail)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log: any, idx: number) => (
              <tr key={log.user_email || idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.user_email || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.viewed_at ? (
                    <span className="flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-1" />Visualizado</span>
                  ) : (
                    <span className="flex items-center text-gray-400"><Clock className="w-4 h-4 mr-1" />Pendente</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.viewed_at ? new Date(log.viewed_at).toLocaleString('pt-BR') : '--'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">Nenhum registro de envio ou visualização encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
