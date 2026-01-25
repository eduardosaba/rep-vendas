'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cloud, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SyncJob {
  id: string;
  user_id?: string;
  status?: string;
  total_count?: number;
  completed_count?: number;
  updated_at?: string;
}

export default function SyncStatusCard({
  syncData,
}: {
  syncData?: SyncJob | null;
}) {
  const [job, setJob] = useState<SyncJob | null>(syncData || null);
  const [errors, setErrors] = useState<any[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function fetchLatestJobForUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted || !user) return;

        const { data: lastJob } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mounted && lastJob) setJob(lastJob as SyncJob);
      } catch (e) {
        // ignore
      }
    }

    async function fetchStatus() {
      try {
        if (!job?.id) return;

        const { data: freshJob } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('id', job.id)
          .maybeSingle();

        if (mounted && freshJob) setJob(freshJob as SyncJob);

        const { data: failed } = await supabase
          .from('sync_job_items')
          .select('product_id,status,error_text,created_at')
          .eq('job_id', job.id)
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(5);

        if (mounted) setErrors(failed || []);
      } catch (e) {
        console.error('Failed to load sync status', e);
      }
    }

    // If no job provided, try to load the latest one for this user and
    // poll periodically until a job appears (so UI sees newly created jobs).
    if (!job?.id) {
      fetchLatestJobForUser();
      // também calcula quantos produtos parecem não estar internalizados
      (async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          const { data: prods } = await supabase
            .from('products')
            .select('id, image_path, image_url, external_image_url, images')
            .eq('user_id', user.id);
          if (!prods) {
            setPendingCount(0);
            return;
          }
          const count = (prods as any[])
            .map((p) => {
              const imagesArray = Array.isArray(p.images) ? p.images : [];
              const imagesContainStorage = imagesArray.some((it: any) => {
                const url = typeof it === 'string' ? it : it?.url || '';
                return (
                  typeof url === 'string' && url.includes('supabase.co/storage')
                );
              });

              const hasStorageImage = Boolean(
                p.image_path ||
                (p.image_url &&
                  String(p.image_url).includes('supabase.co/storage')) ||
                (p.external_image_url &&
                  String(p.external_image_url).includes(
                    'supabase.co/storage'
                  )) ||
                imagesContainStorage
              );

              const hasExternal = Boolean(
                p.external_image_url || p.image_url || imagesArray.length > 0
              );

              return hasExternal && !hasStorageImage;
            })
            .filter(Boolean).length;
          setPendingCount(count);
        } catch (e) {
          // ignore
        }
      })();
      let pollInterval = setInterval(() => {
        fetchLatestJobForUser();
      }, 3000);

      return () => {
        mounted = false;
        clearInterval(pollInterval);
      };
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    // start polling while processing
    if (job?.status === 'processing') {
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    } else if (job?.id) {
      // fetch once to ensure we have latest
      fetchStatus();
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
    // we intentionally include only job.id and job.status to control polling
  }, [job?.id, job?.status]);

  // keep job state in sync when prop changes
  useEffect(() => {
    if (syncData) setJob(syncData as SyncJob);
  }, [syncData]);

  const isRunning = job?.status === 'processing';
  let percent = 100;
  if (isRunning) {
    const total = Number(job?.total_count || 0);
    const completed = Number(job?.completed_count || 0);
    percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (!isFinite(percent) || Number.isNaN(percent)) percent = 0;
    percent = Math.max(0, Math.min(100, percent));
  }

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

      {!job ? (
        <div className="text-sm text-gray-500">
          Nenhum trabalho em andamento.
          {pendingCount !== null && (
            <div className="mt-2 text-xs text-gray-600">
              Produtos não otimizados:{' '}
              <b className="text-indigo-600">{pendingCount}</b>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="text-xs font-bold text-primary underline"
            >
              {showRaw ? 'Ocultar dados' : 'Mostrar dados de debug'}
            </button>
            {pendingCount !== null && pendingCount > 0 && (
              <Link
                href="/dashboard/manage-external-images"
                className="text-xs font-semibold px-3 py-1 bg-indigo-600 text-white rounded hover:opacity-90 transition"
              >
                Ver pendentes
              </Link>
            )}
            {showRaw && (
              <pre className="mt-2 max-h-40 overflow-auto text-[11px] bg-gray-50 p-2 rounded">
                {JSON.stringify(job, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ) : isRunning ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span>{percent}% concluído</span>
            <span>
              {job.completed_count}/{job.total_count}
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
