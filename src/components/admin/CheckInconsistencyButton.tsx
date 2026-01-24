'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function CheckInconsistencyButton({
  brand,
  status,
}: {
  brand?: string | null;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const handle = async () => {
    if (!brand) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/orphan-count?brand=${encodeURIComponent(brand)}&status=${encodeURIComponent(status)}`
      );
      const data = await res.json();
      if (res.ok) {
        setCount(data.orphan || 0);
        toast.success(`Inconsistências: ${data.orphan}`);
      } else {
        toast.error(data.error || 'Erro');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao verificar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading || !brand}
      className="px-3 py-1 ml-2 text-xs bg-white border rounded"
    >
      {loading
        ? 'Verificando...'
        : count === null
          ? 'Verificar'
          : `Orfãos: ${count}`}
    </button>
  );
}
