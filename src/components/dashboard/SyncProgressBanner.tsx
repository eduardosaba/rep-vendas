'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function SyncProgressBanner() {
  const [job, setJob] = useState<any>(null);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Busca status inicial e assina atualizações em tempo real
    const fetchStatus = async () => {
      // Buscar o job mais recente (independente do status). Isso evita que
      // o banner falhe em transições rápidas entre queued -> processing.
      const { data } = await supabase
        .from('sync_jobs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setJob(data || null);
    };

    const fetchRecentErrors = async (jobId: string | null) => {
      if (!jobId) return setRecentErrors([]);
      const { data } = await supabase
        .from('sync_job_items')
        .select('product_id, status, error_text, created_at')
        .eq('job_id', jobId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentErrors(data || []);
    };

    fetchStatus();
    // also try to fetch errors for the running job
    (async () => {
      try {
        const { data } = await supabase
          .from('sync_jobs')
          .select('id')
          .eq('status', 'processing')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        await fetchRecentErrors(data?.id || null);
      } catch (err) {
        // ignore - leave recentErrors empty on failure
        console.error('Failed to fetch recent sync job id', err);
        await fetchRecentErrors(null);
      }
    })();

    const channel = supabase
      .channel('sync_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sync_jobs' },
        async (payload) => {
          // Atualiza o job exibido com a nova linha
          setJob(payload.new || null);
          // refresh recent errors when job updates
          await fetchRecentErrors(payload.new?.id || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Determinar se o job é relevante para exibir o banner:
  // - status === 'processing' ou 'queued'
  // - ou foi atualizado nos últimos 10 minutos (evita desaparecer em transições)
  const isRecent = (dateStr?: string | null) => {
    if (!dateStr) return false;
    try {
      const then = new Date(dateStr).getTime();
      return Date.now() - then < 1000 * 60 * 10; // 10 minutes
    } catch (e) {
      return false;
    }
  };

  const isActiveJob =
    !!job &&
    (job.status === 'processing' ||
      job.status === 'queued' ||
      isRecent(job.updated_at));
  if (!isActiveJob) return null;

  const percent = job.total_count
    ? Math.round((job.completed_count / job.total_count) * 100)
    : 0;

  return (
    <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl mb-6 shadow-lg shadow-indigo-200 dark:shadow-none animate-in slide-in-from-top duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin" size={20} />
          <div>
            <p className="font-bold text-sm">Sincronização em andamento...</p>
            <p className="text-xs opacity-80">
              {job.completed_count} de {job.total_count} imagens processadas
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md bg-white/20 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <span className="font-black text-lg">{percent}%</span>
      </div>

      {recentErrors.length > 0 && (
        <div className="mt-3 bg-white/10 rounded-lg p-3">
          <p className="text-xs font-bold mb-2">Últimos erros</p>
          <ul className="text-xs space-y-2">
            {recentErrors.map((e) => (
              <li
                key={e.created_at + e.product_id}
                className="flex items-start gap-3"
              >
                <div className="w-3 h-3 bg-red-400 rounded-full mt-1" />
                <div>
                  <div className="font-medium">
                    Produto: {e.product_id || '—'}
                  </div>
                  <div className="opacity-80">
                    {e.error_text || 'Erro desconhecido'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
