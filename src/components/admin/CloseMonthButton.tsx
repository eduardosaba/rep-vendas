'use client'

import React, { useState } from 'react';
import { toast } from 'sonner';

export default function CloseMonthButton({ start, end }: { start?: string; end?: string }) {
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commissions/close-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Erro ao fechar mês');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comissoes_${start || 'period'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Relatório gerado e baixado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClose} disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded">
      {loading ? 'Gerando...' : 'Fechar Mês (Gerar Relatório)'}
    </button>
  );
}
