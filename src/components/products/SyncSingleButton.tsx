'use client';

import React, { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

export function SyncSingleButton({
  productId,
  externalUrl,
}: {
  productId: string;
  externalUrl: string;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus('idle');
    try {
      const proxyBase = (
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      ).replace(/\/$/, '');
      const proxiedUrl = `${proxyBase}/api/proxy-image?url=${encodeURIComponent(externalUrl)}`;

      const res = await fetch('/api/process-external-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, externalUrl: proxiedUrl }),
      });
      const json = await res.json();
      if (json?.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (_err) {
      setStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === 'success') {
    return (
      <button
        className="inline-flex items-center gap-2 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-sm"
        disabled
      >
        <Check className="w-4 h-4" />
        OK
      </button>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 px-3 py-1 rounded border text-sm hover:bg-gray-50"
      title="Sincronizar imagem"
    >
      {isSyncing ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : status === 'error' ? (
        <AlertCircle className="w-4 h-4 text-red-500" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      <span className="sr-only">Sincronizar</span>
    </button>
  );
}
