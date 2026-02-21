'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function CleanupControl() {
  const supabase = createClient();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const callCleanup = async (dryRun = true) => {
    setRunning(true);
    setResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = `/api/admin/cleanup-storage${dryRun ? '?dryRun=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ error: (e as any).message || String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button
          onClick={() => callCleanup(true)}
          disabled={running}
          className="px-4 py-2 bg-white border rounded"
        >
          Executar Dry-Run
        </button>
        <button
          onClick={() => callCleanup(false)}
          disabled={running}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Remover Orfãos (Produção)
        </button>
      </div>
      <div className="mt-3 text-sm text-gray-700">
        {running && <div>Executando...</div>}
        {result && (
          <pre className="bg-gray-50 p-3 rounded text-xs mt-2">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
