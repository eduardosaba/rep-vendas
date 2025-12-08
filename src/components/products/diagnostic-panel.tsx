'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function DiagnosticPanel() {
  const [stats, setStats] = useState<{ count: number; samples: any[] } | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/pending-external-images');
      if (!res.ok) {
        setStats({ count: 0, samples: [] });
        return;
      }
      const json = await res.json();
      const items = json.data || [];
      const samples = items.slice(0, 5).map((row: any) => ({
        id: row.id,
        name: row.name,
        external_image_url: row.external_image_url || row.image_url || null,
      }));
      setStats({ count: items.length, samples });
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
      setStats({ count: 0, samples: [] });
    }
  };

  const getAllPending = async () => {
    const res = await fetch('/api/pending-external-images');
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  };

  const syncOne = async (id: string, externalUrl: string) => {
    const res = await fetch('/api/process-external-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id, externalUrl }),
    });
    if (!res.ok) throw new Error('sync failed');
    return res.json();
  };

  const handleSyncAll = async () => {
    if (!stats || stats.count === 0) return;

    setIsSyncing(true);

    const allPending = await getAllPending();
    const total = allPending.length;
    if (total === 0) {
      setIsSyncing(false);
      return;
    }

    let completed = 0;
    let successCount = 0;
    const failed: Array<{ id: string; reason: string }> = [];

    const attemptSync = async (product: any) => {
      const url = product.external_image_url || product.image_url;
      const maxAttempts = 3;
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt++;
        try {
          await syncOne(product.id, url);
          successCount++;
          return;
        } catch (err: any) {
          const waitMs = 200 * Math.pow(2, attempt - 1);
          console.warn(
            `[diagnostic] sync attempt ${attempt} failed for ${product.id}`,
            err
          );
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, waitMs));
          } else {
            failed.push({ id: product.id, reason: String(err) });
            return;
          }
        }
      }
    };

    const concurrency = 5;
    let idx = 0;

    const runners = new Array(concurrency).fill(0).map(async () => {
      while (true) {
        const i = idx;
        idx += 1;
        if (i >= allPending.length) return;
        const product = allPending[i];
        try {
          await attemptSync(product);
        } catch (e) {
          console.error('[diagnostic] unexpected error in attemptSync', e);
          failed.push({ id: product.id, reason: String(e) });
        } finally {
          completed += 1;
          setProgress(Math.round((completed / total) * 100));
        }
      }
    });

    await Promise.all(runners);

    if (failed.length > 0) {
      toast.error(`Sincronização concluída com ${failed.length} falhas.`);
      console.warn('failed items', failed.slice(0, 10));
    } else {
      toast.success(
        `Sincronização concluída: ${successCount} imagens processadas.`
      );
    }

    setIsSyncing(false);
    setProgress(0);
    loadStats();
  };

  if (!stats || stats.count === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">
              Atenção: Imagens Externas Detectadas
            </h3>
          </div>

          <p className="text-sm text-amber-700 max-w-2xl">
            Existem <strong>{stats.count} produtos</strong> usando imagens via
            URL externa. Para garantir que elas apareçam no gerador de PDF e
            carreguem mais rápido, é necessário internalizá-las.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-800">
              Exemplos:
            </span>
            <div className="flex -space-x-2">
              {stats.samples.map((sample) => (
                <div
                  key={sample.id}
                  className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-gray-200"
                  title={sample.name}
                >
                  <img
                    src={sample.external_image_url}
                    alt={sample.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        'none';
                    }}
                  />
                </div>
              ))}
              {stats.count > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-200 text-[10px] font-bold text-amber-800">
                  +{stats.count - 5}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-[200px] flex-shrink-0">
          {isSyncing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-amber-800">
                <span>Processando...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded bg-amber-200">
                <div
                  className="h-full rounded bg-amber-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-amber-600">
                Não feche esta página.
              </p>
            </div>
          ) : (
            <button
              onClick={handleSyncAll}
              className="w-full inline-flex items-center justify-center gap-2 rounded px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Internalizar {stats.count} Imagens
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiagnosticPanel;
