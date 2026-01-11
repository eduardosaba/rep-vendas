'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SyncStatusCard({ syncData }: { syncData: any }) {
  const isRunning = syncData?.status === 'processing';
  const percent = isRunning
    ? Math.round((syncData.completed_count / syncData.total_count) * 100)
    : 100;

  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function load() {
      if (!syncData?.id || syncData?.status !== 'processing') return;
      try {
        const { data } = await supabase
          .from('sync_job_items')
          .select('product_id,status,error_text,created_at')
          .eq('job_id', syncData.id)
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(5);
        if (mounted) setErrors(data || []);
      } catch (e) {
        console.error('Failed to load sync errors', e);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [syncData?.id]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
          <Cloud size={24} />
        </div>
        {isRunning && (
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase tracking-wider animate-pulse">
            Processando
          </span>
        )}
      </div>

      <h3 className="font-bold text-gray-900 dark:text-white mb-1">
        Imagens do Catálogo
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Status da internalização via URL
      </p>

      {isRunning ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span>{percent}% concluído</span>
            <span>
              {syncData.completed_count}/{syncData.total_count}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
          <ImageIcon size={16} />
          Imagens Sincronizadas
        </div>
      )}

      {errors && errors.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold mb-2">Erros recentes</p>
          <ul className="text-xs space-y-1">
            {errors.map((e: any) => (
              <li
                key={e.created_at + e.product_id}
                className="text-xxs truncate"
              >
                <span className="font-medium">{e.product_id || '—'}</span>:{' '}
                {e.error_text || 'Erro desconhecido'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
