'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export default function FeatureToggle({ productId, initial }: { productId: string; initial: boolean; }) {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<boolean>(!!initial);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/feature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_destaque: !value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao atualizar destaque');
      setValue(!value);
      toast.success(!value ? 'Adicionado aos destaques' : 'Removido dos destaques');
    } catch (err: any) {
      console.error('toggle feature error', err);
      toast.error(err?.message || 'Erro ao atualizar destaque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={value ? 'Remover dos destaques' : 'Adicionar aos destaques'}
      className={`p-2 rounded-xl transition-all inline-flex items-center justify-center ${value ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
    >
      <Star size={18} fill={value ? 'currentColor' : 'none'} />
    </button>
  );
}
