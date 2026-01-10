'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function BulkImageSync() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    checkPending();
  }, []);

  const checkPending = async () => {
    try {
      const res = await fetch('/api/pending-external-images');
      const json = await res.json();
      setPendingCount((json?.data || []).length);
    } catch (_err) {
      // ignore
    }
  };

  const handleBulkSync = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/pending-external-images');
      const json = await res.json();
      const list = json?.data || [];
      setTotal(list.length);
      setProgress(0);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < list.length; i++) {
        const product = list[i];
        try {
          // Use internal proxy to fetch problematic hosts
          const proxyBase = (
            process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          ).replace(/\/$/, '');
          const proxiedUrl = `${proxyBase}/api/proxy-image?url=${encodeURIComponent(product.external_image_url)}`;

          const r = await fetch('/api/process-external-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              externalUrl: proxiedUrl,
            }),
          });
          const jr = await r.json();
          if (jr?.success) successCount++;
          else errorCount++;
        } catch (_err) {
          errorCount++;
        }

        setProgress(i + 1);
      }

      // re-check pending
      await checkPending();

      // Notificação via Sonner
      if (errorCount === 0) {
        toast.success('Sincronização concluída', {
          description: `${successCount} imagem${successCount !== 1 ? 'ns' : ''} sincronizada${successCount !== 1 ? 's' : ''} com sucesso.`,
        });
      } else {
        toast.warning('Sincronização parcial', {
          description: `${successCount} imagem${successCount !== 1 ? 'ns' : ''} sincronizada${successCount !== 1 ? 's' : ''}, ${errorCount} erro${errorCount !== 1 ? 's' : ''} encontrado${errorCount !== 1 ? 's' : ''}.`,
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex-1">
        <div className="font-semibold text-amber-900">
          Imagens Externas Detectadas1
        </div>
        <div className="text-sm text-amber-700">
          Existem <strong>{pendingCount}</strong> produtos usando imagens
          externas. Sincronize-as para garantir que apareçam no PDF.
        </div>
      </div>

      <div className="w-full sm:w-auto min-w-[200px]">
        {processing ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-amber-800">
              <span>Processando...</span>
              <span>
                {progress} / {total}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div
                style={{
                  width: `${total === 0 ? 0 : (progress / total) * 100}%`,
                }}
                className="h-2 bg-amber-600"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleBulkSync}
            className="px-4 py-2 rounded bg-amber-600 text-white w-full"
          >
            Sincronizar Todas Agora
          </button>
        )}
      </div>
    </div>
  );
}
